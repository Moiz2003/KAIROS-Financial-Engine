"""
Trade Routes — authenticated endpoints for trade history and execution.

FR29: GET  /api/trades/history   — paginated trade history (auth required)
FR31: POST /api/trades/execute   — full pipeline: TA → AI → Risk → Exec → Persist
FR32: POST /api/trades/execute   — returns unified decision response
"""

import asyncio
import dataclasses
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from core.rate_limiter import limiter
from pydantic import BaseModel, Field

from adapters.news_adapter import get_news_provider
from api.dependencies import get_current_user, require_trader
from core.ai_engine import ai_engine
from core.di_container import get_container
from core.exceptions import TradeExecutionException
from core.logging_config import get_logger
from core.ta_engine import ta_engine
from domain.models import (
    AnalysisResult,
    TradeAction,
    TradeSignal,
    TrendType,
)
from domain.services import SignalGenerator
from domain.services.orchestrator import RiskManager
from domain.services.portfolio_manager import portfolio_manager
from domain.services.signal_validator import SignalValidator

logger = get_logger(__name__)
router = APIRouter(prefix="/api/trades", tags=["trades"])


async def _log_event(
    user_id: str, symbol: str, action: str, message: str, status: str
) -> None:
    """Non-fatal wrapper — a log failure must never break the trade pipeline."""
    try:
        await portfolio_manager.log_trade_event(
            user_id=user_id,
            symbol=symbol,
            action=action,
            message=message,
            status=status,
        )
    except Exception as exc:
        logger.warning("Trade log write failed (non-fatal): %s", exc)


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class ExecuteTradeRequest(BaseModel):
    symbol: str = Field(..., min_length=2, max_length=20, description="e.g. BTCUSDT")
    action: str = Field(..., description="BUY or SELL")
    interval: str = Field("4h", description="Kline interval for fresh TA fetch")
    limit: int = Field(200, ge=50, le=1000, description="Candles for fresh TA fetch")
    news_limit: int = Field(10, ge=1, le=30, description="Headlines for AI sentiment")
    account_balance: float = Field(
        10_000.0, gt=0, description="Notional balance for risk gate (USDT)"
    )
    god_mode: bool = Field(False, description="Testing bypass: skip AI Risk Gate validation")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _build_ta_signal_fresh(
    symbol: str, interval: str, limit: int
) -> TradeSignal:
    """
    Build a TA signal from a fresh Binance REST fetch.
    Used as fallback when TAEngine buffer is not yet warm.
    """
    from domain.entities import MarketAnalyzer

    container = get_container()
    market_provider = container.get_binance_adapter()
    analyzer = MarketAnalyzer()
    signal_generator = SignalGenerator(confidence_threshold=0.65)

    klines, current_price_raw = await asyncio.gather(
        asyncio.to_thread(
            market_provider.get_klines,
            symbol=symbol,
            interval=interval,
            limit=limit,
        ),
        asyncio.to_thread(market_provider.get_current_price, symbol),
    )

    prices = [float(k[4]) for k in klines]
    current_price = float(current_price_raw)
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


async def _get_ta_signal(symbol: str, interval: str, limit: int) -> TradeSignal:
    """
    Prefer the warm TAEngine buffer; fall back to a fresh Binance REST fetch.
    """
    cached = ta_engine.get_latest_signal()
    if cached is not None:
        logger.debug("Using warm TAEngine signal for %s", symbol)
        return cached
    logger.info("TAEngine buffer cold — fetching fresh TA for %s", symbol)
    return await _build_ta_signal_fresh(symbol, interval, limit)


# ---------------------------------------------------------------------------
# GET /api/trades/history  (FR29)
# ---------------------------------------------------------------------------


