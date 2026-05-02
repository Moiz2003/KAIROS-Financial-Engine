"""
Price Monitor Service
Async background loop: polls live prices every POLL_INTERVAL seconds and
auto-executes PENDING limit orders, DCA tranches that are due, and OPEN
positions whose TP/SL targets have been crossed.

Collections used (global, NOT tenant-scoped — the monitor needs cross-user access):
  limit_orders    — PENDING / EXECUTED / FAILED limit order documents
  dca_jobs        — ACTIVE / COMPLETED DCA schedule documents
  tp_sl_positions — OPEN / CLOSED positions with TP or SL targets
"""

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_DOWN

from core.database import Database
from core.logging_config import get_logger

logger = get_logger(__name__)

POLL_INTERVAL = 5  # seconds between price-check cycles


class PriceMonitorService:
    """
    Singleton background service started at application startup.

    Responsibilities:
    1. Collect the set of symbols that have live watchers
       (pending limits + active DCA + open TP/SL positions).
    2. Fetch all required prices in parallel via Binance.
    3. Evaluate each watcher's trigger condition.
    4. For every triggered condition: send a Binance TEST order,
       persist the result to the user's collections, and update the
       watcher document's status.
    """

    def __init__(self) -> None:
        self._running = False
        self._task: asyncio.Task | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Schedule the monitor as a background asyncio task."""
        if self._task and not self._task.done():
            return
        self._running = True
        self._task = asyncio.create_task(self._loop(), name="price_monitor")
        logger.info("PriceMonitorService started (poll interval: %ds)", POLL_INTERVAL)

    async def stop(self) -> None:
        """Gracefully cancel the monitor task."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("PriceMonitorService stopped")

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    async def _loop(self) -> None:
        while self._running:
            try:
                await self._tick()
            except Exception as exc:
                logger.error("PriceMonitor tick error: %s", exc, exc_info=True)
            await asyncio.sleep(POLL_INTERVAL)

    async def _tick(self) -> None:
        """One polling cycle: gather symbols → fetch prices → check triggers."""
        from core.di_container import get_container
        try:
            container = get_container()
            market_provider = container.get_binance_adapter()
        except ValueError:
            return  # Binance adapter not yet ready; skip this tick

        limit_col = Database.get_collection("limit_orders")
        dca_col = Database.get_collection("dca_jobs")
        pos_col = Database.get_collection("tp_sl_positions")

        symbols: set[str] = set()

        pending = await limit_col.find({"status": "PENDING"}).to_list(length=500)
        for doc in pending:
            symbols.add(doc["symbol"])

        dca_jobs = await dca_col.find({"status": "ACTIVE"}).to_list(length=500)
        for doc in dca_jobs:
            symbols.add(doc["symbol"])

        open_positions = await pos_col.find({"status": "OPEN"}).to_list(length=500)
        for doc in open_positions:
            symbols.add(doc["symbol"])

        if not symbols:
            return

        # Fetch all required prices in parallel
        sym_list = list(symbols)
        results = await asyncio.gather(
            *[asyncio.to_thread(market_provider.get_current_price, s) for s in sym_list],
            return_exceptions=True,
        )
        prices: dict[str, float] = {}
        for sym, res in zip(sym_list, results):
            if isinstance(res, Exception):
                logger.warning("Price fetch failed for %s: %s", sym, res)
            else:
                prices[sym] = float(res)

        await self._process_limit_orders(pending, prices, market_provider)
        await self._process_dca_jobs(dca_jobs, prices, market_provider)
        await self._process_tp_sl(open_positions, prices, market_provider)

    # ------------------------------------------------------------------
    # Limit order processor
    # ------------------------------------------------------------------

    async def _process_limit_orders(
        self,
        pending: list[dict],
        prices: dict[str, float],
        market_provider,
    ) -> None:
        """
        Execute a PENDING limit order when the market price crosses its target.

        BUY limit  → trigger when current_price ≤ limit_price (user wants a dip fill)
        SELL limit → trigger when current_price ≥ limit_price (user wants a rally fill)
        """
        limit_col = Database.get_collection("limit_orders")
        for order in pending:
            sym = order["symbol"]
            current = prices.get(sym)
            if current is None:
                continue

            limit_price = float(order["limit_price"])
            action = order["action"]

            triggered = (
                (action == "BUY"  and current <= limit_price) or
                (action == "SELL" and current >= limit_price)
            )
            if not triggered:
                continue

            logger.info(
                "Limit order triggered: %s %s | limit=%.4f current=%.4f",
                action, sym, limit_price, current,
            )
            try:
                await self._auto_execute(order, current, market_provider)
                await limit_col.update_one(
                    {"_id": order["_id"]},
                    {"$set": {
                        "status": "EXECUTED",
                        "fill_price": current,
                        "executed_at": datetime.utcnow(),
                    }},
                )
            except Exception as exc:
                logger.error("Limit order %s failed: %s", order["_id"], exc)
                await limit_col.update_one(
                    {"_id": order["_id"]},
                    {"$set": {
                        "status": "FAILED",
                        "error": str(exc),
                        "updated_at": datetime.utcnow(),
                    }},
                )

    # ------------------------------------------------------------------
    # DCA job processor
    # ------------------------------------------------------------------

    async def _process_dca_jobs(
        self,
        dca_jobs: list[dict],
        prices: dict[str, float],
        market_provider,
    ) -> None:
        """
        Fire a DCA tranche when its next_fire_at timestamp has elapsed.

        Each tranche buys `amount_per_trade` USDT worth of the asset.
        When cumulative `executed_amount` reaches `total_amount`, the job
        is marked COMPLETED automatically.
        """
        dca_col = Database.get_collection("dca_jobs")
        now = datetime.utcnow()

        for job in dca_jobs:
            sym = job["symbol"]
            current = prices.get(sym)
            if current is None:
                continue

            next_fire = job.get("next_fire_at")
            if next_fire and now < next_fire:
                continue  # not due yet

            executed = float(job.get("executed_amount", 0.0))
            total = float(job["total_amount"])
            per_trade = float(job["amount_per_trade"])
            interval_h = float(job["interval_hours"])

            if executed >= total:
                await dca_col.update_one(
                    {"_id": job["_id"]},
                    {"$set": {"status": "COMPLETED", "updated_at": now}},
                )
                continue

            trade_amt = min(per_trade, total - executed)
            logger.info("DCA tranche: %s %.2f USDT @ %.4f", sym, trade_amt, current)

            try:
                order_doc = {**job, "action": "BUY", "amount": trade_amt}
                await self._auto_execute(order_doc, current, market_provider)

                new_executed = executed + trade_amt
                update: dict = {
                    "executed_amount": new_executed,
                    "next_fire_at": now + timedelta(hours=interval_h),
                    "updated_at": now,
                }
                if new_executed >= total:
                    update["status"] = "COMPLETED"
                await dca_col.update_one({"_id": job["_id"]}, {"$set": update})
            except Exception as exc:
                logger.error("DCA job %s tranche failed: %s", job["_id"], exc)

    # ------------------------------------------------------------------
    # TP/SL position processor
    # ------------------------------------------------------------------

    async def _process_tp_sl(
        self,
        positions: list[dict],
        prices: dict[str, float],
        market_provider,
    ) -> None:
        """
        Close an OPEN position when its take-profit or stop-loss is hit.

        LONG (originally BUY):
          TP: close SELL when current >= take_profit
          SL: close SELL when current <= stop_loss

        SHORT (originally SELL):
          TP: close BUY  when current <= take_profit
          SL: close BUY  when current >= stop_loss
        """
        pos_col = Database.get_collection("tp_sl_positions")

        for pos in positions:
            sym = pos["symbol"]
            current = prices.get(sym)
            if current is None:
                continue

            side = pos.get("side", "LONG")
            tp = pos.get("take_profit")
            sl = pos.get("stop_loss")
            reason: str | None = None

            if tp is not None:
                tp_f = float(tp)
                if (side == "LONG"  and current >= tp_f) or \
                   (side == "SHORT" and current <= tp_f):
                    reason = f"Take-profit @ {current:.4f} (target {tp_f:.4f})"

            if reason is None and sl is not None:
                sl_f = float(sl)
                if (side == "LONG"  and current <= sl_f) or \
                   (side == "SHORT" and current >= sl_f):
                    reason = f"Stop-loss @ {current:.4f} (target {sl_f:.4f})"

            if reason is None:
                continue

            logger.info("TP/SL triggered for %s [%s]: %s", pos["_id"], sym, reason)
            close_action = "SELL" if side == "LONG" else "BUY"
            notional = float(pos["quantity"]) * current
            order_doc = {**pos, "action": close_action, "amount": notional}

            try:
                await self._auto_execute(order_doc, current, market_provider)
                await pos_col.update_one(
                    {"_id": pos["_id"]},
                    {"$set": {
                        "status": "CLOSED",
                        "close_price": current,
                        "close_reason": reason,
                        "closed_at": datetime.utcnow(),
                    }},
                )
            except Exception as exc:
                logger.error("TP/SL close for %s failed: %s", pos["_id"], exc)

    # ------------------------------------------------------------------
    # Shared execution kernel
    # ------------------------------------------------------------------

    async def _auto_execute(
        self,
        order_doc: dict,
        fill_price: float,
        market_provider,
    ) -> None:
        """
        Send a Binance TEST order, build an ExecutionResult, and persist
        all three portfolio artefacts (trade record, position upsert,
        open-position insert) for the owning user.
        """
        from domain.services.trade_executor import TradeExecutor
        from domain.services.portfolio_manager import portfolio_manager
        from domain.models import (
            ExecutionResult, TradeAction, TradeSignal, RiskAssessment,
        )

        sym = order_doc["symbol"]
        action = order_doc["action"]
        amount = float(order_doc["amount"])
        user_id = order_doc["user_id"]

        # Quantity calculation (mirrors TradeExecutor logic)
        step_size = TradeExecutor._STEP_SIZES.get(sym, 0.00001)
        step = Decimal(str(step_size))
        qty = float(
            (Decimal(str(amount / fill_price)) / step)
            .to_integral_value(rounding=ROUND_DOWN) * step
        )
        if qty <= 0:
            raise ValueError(f"Quantity too small for {sym}: {amount / fill_price:.8f}")

        # Send TEST order (no real funds)
        binance_client = market_provider.client
        order_result = await asyncio.to_thread(
            binance_client.new_order_test,
            symbol=sym, side=action, type="LIMIT",
            timeInForce="GTC", quantity=qty, price=fill_price,
        )

        now = datetime.utcnow()
        order_id = str(order_result.get("orderId", f"AUTO-{int(now.timestamp())}"))

        execution = ExecutionResult(
            success=True, order_id=order_id, symbol=sym,
            action=TradeAction(action), quantity=qty,
            fill_price=fill_price, timestamp=now,
        )

        # Synthetic signal / risk objects required by portfolio_manager schema
        dummy_signal = TradeSignal(
            action=TradeAction(action), confidence=1.0,
            reasoning="Auto-executed by price monitor",
            technical_score=0.5, sentiment_score=0.5,
            timestamp=now,
        )
        dummy_risk = RiskAssessment(
            approved=True, max_position_size=amount,
            max_leverage=1.0, warnings=[], risk_score=0.0,
            timestamp=now,
        )

        await asyncio.gather(
            portfolio_manager.record_trade(user_id, execution, dummy_signal, dummy_risk),
            portfolio_manager.update_position(user_id, execution),
            portfolio_manager.save_open_position(user_id, execution),
        )
        logger.info(
            "Auto-executed: %s %s qty=%.6f @ %.4f [user=%s]",
            action, sym, qty, fill_price, user_id,
        )


# Module-level singleton — imported by api/__init__.py lifespan
price_monitor = PriceMonitorService()
