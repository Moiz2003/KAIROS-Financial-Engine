"""
Authentication Router — JWT + Google OAuth with HTTP-only cookie delivery.

Endpoints:
  POST /api/auth/register  — Create account, sets auth cookie.
  POST /api/auth/login     — Email/password login, sets auth cookie.
  POST /api/auth/logout    — Clears auth cookie.
  PUT  /api/auth/password  — Update password (authenticated).
  GET  /api/auth/me        — Return current user profile (authenticated).
  POST /api/auth/google    — Exchange Google ID token for auth cookie.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from api.dependencies import COOKIE_NAME, get_current_user
from core.rate_limiter import limiter
from api.schemas.auth import (
    AuthSuccessResponse,
    GoogleAuthRequest,
    LoginRequest,
    PasswordUpdateRequest,
    ProfileUpdateRequest,
    UserProfile,
    UserRegistrationRequest,
)
from core.config import config
from core.database import Database
from core.logging_config import get_logger
from core.security import Roles, create_access_token, get_password_hash, verify_password

logger = get_logger(__name__)
router = APIRouter(prefix="/api/auth", tags=["authentication"])

_COOKIE_MAX_AGE = config.jwt_access_token_expire_minutes * 60


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _users():
    return Database.get_collection("users")


def _set_auth_cookie(response: Response, token: str) -> None:
    """Write the JWT into a secure, HTTP-only, SameSite=Strict cookie."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="strict",
        secure=config.cookie_secure,  # True in production (HTTPS), False in dev
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=AuthSuccessResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, body: UserRegistrationRequest, response: Response):
    """
    Create a new local account.

    On success, sets the auth cookie and returns the user profile summary.
    HTTP 409 if the email is already registered.
    """
    users = _users()
    if await users.find_one({"email": body.email}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    await users.insert_one({
        "email": body.email,
        "name": body.name,
        "hashed_password": get_password_hash(body.password),
        "role": Roles.VIEWER,
        "auth_provider": "local",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })

    token = create_access_token(subject=body.email, role=Roles.VIEWER)
    _set_auth_cookie(response, token)

    logger.info(f"New user registered: {body.email}")
    return AuthSuccessResponse(
        role=Roles.VIEWER,
        email=body.email,
        name=body.name,
        expires_in_minutes=config.jwt_access_token_expire_minutes,
    )


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=AuthSuccessResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, response: Response):
    """
    Authenticate with email and password.

    On success, sets an HTTP-only SameSite=Strict cookie containing the JWT.
    The raw token is NOT present in the response body.

    Always runs bcrypt verify (even for unknown emails) to prevent timing-based
    user enumeration attacks.
    """
    users = _users()
    user = await users.find_one({"email": body.email})

    # Constant-time path: always call verify_password to prevent timing attacks
    _DUMMY_HASH = "$2b$12$invalidhashtopreventtimingattacks00000000000000000"
    stored_hash = user["hashed_password"] if user else _DUMMY_HASH
    password_ok = verify_password(body.password, stored_hash)

    if not user or not password_ok:
        logger.info(f"Failed login attempt: {body.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    role = user.get("role", Roles.VIEWER)
    token = create_access_token(subject=body.email, role=role)
    _set_auth_cookie(response, token)

    logger.info(f"Login success: {body.email} (role={role})")
    return AuthSuccessResponse(
        role=role,
        email=body.email,
        name=user.get("name", ""),
        expires_in_minutes=config.jwt_access_token_expire_minutes,
    )


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

@router.post("/logout", status_code=204)
async def logout(response: Response):
    """Clear the auth cookie. The client is immediately unauthenticated."""
    response.delete_cookie(key=COOKIE_NAME, path="/", samesite="strict")


# ---------------------------------------------------------------------------
# Password update
# ---------------------------------------------------------------------------

@router.put("/password", status_code=204)
async def update_password(
    body: PasswordUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Update the authenticated user's password.

    Requires the current password for confirmation. HTTP 401 if it doesn't match.
    Only available to local (non-Google-OAuth) accounts that have a stored hash.
    """
    email = current_user["sub"]
    users = _users()
    user = await users.find_one({"email": email})

    if not user or not user.get("hashed_password"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password update is not available for OAuth accounts",
        )

    if not verify_password(body.current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    await users.update_one(
        {"email": email},
        {"$set": {
            "hashed_password": get_password_hash(body.new_password),
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    logger.info(f"Password updated: {email}")


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile from the JWT + MongoDB."""
    email = current_user["sub"]
    user = await _users().find_one({"email": email})

    return UserProfile(
        email=email,
        role=current_user.get("role", Roles.VIEWER),
        sub=email,
        name=user.get("name", "") if user else "",
        bio=user.get("bio", "") if user else "",
        avatar_url=user.get("avatar_url", "") if user else "",
        iat=datetime.fromtimestamp(current_user["iat"], tz=timezone.utc),
        exp=datetime.fromtimestamp(current_user["exp"], tz=timezone.utc),
    )


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

@router.post("/google", response_model=AuthSuccessResponse)
async def google_auth(body: GoogleAuthRequest, response: Response):
    """
    Exchange a Google OAuth ID token for a KAIROS auth cookie.

    Verifies the token via google-auth, upserts the user in MongoDB,
    and sets the same HTTP-only cookie as the email/password login flow.
    """
    if not config.google_oauth_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID.",
        )

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        info = id_token.verify_oauth2_token(
            body.google_id_token,
            google_requests.Request(),
            config.google_oauth_client_id,
            clock_skew_in_seconds=10,
        )

        email: str = info.get("email", "").lower().strip()
        name: str = info.get("name", "")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google token did not contain an email address",
            )

        users = _users()
        existing = await users.find_one({"email": email})

        if not existing:
            await users.insert_one({
                "email": email,
                "name": name,
                "picture": info.get("picture", ""),
                "role": Roles.VIEWER,
                "hashed_password": "",
                "auth_provider": "google",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })
            role = Roles.VIEWER
            logger.info(f"New Google OAuth user: {email}")
        else:
            role = existing.get("role", Roles.VIEWER)
            await users.update_one(
                {"email": email},
                {"$set": {"name": name, "updated_at": datetime.now(timezone.utc)}},
            )
            logger.info(f"Returning Google OAuth user: {email} (role={role})")

        token = create_access_token(subject=email, role=role)
        _set_auth_cookie(response, token)

        return AuthSuccessResponse(
            role=role,
            email=email,
            name=name,
            expires_in_minutes=config.jwt_access_token_expire_minutes,
        )

    except ValueError as exc:
        logger.warning(f"Google token verification failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {exc}",
        ) from exc
