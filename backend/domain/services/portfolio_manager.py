"""
Portfolio Management Service
Async service for recording trades, managing positions, and calculating PnL.

FR27: Persist executed trades to the `trades` collection (TenantCollection).
FR28: Upsert open positions to the `positions` collection (TenantCollection).
FR30: Retrieve open positions with unrealised PnL approximation.
FR33/FR34: Per-user and per-symbol aggregate statistics.

Extensions:
- trade_logs: every pipeline outcome (executed or blocked) is written here.
- open_positions: each successful execution is inserted as its own document
  (insert_one — never overwritten) so the portfolio view retains full history.
"""

from datetime import datetime
from typing import List, Optional

from core.database import Database
from core.logging_config import get_logger
from core.tenant_db import get_tenant_collection
from domain.models import ExecutionResult, RiskAssessment, TradeAction, TradeSignal

logger = get_logger(__name__)


class PortfolioManager:
    """
    Async service for trade persistence and portfolio state management.

    All collections are accessed through TenantCollection, which hard-scopes
    every query to the authenticated user_id — cross-user data leakage is
    structurally impossible.
    """

    async def record_trade(
        self,
        user_id: str,
        execution: ExecutionResult,
        signal: TradeSignal,
        risk: RiskAssessment,
    ) -> str:
        """
        FR27: Persist a completed trade execution to the `trades` collection.

        Returns the inserted MongoDB document ID as a string.
        """
        trades = get_tenant_collection("trades", user_id)
        doc = {
            "order_id": execution.order_id,
            "symbol": execution.symbol,
            "action": execution.action.value,
            "quantity": execution.quantity,
            "fill_price": execution.fill_price,
            "confidence": signal.confidence,
            "reasoning": signal.reasoning,
            "technical_score": signal.technical_score,
            "sentiment_score": signal.sentiment_score,
            "risk_score": risk.risk_score,
            "risk_approved": risk.approved,
            "timestamp": execution.timestamp,
        }
        result = await trades.insert_one(doc)
        logger.info("Trade recorded: %s for user %s", execution.order_id, user_id)
        return str(result.inserted_id)

    async def update_position(self, user_id: str, execution: ExecutionResult) -> None:
        """
        FR28: Upsert an open position document.

        BUY  → increases quantity, recalculates weighted avg entry price.
        SELL → decreases quantity; deletes the document when quantity reaches zero.
        """
        positions = get_tenant_collection("positions", user_id)
        qty_delta = (
            execution.quantity
            if execution.action == TradeAction.BUY
            else -execution.quantity
        )

        existing = await positions.find_one({"symbol": execution.symbol})

        if existing is None:
            await positions.insert_one(
                {
                    "symbol": execution.symbol,
                    "quantity": qty_delta,
                    "avg_entry_price": execution.fill_price,
                    "opened_at": execution.timestamp,
                    "updated_at": execution.timestamp,
                }
            )
            logger.debug(
                "New position opened: %s qty=%.4f for %s",
                execution.symbol, qty_delta, user_id,
            )
        else:
            new_qty = existing["quantity"] + qty_delta

            if abs(new_qty) < 1e-8:
                await positions.delete_one({"symbol": execution.symbol})
                logger.info(
                    "Position closed: %s for %s", execution.symbol, user_id
                )
            else:
                if qty_delta > 0:
                    # Adding to position — recalculate weighted average entry
                    old_cost = existing["quantity"] * existing["avg_entry_price"]
                    new_cost = qty_delta * execution.fill_price
                    new_avg = (old_cost + new_cost) / new_qty
                else:
                    # Reducing position — entry price unchanged
                    new_avg = existing["avg_entry_price"]

                await positions.update_one(
                    {"symbol": execution.symbol},
                    {
                        "$set": {
                            "quantity": new_qty,
                            "avg_entry_price": new_avg,
                            "updated_at": execution.timestamp,
                        }
                    },
                )
                logger.debug(
                    "Position updated: %s qty=%.4f avg=%.2f for %s",
                    execution.symbol, new_qty, new_avg, user_id,
                )

    async def get_open_positions(
        self, user_id: str, symbol: Optional[str] = None
    ) -> List[dict]:
        """
        FR30: Return all open positions for a user, optionally filtered by symbol.

        Each document is returned as-is from MongoDB (includes _id as string).
        """
        positions = get_tenant_collection("positions", user_id)
        flt = {"symbol": symbol.upper()} if symbol else None
        cursor = positions.find(flt)
        docs = await cursor.to_list(length=200)
        # Coerce ObjectId to string so callers can serialise freely
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    async def get_trade_history(
        self,
        user_id: str,
        symbol: Optional[str] = None,
        limit: int = 20,
    ) -> List[dict]:
        """
        FR29: Return paginated trade history for a user, newest first.
        """
        trades = get_tenant_collection("trades", user_id)
        flt = {"symbol": symbol.upper()} if symbol else None
        cursor = trades.find(flt).sort("timestamp", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    async def get_stats(
        self, user_id: str, symbol: Optional[str] = None
    ) -> dict:
        """
        FR33/FR34: Return aggregate trade statistics for a user.

        When `symbol` is provided, stats are scoped to that symbol (FR34).
        Otherwise, stats cover all symbols (FR33).
        """
        history = await self.get_trade_history(user_id, symbol=symbol, limit=1000)

        if not history:
            return {
                "total_trades": 0,
                "buy_count": 0,
                "sell_count": 0,
                "avg_confidence": 0.0,
                "avg_risk_score": 0.0,
                "symbol": symbol,
            }

        buy_count = sum(1 for t in history if t.get("action") == "BUY")
        sell_count = sum(1 for t in history if t.get("action") == "SELL")
        confidences = [t["confidence"] for t in history if "confidence" in t]
        risk_scores = [t["risk_score"] for t in history if "risk_score" in t]

        return {
            "total_trades": len(history),
            "buy_count": buy_count,
            "sell_count": sell_count,
            "avg_confidence": (
                round(sum(confidences) / len(confidences), 4) if confidences else 0.0
            ),
            "avg_risk_score": (
                round(sum(risk_scores) / len(risk_scores), 4) if risk_scores else 0.0
            ),
            "symbol": symbol,
        }


    # ------------------------------------------------------------------
    # Execution Logs  (trade_logs collection)
    # ------------------------------------------------------------------

    async def log_trade_event(
        self,
        user_id: str,
        symbol: str,
        action: str,
        message: str,
        status: str = "EXECUTED",
    ) -> None:
        """
        Append a single log entry to the `trade_logs` collection.

        status values: "EXECUTED" | "BLOCKED" | "ERROR"
        This is intentionally fire-and-forget; callers should wrap in try/except
        so a log failure never breaks the trade pipeline.
        """
        logs = get_tenant_collection("trade_logs", user_id)
        await logs.insert_one(
            {
                "symbol": symbol,
                "action": action,
                "message": message,
                "status": status,
                "timestamp": datetime.utcnow(),
            }
        )
        logger.debug("Trade event logged: %s %s [%s] for %s", status, action, symbol, user_id)

    async def get_execution_logs(
        self,
        user_id: str,
        limit: int = 50,
    ) -> List[dict]:
        """Return the N most recent execution log entries, newest first."""
        logs = get_tenant_collection("trade_logs", user_id)
        cursor = logs.find().sort("timestamp", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    # ------------------------------------------------------------------
    # Open Positions  (open_positions collection — insert_only)
    # ------------------------------------------------------------------

    async def save_open_position(
        self,
        user_id: str,
        execution: ExecutionResult,
    ) -> str:
        """
        Insert a new open-position document for every successfully executed trade.

        Uses insert_one exclusively — existing positions are NEVER overwritten.
        Each BUY creates a LONG entry; each SELL creates a SHORT entry.
        Returns the inserted MongoDB document ID as a string.
        """
        positions = get_tenant_collection("open_positions", user_id)
        side = "LONG" if execution.action == TradeAction.BUY else "SHORT"
        doc = {
            "symbol": execution.symbol,
            "side": side,
            "quantity": execution.quantity,
            "entry_price": execution.fill_price,
            "timestamp": execution.timestamp,
        }
        result = await positions.insert_one(doc)
        logger.info(
            "Open position saved: %s %s qty=%.4f entry=%.4f for %s",
            side, execution.symbol, execution.quantity, execution.fill_price, user_id,
        )
        return str(result.inserted_id)

    async def get_all_open_positions(
        self,
        user_id: str,
        symbol: Optional[str] = None,
    ) -> List[dict]:
        """
        Return all documents from the `open_positions` collection, newest first.
        Optionally scoped to a single symbol.
        """
        positions = get_tenant_collection("open_positions", user_id)
        flt = {"symbol": symbol.upper()} if symbol else None
        cursor = positions.find(flt).sort("timestamp", -1)
        docs = await cursor.to_list(length=500)
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        return docs

    async def close_position(
        self, user_id: str, position_id: str, close_price: float
    ) -> bool:
        """
        Archive a single open_positions document to trade_history, then delete it.

        Calculates realized_pnl based on side (LONG/SHORT) and close_price,
        inserts the enriched document into the `trade_history` collection,
        then removes it from `open_positions`.
        Returns True if successfully archived and deleted, False otherwise.
        """
        from bson import ObjectId
        positions = get_tenant_collection("open_positions", user_id)
        history_coll = get_tenant_collection("trade_history", user_id)
        try:
            oid = ObjectId(position_id)
            existing = await positions.find_one({"_id": oid})
            if existing is None:
                return False

            entry_price = float(existing.get("entry_price", 0.0))
            quantity = float(existing.get("quantity", 0.0))
            side = existing.get("side", "LONG")

            if side == "LONG":
                realized_pnl = (close_price - entry_price) * quantity
            else:
                realized_pnl = (entry_price - close_price) * quantity

            history_doc = {
                k: v for k, v in existing.items() if k != "_id"
            }
            history_doc.update({
                "close_price": close_price,
                "realized_pnl": round(realized_pnl, 4),
                "is_winner": realized_pnl > 0,
                "closed_at": datetime.utcnow(),
            })
            await history_coll.insert_one(history_doc)

            result = await positions.delete_one({"_id": oid})
            deleted = result.deleted_count == 1
            if deleted:
                logger.info(
                    "Open position archived to trade_history: %s pnl=%.4f for %s",
                    position_id, realized_pnl, user_id,
                )
            return deleted
        except Exception as exc:
            logger.error("close_position failed for %s: %s", user_id, exc)
            return False

    async def get_closed_trade_history(self, user_id: str) -> dict:
        """
        Return all documents from the `trade_history` collection (newest first),
        plus aggregated stats: total_realized_pnl, win_rate, total_trades.
        """
        history_coll = get_tenant_collection("trade_history", user_id)
        cursor = history_coll.find().sort("closed_at", -1)
        docs = await cursor.to_list(length=500)

        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
            for key in ("closed_at", "opened_at", "timestamp"):
                if key in doc and hasattr(doc[key], "isoformat"):
                    doc[key] = doc[key].isoformat()

        total_trades = len(docs)
        win_count = sum(1 for d in docs if d.get("is_winner", False))
        win_rate = round((win_count / total_trades) * 100, 1) if total_trades > 0 else 0.0
        total_realized_pnl = round(
            sum(d.get("realized_pnl", 0.0) for d in docs), 4
        )

        return {
            "trades": docs,
            "stats": {
                "total_trades": total_trades,
                "win_count": win_count,
                "loss_count": total_trades - win_count,
                "win_rate": win_rate,
                "total_realized_pnl": total_realized_pnl,
            },
        }


    # ------------------------------------------------------------------
    # Limit Orders  (global limit_orders collection — not tenant-scoped)
    # ------------------------------------------------------------------

    async def save_limit_order(self, user_id: str, order_data: dict) -> str:
        """
        Persist a PENDING limit order to the global `limit_orders` collection.
        The monitor loop queries this collection without a user_id filter, so
        TenantCollection cannot be used here — we use Database.get_collection().
        """
        col = Database.get_collection("limit_orders")
        doc = {
            **order_data,
            "user_id": user_id,
            "status": "PENDING",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        result = await col.insert_one(doc)
        logger.info("Limit order saved: %s for user %s", result.inserted_id, user_id)
        return str(result.inserted_id)

    async def get_pending_limit_orders(self, user_id: str) -> List[dict]:
        """Return all PENDING limit orders for a user, newest first."""
        col = Database.get_collection("limit_orders")
        cursor = col.find({"user_id": user_id, "status": "PENDING"}).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
            for key in ("created_at", "updated_at"):
                if key in doc and hasattr(doc[key], "isoformat"):
                    doc[key] = doc[key].isoformat()
        return docs

    # ------------------------------------------------------------------
    # DCA Jobs  (global dca_jobs collection — not tenant-scoped)
    # ------------------------------------------------------------------

    async def save_dca_job(self, user_id: str, job_data: dict) -> str:
        """
        Persist a new DCA schedule to the global `dca_jobs` collection.
        `next_fire_at` is set to utcnow so the monitor fires the first
        tranche on its very next tick.
        """
        col = Database.get_collection("dca_jobs")
        doc = {
            **job_data,
            "user_id": user_id,
            "status": "ACTIVE",
            "executed_amount": 0.0,
            "next_fire_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        result = await col.insert_one(doc)
        logger.info("DCA job saved: %s for user %s", result.inserted_id, user_id)
        return str(result.inserted_id)

    async def get_dca_jobs(self, user_id: str) -> List[dict]:
        """Return all ACTIVE DCA jobs for a user, newest first."""
        col = Database.get_collection("dca_jobs")
        cursor = col.find({"user_id": user_id, "status": "ACTIVE"}).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
            for key in ("created_at", "next_fire_at", "updated_at"):
                if key in doc and hasattr(doc[key], "isoformat"):
                    doc[key] = doc[key].isoformat()
        return docs

    # ------------------------------------------------------------------
    # TP/SL Positions  (global tp_sl_positions — not tenant-scoped)
    # ------------------------------------------------------------------

    async def save_tp_sl_position(
        self,
        user_id: str,
        execution: ExecutionResult,
        take_profit: Optional[float],
        stop_loss: Optional[float],
    ) -> str:
        """
        Register an OPEN position for TP/SL monitoring in the global
        `tp_sl_positions` collection.  Called immediately after a MARKET
        order execution when the user supplied TP and/or SL targets.
        """
        col = Database.get_collection("tp_sl_positions")
        side = "LONG" if execution.action == TradeAction.BUY else "SHORT"
        doc = {
            "user_id": user_id,
            "symbol": execution.symbol,
            "side": side,
            "quantity": execution.quantity,
            "entry_price": execution.fill_price,
            "take_profit": take_profit,
            "stop_loss": stop_loss,
            "status": "OPEN",
            "created_at": execution.timestamp,
        }
        result = await col.insert_one(doc)
        logger.info(
            "TP/SL position saved: %s %s tp=%s sl=%s for %s",
            side, execution.symbol, take_profit, stop_loss, user_id,
        )
        return str(result.inserted_id)


# Module-level singleton
portfolio_manager = PortfolioManager()
