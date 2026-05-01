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

    async def close_position(self, user_id: str, position_id: str) -> bool:
        """
        Delete a single open_positions document by its MongoDB _id.
        Returns True if deleted, False if not found or invalid id.
        """
        from bson import ObjectId
        positions = get_tenant_collection("open_positions", user_id)
        try:
            result = await positions.delete_one({"_id": ObjectId(position_id)})
        except Exception:
            return False
        deleted = result.deleted_count == 1
        if deleted:
            logger.info("Open position closed: %s for %s", position_id, user_id)
        return deleted


# Module-level singleton
portfolio_manager = PortfolioManager()
