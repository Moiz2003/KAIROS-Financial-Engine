"""
Debug API Routes for Web Proving Grounds dashboard.

Panels supported:
- Panel A: Live NewsArticle feed
- Panel B: AI Sentiment validation output
- Panel C: Reality Check output (TA vs AI + approval)
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, Query

from adapters.news_adapter import get_news_provider
from core.di_container import get_container
from core.logging_config import get_logger
from domain.entities import MarketAnalyzer
from domain.models import AnalysisResult, TrendType, TradeSignal, TradeAction
from domain.services.signal_validator import SignalValidator
from services.sentiment_engine import AISentimentService

logger = get_logger(__name__)
router = APIRouter(prefix="/api/debug", tags=["debug"])


def _build_ta_signal(symbol: str, interval: str = "4h", limit: int = 200):
    """Build preliminary TA signal from math engine only."""
    container = get_container()
    market_provider = container.get_binance_adapter()
    signal_generator = container.get_signal_generator()
    analyzer = MarketAnalyzer()

    klines = market_provider.get_klines(symbol=symbol, interval=interval, limit=limit)
    current_price = float(market_provider.get_current_price(symbol))
    prices = [float(kline[4]) for kline in klines]

    analysis = AnalysisResult(
        symbol=symbol,
        price=current_price,
        rsi=analyzer.calculate_rsi(prices, period=14),
        ema_200=analyzer.calculate_ema(prices, period=200),
        trend=TrendType(analyzer.detect_trend(current_price, analyzer.calculate_ema(prices, period=200))),
        timestamp=datetime.utcnow(),
    )

    return signal_generator.generate_signal(analysis)


@router.get("/news/{symbol}")
async def get_news_feed(symbol: str, limit: int = Query(10, ge=1, le=30)):
    """Panel A: Latest headlines for symbol."""
    try:
        adapter = get_news_provider()
        articles = adapter.get_latest_headlines(symbol=symbol, limit=limit)
        return {
            "symbol": symbol.upper(),
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
    except Exception as e:
        logger.error(f"Debug news feed failed for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch news feed: {str(e)}")


@router.get("/sentiment/{symbol}")
async def get_sentiment(symbol: str, limit: int = Query(10, ge=1, le=30)):
    """Panel B: AI sentiment output from FR17/FR19/FR20 service."""
    try:
        adapter = get_news_provider()
        headlines = adapter.get_latest_headlines(symbol=symbol, limit=limit)

        sentiment_service = AISentimentService()
        result = sentiment_service.analyze_headlines(headlines)

        return {
            "symbol": symbol.upper(),
            "headlines_count": len(headlines),
            "sentiment_score": result.sentiment_score,
            "summary": result.summary,
        }
    except Exception as e:
        logger.error(f"Debug sentiment failed for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sentiment: {str(e)}")


@router.get("/reality-check/{symbol}")
async def get_reality_check(
    symbol: str,
    interval: str = Query("4h"),
    limit: int = Query(200, ge=50, le=1000),
    news_limit: int = Query(10, ge=1, le=30),
):
    """
    Panel C: Full Reality Check output (TA signal vs AI sentiment + approval).
    Isolated from Binance execution module.
    """
    try:
        symbol_upper = symbol.upper()

        # 1) Preliminary TA signal
        ta_signal = _build_ta_signal(symbol=symbol_upper, interval=interval, limit=limit)

        # 2) AI sentiment from news headlines
        adapter = get_news_provider()
        headlines = adapter.get_latest_headlines(symbol=symbol_upper, limit=news_limit)
        sentiment_service = AISentimentService()
        ai_result = sentiment_service.analyze_headlines(headlines)

        # 3) Reality Check validation
        validator = SignalValidator()
        validation = validator.reality_check(
            ta_signal=ta_signal,
            ai_sentiment_score=ai_result.sentiment_score,
            ai_summary=ai_result.summary,
        )

        return {
            "symbol": symbol_upper,
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
    except Exception as e:
        logger.error(f"Debug reality-check failed for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed reality-check pipeline: {str(e)}")


@router.get("/pipeline")
async def get_debug_pipeline(
    symbol: str = Query(..., min_length=2, max_length=20),
    interval: str = Query("4h"),
    limit: int = Query(200, ge=50, le=1000),
    news_limit: int = Query(10, ge=1, le=30),
):
    """
    Unified endpoint for web debug dashboard.

    Returns all panel data in one response:
    - Panel A: news feed
    - Panel B: AI sentiment result
    - Panel C: Reality Check result
    """
    try:
        symbol_upper = symbol.upper()

        # Panel A: News feed
        news_adapter = get_news_provider()
        headlines = news_adapter.get_latest_headlines(symbol=symbol_upper, limit=news_limit)

        # TA signal from math engine (no execution)
        try:
            ta_signal = _build_ta_signal(symbol=symbol_upper, interval=interval, limit=limit)
            ta_error = None
        except Exception as ta_exc:
            logger.warning(f"TA signal unavailable for {symbol_upper}: {ta_exc}")
            ta_error = str(ta_exc)
            ta_signal = TradeSignal(
                action=TradeAction.HOLD,
                confidence=0.5,
                reasoning="TA engine unavailable; default HOLD fallback used.",
                technical_score=0.5,
                sentiment_score=0.5,
                timestamp=datetime.utcnow(),
            )

        # Panel B: AI sentiment output
        sentiment_service = AISentimentService()
        ai_result = sentiment_service.analyze_headlines(headlines)

        # Panel C: Reality check output
        validator = SignalValidator()
        validation = validator.reality_check(
            ta_signal=ta_signal,
            ai_sentiment_score=ai_result.sentiment_score,
            ai_summary=ai_result.summary,
        )

        return {
            "symbol": symbol_upper,
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
    except Exception as e:
        logger.error(f"Debug pipeline failed for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed debug pipeline: {str(e)}")
