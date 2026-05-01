"""
Portfolio Routes — open positions and aggregate statistics.

FR30: GET /api/portfolio          — open positions (auth required)
FR33: GET /api/portfolio/summary  — open_positions with live PnL (auth required)

Additional:
GET /api/portfolio/positions — raw open_positions documents (no PnL calc)
"""

import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from api.dependencies import get_current_user
from core.di_container import get_container
from core.logging_config import get_logger
from domain.services.portfolio_manager import portfolio_manager

logger = get_logger(__name__)
router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("")
async def get_open_positions(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    FR30: Return the authenticated user's open positions (upserted positions collection).

    Each position document includes symbol, quantity, avg_entry_price,
    and the timestamps for when the position was opened / last updated.
    Unrealised PnL is not pre-computed here — use /summary for live PnL.
    """
    user_id = current_user["sub"]
    sym = symbol.upper() if symbol else None

    try:
        positions = await portfolio_manager.get_open_positions(user_id, symbol=sym)
        return {
            "user_id": user_id,
            "symbol": sym,
            "count": len(positions),
            "positions": positions,
        }
    except Exception as exc:
        logger.error("Portfolio fetch failed for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch portfolio: {exc}"
        )


@router.get("/positions")
async def get_all_positions(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Return all documents from the open_positions collection (one per executed trade),
    newest first.  No live price fetch — use /summary for enriched PnL data.
    """
    user_id = current_user["sub"]
    sym = symbol.upper() if symbol else None

    try:
        positions = await portfolio_manager.get_all_open_positions(user_id, symbol=sym)
        return {
            "user_id": user_id,
            "symbol": sym,
            "count": len(positions),
            "positions": positions,
        }
    except Exception as exc:
        logger.error("Open positions fetch failed for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch open positions: {exc}"
        )


@router.delete("/close/{position_id}")
async def close_position(
    position_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Close an open position by deleting it from the open_positions collection.
    The frontend must call this before removing the card from local state.
    """
    user_id = current_user["sub"]
    deleted = await portfolio_manager.close_position(user_id, position_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Position not found or already closed")
    logger.info("Position %s closed by user %s", position_id, user_id)
    return {"status": "closed", "position_id": position_id}


@router.get("/summary")
async def get_portfolio_summary(
    symbol: Optional[str] = Query(None, description="Scope to one symbol"),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    FR33: Return all open positions enriched with live PnL.

    Pipeline:
    1. Fetch all documents from the open_positions collection.
    2. Ping Binance concurrently for the current mark price of each unique symbol.
    3. Calculate per-position PnL and PnL% based on side (LONG/SHORT).
    4. Return enriched positions + aggregate totals.

    PnL formulas:
      LONG  → pnl = (current_price - entry_price) * quantity
      SHORT → pnl = (entry_price - current_price) * quantity
      pnl_pct = pnl / (entry_price * quantity) * 100
    """
    user_id = current_user["sub"]
    sym = symbol.upper() if symbol else None

    try:
        positions = await portfolio_manager.get_all_open_positions(user_id, symbol=sym)

        if not positions:
            return {
                "user_id": user_id,
                "positions": [],
                "total_positions": 0,
                "total_pnl": 0.0,
                "total_pnl_pct": 0.0,
                "total_cost_basis": 0.0,
            }

        # --- Fetch live prices for every unique symbol concurrently ---
        try:
            container = get_container()
            binance = container.get_binance_adapter()
            unique_symbols = list({p["symbol"] for p in positions})
            price_results = await asyncio.gather(
                *[asyncio.to_thread(binance.get_current_price, s) for s in unique_symbols],
                return_exceptions=True,
            )
            live_prices: dict[str, Optional[float]] = {
                s: (float(r) if not isinstance(r, Exception) else None)
                for s, r in zip(unique_symbols, price_results)
            }
        except Exception as price_exc:
            logger.warning(
                "Binance price fetch unavailable for %s — returning positions without PnL: %s",
                user_id, price_exc,
            )
            live_prices = {}

        # --- Enrich each position with live PnL ---
        enriched = []
        total_pnl = 0.0
        total_cost = 0.0

        for pos in positions:
            pos_sym = pos["symbol"]
            entry = float(pos.get("entry_price", 0.0))
            qty = float(pos.get("quantity", 0.0))
            side = pos.get("side", "LONG")
            current_price = live_prices.get(pos_sym)

            if current_price is not None and entry > 0 and qty > 0:
                if side == "LONG":
                    pnl = (current_price - entry) * qty
                else:
                    pnl = (entry - current_price) * qty
                cost = entry * qty
                pnl_pct = (pnl / cost * 100) if cost > 0 else 0.0
            else:
                pnl = 0.0
                pnl_pct = 0.0
                cost = entry * qty
                current_price = current_price or entry

            total_pnl += pnl
            total_cost += cost

            enriched.append(
                {
                    **pos,
                    "current_price": round(current_price, 8),
                    "pnl": round(pnl, 4),
                    "pnl_pct": round(pnl_pct, 4),
                }
            )

        total_pnl_pct = (total_pnl / total_cost * 100) if total_cost > 0 else 0.0

        return {
            "user_id": user_id,
            "positions": enriched,
            "total_positions": len(enriched),
            "total_pnl": round(total_pnl, 4),
            "total_pnl_pct": round(total_pnl_pct, 4),
            "total_cost_basis": round(total_cost, 4),
        }

    except Exception as exc:
        logger.error("Portfolio summary failed for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch portfolio summary: {exc}"
        )
