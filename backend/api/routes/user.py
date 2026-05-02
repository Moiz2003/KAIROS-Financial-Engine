"""
User profile management endpoints.

Endpoints:
  PUT /api/user/profile — Update authenticated user's bio and avatar_url.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_current_user
from api.schemas.auth import ProfileUpdateRequest, UserProfile
from core.database import Database
from core.logging_config import get_logger
from core.security import Roles

logger = get_logger(__name__)
router = APIRouter(prefix="/api/user", tags=["user"])


def _users():
    return Database.get_collection("users")


@router.put("/profile", response_model=UserProfile)
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Update the authenticated user's bio and avatar_url.

    Returns the updated UserProfile so the frontend can refresh state immediately.
    """
    email = current_user["sub"]
    users = _users()

    result = await users.find_one_and_update(
        {"email": email},
        {"$set": {
            "bio": body.bio,
            "avatar_url": body.avatar_url,
            "updated_at": datetime.now(timezone.utc),
        }},
        return_document=True,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    logger.info(f"Profile updated: {email}")
    return UserProfile(
        email=email,
        role=current_user.get("role", Roles.VIEWER),
        sub=email,
        name=result.get("name", ""),
        bio=result.get("bio", ""),
        avatar_url=result.get("avatar_url", ""),
        iat=datetime.fromtimestamp(current_user["iat"], tz=timezone.utc),
        exp=datetime.fromtimestamp(current_user["exp"], tz=timezone.utc),
    )