@router.get("/history")
async def get_trade_history(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    FR29: Return the authenticated user's trade history, newest first.
    """
    user_id = current_user["sub"]
    sym = symbol.upper() if symbol else None

    try:
        history = await portfolio_manager.get_trade_history(
            user_id=user_id, symbol=sym, limit=limit
        )
        return {
            "user_id": user_id,
            "symbol": sym,
            "count": len(history),
            "trades": history,
        }
    except Exception as exc:
        logger.error("Trade history failed for %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail=f"Failed to fetch trade history: {exc}")


# ---------------------------------------------------------------------------
# GET /api/trades/logs
# ---------------------------------------------------------------------------


@router.get("/logs")
async def get_execution_logs(
    limit: int = Query(50, ge=1, le=200, description="Max log entries to return"),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Return the N most recent execution log entries for the authenticated user,
    sorted by timestamp descending.  Includes both EXECUTED and BLOCKED events.
    """
    user_id = current_user["sub"]
    try:
        logs = await portfolio_manager.get_execution_logs(user_id, limit=limit)
        return {"user_id": user_id, "count": len(logs), "logs": logs}
    except Exception as exc:
        logger.error("Execution logs fetch failed for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch execution logs: {exc}"
        )


# ---------------------------------------------------------------------------
# POST /api/trades/execute  (FR31 / FR32)
# ---------------------------------------------------------------------------


@router.post("/execute", status_code=201)
@limiter.limit("20/minute")
async def execute_trade(
    request: Request,
    body: ExecuteTradeRequest,
    current_user: dict = Depends(require_trader),
) -> dict:
    """
    FR31/FR32: Full human-in-the-loop trade execution pipeline.

    Pipeline:
    1.  Validate requested action (BUY or SELL)
    2.  Fetch TA signal (warm buffer or fresh Binance REST)
    3.  Fetch news concurrently, run AI sentiment
    4.  Reality Check: TA vs AI (SignalValidator FR22–FR24)
    5.  Risk gate: RiskManager.assess() (FR26)
    6.  Gate: final_signal.action must match requested action
    7.  Execute test order via TradeExecutor
    8.  Persist trade (FR27) + update position (FR28)
    9.  Return unified FR32 response

    Requires TRADER or ADMIN role.
    """
    sym = body.symbol.upper()
    user_id = current_user["sub"]

    # STEP 1: Validate requested action
    try:
        requested_action = TradeAction(body.action.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{body.action}'. Must be BUY or SELL.",
        )
    if requested_action == TradeAction.HOLD:
        raise HTTPException(status_code=400, detail="Cannot request HOLD execution.")

    logger.info(
        "Trade execute request: %s %s by %s", requested_action.value, sym, user_id
    )

    try:
        # STEP 2+3: TA and news fetch run concurrently
        ta_signal, headlines = await asyncio.gather(
            _get_ta_signal(sym, body.interval, body.limit),
            asyncio.to_thread(
                get_news_provider().get_latest_headlines,
                symbol=sym,
                limit=body.news_limit,
            ),
        )

        # STEP 3 (continued): AI sentiment (uses 5-min cache, FR18)
        ai_result = await ai_engine.analyze(headlines)

        # STEP 4: Reality Check
        validator = SignalValidator()
        validation = validator.reality_check(
            ta_signal=ta_signal,
            ai_sentiment_score=ai_result.sentiment_score,
            ai_summary=ai_result.summary,
        )
        final_signal: TradeSignal = validation.output_signal

        # STEP 5: Risk gate
        risk_manager = RiskManager()
        risk = risk_manager.assess(final_signal, body.account_balance)

        # Build partial response payload used in all early-exit paths
        pipeline_info = {
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
                "final_action": final_signal.action.value,
                "final_confidence": final_signal.confidence,
            },
            "risk_assessment": {
                "approved": risk.approved,
                "risk_score": risk.risk_score,
                "max_position_size": risk.max_position_size,
                "warnings": risk.warnings,
            },
        }

        # STEP 6: Gate — bypass entirely if god_mode, otherwise enforce all checks
        if body.god_mode:
            logger.warning(
                "GOD MODE: AI Risk Gate bypassed for %s %s by %s",
                requested_action.value, sym, user_id,
            )
        else:
            if final_signal.action != requested_action:
                msg = (
                    f"Pipeline produced {final_signal.action.value} "
                    f"but {requested_action.value} was requested."
                )
                logger.info("Trade blocked: %s for %s", msg, sym)
                await _log_event(user_id, sym, requested_action.value, msg, "BLOCKED")
                return {
                    "approved_for_execution": False,
                    "reason": msg,
                    "execution_result": None,
                    **pipeline_info,
                }

            if not risk.approved:
                msg = f"Risk gate rejected: {'; '.join(risk.warnings)}"
                await _log_event(user_id, sym, requested_action.value, msg, "BLOCKED")
                return {
                    "approved_for_execution": False,
                    "reason": msg,
                    "execution_result": None,
                    **pipeline_info,
                }

            if not validation.approved_for_execution:
                msg = f"Reality Check blocked: {validation.reason}"
                await _log_event(user_id, sym, requested_action.value, msg, "BLOCKED")
                return {
                    "approved_for_execution": False,
                    "reason": msg,
                    "execution_result": None,
                    **pipeline_info,
                }

        # STEP 7: Execute via TradeExecutor
        # In god_mode the pipeline verdict may be HOLD or may have low confidence;
        # override both action and confidence so the executor's own HOLD guard and
        # internal risk gate (confidence < 0.5 check) cannot block the forced trade.
        execution_signal = (
            dataclasses.replace(final_signal, action=requested_action, confidence=1.0)
            if body.god_mode
            else final_signal
        )
        container = get_container()
        executor = container.get_trade_executor()
        execution = await asyncio.to_thread(
            executor.execute_trade,
            execution_signal,
            sym,
            body.account_balance,
        )

        # STEP 8: Persist trade + position + execution log (all fire concurrently)
        exec_msg = (
            f"Order {execution.order_id} executed @ {execution.fill_price:.4f} "
            f"qty={execution.quantity}"
        )
        await asyncio.gather(
            portfolio_manager.record_trade(user_id, execution, execution_signal, risk),
            portfolio_manager.update_position(user_id, execution),
            portfolio_manager.save_open_position(user_id, execution),
            _log_event(user_id, sym, execution.action.value, exec_msg, "EXECUTED"),
        )

        logger.info(
            "Trade executed and persisted: %s %s order_id=%s",
            execution.action.value, sym, execution.order_id,
        )

        return {
            "approved_for_execution": True,
            "reason": validation.reason,
            "execution_result": {
                "order_id": execution.order_id,
                "symbol": execution.symbol,
                "action": execution.action.value,
                "quantity": execution.quantity,
                "fill_price": execution.fill_price,
                "timestamp": execution.timestamp.isoformat(),
            },
            **pipeline_info,
        }

    except TradeExecutionException as exc:
        logger.error("Trade execution error for %s/%s: %s", user_id, sym, exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Unexpected trade error for %s/%s: %s", user_id, sym, exc)
        raise HTTPException(status_code=500, detail=f"Trade pipeline failed: {exc}")
