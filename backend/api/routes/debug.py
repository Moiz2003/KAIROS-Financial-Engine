"""
Debug API Routes for Web Proving Grounds dashboard.

Panels supported:
- Panel A: Live NewsArticle feed
- Panel B: AI Sentiment output  (FR17/FR19 — non-blocking via AIEngine)
- Panel C: Reality Check output (FR22/FR23/FR24 — TA vs AI + approval)

FR20: Every fetched article is upserted into the MongoDB `news` collection.
"""

import asyncio
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, Query

from adapters.news_adapter import get_news_provider
from core.ai_engine import ai_engine
from core.database import Database
from core.di_container import get_container
from core.logging_config import get_logger
from domain.entities import MarketAnalyzer
from domain.models import AnalysisResult, TrendType, TradeSignal, TradeAction
from domain.news import NewsArticle
from domain.services.signal_validator import SignalValidator

logger = get_logger(__name__)
router = APIRouter(prefix="/api/debug", tags=["debug"])


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _build_ta_signal(symbol: str, interval: str = "4h", limit: int = 200) -> TradeSignal:
    """
    Build a preliminary TA signal from math engine only.
    Binance REST calls are synchronous — both run concurrently in thread pool
    workers so neither blocks the event loop.
    """
    container = get_container()
    market_provider = container.get_binance_adapter()
    signal_generator = container.get_signal_generator()
    analyzer = MarketAnalyzer()

    klines, current_price_raw = await asyncio.gather(
        asyncio.to_thread(
            market_provider.get_klines,
            symbol=symbol,
            interval=interval,
            limit=limit,
        ),
        asyncio.to_thread(market_provider.get_current_price, symbol),
    )

    current_price = float(current_price_raw)
    prices = [float(kline[4]) for kline in klines]

    ema_200 = analyzer.calculate_ema(prices, period=200)
    analysis = AnalysisResult(
        symbol=symbol,
        price=current_price,
        rsi=analyzer.calculate_rsi(prices, period=14),
        ema_200=ema_200,
        trend=TrendType(analyzer.detect_trend(current_price, ema_200)),
        timestamp=datetime.utcnow(),
    )
    return signal_generator.generate_signal(analysis)


async def _persist_news(symbol: str, articles: List[NewsArticle]) -> None:
    """
    FR20: Upsert fetched articles into the shared `news` MongoDB collection.
    Uses $setOnInsert so re-fetching the same URL is a no-op.
    Runs fire-and-forget; errors are logged and swallowed.
    """
    if not articles:
        return
    try:
        col = Database.get_collection("news")
        for article in articles:
            doc = {
                "symbol": symbol,
                "title": article.title,
                "source": article.source,
                "url": article.url,
                "timestamp": article.timestamp,
            }
            await col.update_one(
                {"url": article.url},
                {"$setOnInsert": doc},
                upsert=True,
            )
        logger.debug("Persisted %d news articles for %s", len(articles), symbol)
    except Exception as exc:
        logger.warning("News persistence failed for %s: %s", symbol, exc)


# ── Panel A ────────────────────────────────────────────────────────────────────

@router.get("/news/{symbol}")
async def get_news_feed(symbol: str, limit: int = Query(10, ge=1, le=30)):
    """Panel A: Latest headlines for symbol (with MongoDB persistence)."""
    try:
        sym = symbol.upper()
        adapter = get_news_provider()
        articles = await asyncio.to_thread(adapter.get_latest_headlines, symbol=sym, limit=limit)
        asyncio.create_task(_persist_news(sym, articles))  # FR20: fire-and-forget
        return {
            "symbol": sym,
            "count": len(articles),
            "articles": [
                {
                    "title": a.title,
                    "source": a.source,
                    "timestamp": a.timestamp.isoformat(),
                    "url": a.url,
                }
                for a in articles
            ],
        }
    except Exception as exc:
        logger.error("Debug news feed failed for %s: %s", symbol, exc)
        raise HTTPException(status_code=500, detail=f"Failed to fetch news feed: {exc}")


# ── Panel B ────────────────────────────────────────────────────────────────────

@router.get("/sentiment/{symbol}")
async def get_sentiment(symbol: str, limit: int = Query(10, ge=1, le=30)):
    """
    Panel B: AI sentiment output.
    FR17: AIEngine offloads the blocking LLM call to a thread.
    FR18: 5-minute SHA-256 cache prevents redundant LLM calls.
    FR19: This endpoint is fully non-blocking.
    FR20: Articles are upserted to MongoDB.
    """
    try:
        sym = symbol.upper()
        adapter = get_news_provider()
        # News fetch is also a blocking HTTP call — run in thread.
        headlines = await asyncio.to_thread(adapter.get_latest_headlines, symbol=sym, limit=limit)
        asyncio.create_task(_persist_news(sym, headlines))  # FR20

        result = await ai_engine.analyze(headlines)  # FR17/FR18/FR19

        return {
            "symbol": sym,
            "headlines_count": len(headlines),
            "sentiment_score": result.sentiment_score,
            "summary": result.summary,
        }
    except Exception as exc:
        logger.error("Debug sentiment failed for %s: %s", symbol, exc)
        raise HTTPException(status_code=500, detail=f"Failed to fetch sentiment: {exc}")


