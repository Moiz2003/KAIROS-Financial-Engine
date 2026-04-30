"""
User Progress Router — Save & retrieve game state (mock trade history, AI review logs).

Endpoints:
  GET  /api/user/progress   — (protected) Get user's progress by JWT subject.
  PUT  /api/user/progress   — (protected) Upsert user's progress document.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from core.database import Database
from core.logging_config import get_logger
from core.security import Roles
from api.dependencies import get_current_user

logger = get_logger(__name__)
router = APIRouter(prefix="/api/user", tags=["user"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TradeHistoryEntry(BaseModel):
    symbol: str
    action: str  # BUY / SELL / HOLD
    confidence: float
    reasoning: str
    approved: bool
    timestamp: datetime


class AIReviewLog(BaseModel):
    model: str
    input_summary: str
    output_decision: str
    timestamp: datetime


class ProgressData(BaseModel):
    trade_history: list[TradeHistoryEntry] = []
    ai_review_logs: list[AIReviewLog] = []
    total_trades: int = 0
    win_rate: float = 0.0
    pnl: float = 0.0


class ProgressResponse(BaseModel):
    email: str
    progress: ProgressData
    updated_at: datetime


class ProgressUpdateRequest(BaseModel):
    progress: ProgressData


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _progress_collection():
    return Database.get_collection("progress")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/progress", response_model=ProgressResponse)
async def get_progress(current_user: dict = Depends(get_current_user)):
    """
    Retrieve the user's game progress from MongoDB.

    Protected — requires a valid Bearer token.
    """
    email = current_user.get("sub", "")
    collection = _progress_collection()
    doc = await collection.find_one({"email": email})

    if not doc:
        # Return empty progress for new users
        return ProgressResponse(
            email=email,
            progress=ProgressData(),
            updated_at=datetime.now(timezone.utc),
        )

    return ProgressResponse(
        email=doc["email"],
        progress=ProgressData(**doc.get("progress", {})),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
    )


@router.put("/progress", response_model=ProgressResponse)
async def update_progress(
    body: ProgressUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Upsert the user's game progress.

    Protected — requires a valid Bearer token.
    """
    email = current_user.get("sub", "")
    collection = _progress_collection()
    now = datetime.now(timezone.utc)

    await collection.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "progress": body.progress.model_dump(),
            "updated_at": now,
        }},
        upsert=True,
    )

    logger.info(f"Progress updated for {email}")
    return ProgressResponse(
        email=email,
        progress=body.progress,
        updated_at=now,
    )
