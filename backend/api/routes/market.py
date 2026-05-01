"""
Market data endpoints — WebSocket stream relay and system health check.

Endpoints:
  GET /api/market/analysis  — latest TA result from TAEngine buffer
  GET /api/health           — connectivity check for Binance + AI provider
  WS  /api/market/stream    — streams normalised ticker + kline events
"""

import asyncio
import os

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect

from core.binance_ws import stream_manager
from core.logging_config import get_logger
from core.rate_limiter import limiter
from core.ta_engine import ta_engine

logger = get_logger(__name__)
router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/analysis")
@limiter.limit("60/minute")
async def get_analysis(request: Request) -> dict:
    """
    Return the latest AnalysisResult produced by TAEngine.

    Returns 503 until the rolling buffer holds at least 200 closed candles
    (required for EMA-200). No database I/O — reads cached in-process state.
    """
    result = ta_engine.get_latest_analysis()
    if result is None:
        raise HTTPException(
            status_code=503,
            detail="Analysis not yet available — accumulating closed candles (need 200).",
        )

    signal = ta_engine.get_latest_signal()
    return {
        "symbol": result.symbol,
        "price": result.price,
        "rsi": result.rsi,
        "ema_200": result.ema_200,
        "trend": result.trend.value,
        "timestamp": result.timestamp.isoformat(),
        "signal": {
            "action": signal.action.value,
            "confidence": signal.confidence,
            "reasoning": signal.reasoning,
        } if signal else None,
    }


@router.get("/health", tags=["health"])
@limiter.limit("60/minute")
async def health_check(request: Request) -> dict:
    """
    System health check — verifies Binance testnet connectivity,
    AI provider key presence, and TAEngine buffer status.
    """
    from core.config import config
    from core.di_container import get_container

    results: dict = {}

    # --- Binance connectivity ---
    try:
        container = get_container()
        adapter = container.get_binance_adapter()
        price = await asyncio.to_thread(adapter.get_current_price, "BTCUSDT")
        results["binance"] = {"status": "ok", "btc_price": float(price)}
    except Exception as exc:
        results["binance"] = {"status": "error", "detail": str(exc)}

    # --- AI provider (Perplexity / DeepSeek) key presence ---
    perplexity_key = config.perplexity_api_key
    deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
    ai_key_present = bool(perplexity_key or deepseek_key)
    results["ai_provider"] = {
        "status": "ok" if ai_key_present else "unconfigured",
        "key_present": ai_key_present,
    }

    # --- TAEngine buffer ---
    latest = ta_engine.get_latest_analysis()
    results["ta_engine"] = {
        "status": "ready" if latest is not None else "warming_up",
        "last_symbol": latest.symbol if latest else None,
        "last_rsi": round(latest.rsi, 2) if latest else None,
    }

    overall = (
        "healthy"
        if results["binance"]["status"] == "ok" and ai_key_present
        else "degraded"
    )
    return {"status": overall, "components": results}


@router.websocket("/stream")
async def market_stream(ws: WebSocket) -> None:
    """
    Each browser client that connects here receives every normalised Binance
    event broadcast by BinanceStreamManager.  The route is stateless —
    BinanceStreamManager owns the client set and all fan-out logic.
    """
    await ws.accept()
    await stream_manager.add_client(ws)
    try:
        while True:
            await ws.receive_text()   # keep the connection alive; client msgs ignored
    except WebSocketDisconnect:
        pass
    finally:
        stream_manager.remove_client(ws)
        logger.debug("Market stream client disconnected")