# ── Panel C ────────────────────────────────────────────────────────────────────

@router.get("/reality-check/{symbol}")
async def get_reality_check(
    symbol: str,
    interval: str = Query("4h"),
    limit: int = Query(200, ge=50, le=1000),
    news_limit: int = Query(10, ge=1, le=30),
):
    """
    Panel C: Full Reality Check (TA signal vs AI sentiment + approval).
    FR22/FR23/FR24 rules applied by SignalValidator.reality_check().
    """
    try:
        sym = symbol.upper()

        # TA and news fetch can run concurrently.
        ta_signal, headlines = await asyncio.gather(
            _build_ta_signal(symbol=sym, interval=interval, limit=limit),
            asyncio.to_thread(
                get_news_provider().get_latest_headlines, symbol=sym, limit=news_limit
            ),
        )

        asyncio.create_task(_persist_news(sym, headlines))  # FR20
        ai_result = await ai_engine.analyze(headlines)     # FR17/FR18/FR19

        validator = SignalValidator()
        validation = validator.reality_check(
            ta_signal=ta_signal,
            ai_sentiment_score=ai_result.sentiment_score,
            ai_summary=ai_result.summary,
        )

        return {
            "symbol": sym,
            "ta_signal": {
                "action": ta_signal.action.value,
                "confidence": ta_signal.confidence,
                "reasoning": ta_signal.reasoning,
            },
            "ai_signal": {
                "sentiment_score": ai_result.sentiment_score,
                "summary": ai_result.summary,
            },
            "reality_check": {
                "status": validation.status.value,
                "approved_for_execution": validation.approved_for_execution,
                "reason": validation.reason,
                "final_signal_action": validation.output_signal.action.value,
                "final_signal_confidence": validation.output_signal.confidence,
                "final_signal_reasoning": validation.output_signal.reasoning,
            },
        }
    except Exception as exc:
        logger.error("Debug reality-check failed for %s: %s", symbol, exc)
        raise HTTPException(status_code=500, detail=f"Failed reality-check pipeline: {exc}")


# ── Unified pipeline ────────────────────────────────────────────────────────────

@router.get("/pipeline")
async def get_debug_pipeline(
    symbol: str = Query(..., min_length=2, max_length=20),
    interval: str = Query("4h"),
    limit: int = Query(200, ge=50, le=1000),
    news_limit: int = Query(10, ge=1, le=30),
):
    """
    Unified endpoint for the web debug dashboard.

    Returns all panel data in one response:
    - Panel A: news feed
    - Panel B: AI sentiment result
    - Panel C: Reality Check result
    """
    try:
        sym = symbol.upper()

        # News fetch is shared across all panels — do it once.
        headlines = await asyncio.to_thread(
            get_news_provider().get_latest_headlines, symbol=sym, limit=news_limit
        )
        asyncio.create_task(_persist_news(sym, headlines))  # FR20

        # TA signal (with graceful fallback) and AI sentiment run concurrently.
        ta_error: str | None = None

        async def _safe_ta():
            nonlocal ta_error
            try:
                return await _build_ta_signal(symbol=sym, interval=interval, limit=limit)
            except Exception as exc:
                logger.warning("TA signal unavailable for %s: %s", sym, exc)
                ta_error = str(exc)
                return TradeSignal(
                    action=TradeAction.HOLD,
                    confidence=0.5,
                    reasoning="TA engine unavailable; default HOLD fallback used.",
                    technical_score=0.5,
                    sentiment_score=0.5,
                    timestamp=datetime.utcnow(),
                )

        ta_signal, ai_result = await asyncio.gather(
            _safe_ta(),
            ai_engine.analyze(headlines),  # FR17/FR18/FR19
        )

        # Panel C: Reality Check (FR22/FR23/FR24).
        validator = SignalValidator()
        validation = validator.reality_check(
            ta_signal=ta_signal,
            ai_sentiment_score=ai_result.sentiment_score,
            ai_summary=ai_result.summary,
        )

        return {
            "symbol": sym,
            "panel_a": {
                "count": len(headlines),
                "articles": [
                    {
                        "title": a.title,
                        "source": a.source,
                        "timestamp": a.timestamp.isoformat(),
                        "url": a.url,
                    }
                    for a in headlines
                ],
            },
            "panel_b": {
                "sentiment_score": ai_result.sentiment_score,
                "summary": ai_result.summary,
            },
            "panel_c": {
                "ta_signal": {
                    "action": ta_signal.action.value,
                    "confidence": ta_signal.confidence,
                    "reasoning": ta_signal.reasoning,
                    "error": ta_error,
                },
                "ai_signal": {
                    "sentiment_score": ai_result.sentiment_score,
                    "summary": ai_result.summary,
                },
                "reality_check": {
                    "status": validation.status.value,
                    "approved_for_execution": validation.approved_for_execution,
                    "reason": validation.reason,
                    "final_signal_action": validation.output_signal.action.value,
                    "final_signal_confidence": validation.output_signal.confidence,
                },
            },
        }
    except Exception as exc:
        logger.error("Debug pipeline failed for %s: %s", symbol, exc)
        raise HTTPException(status_code=500, detail=f"Failed debug pipeline: {exc}")
