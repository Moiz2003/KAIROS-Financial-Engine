"""
Security Module — JWT token management & RBAC role handling.

Provides:
- create_access_token() — mint a signed JWT with RBAC claims
- verify_token() — decode & validate a JWT, returning payload
- get_password_hash() / verify_password() — bcrypt-style password hashing
- Role constants for the KAIROS RBAC system
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import config
from core.logging_config import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# RBAC Roles
# ---------------------------------------------------------------------------
class Roles:
    """Canonical RBAC role constants used throughout KAIROS."""
    ADMIN = "admin"
    TRADER = "trader"
    ANALYST = "analyst"
    VIEWER = "viewer"

    @classmethod
    def all(cls) -> list[str]:
        return [cls.ADMIN, cls.TRADER, cls.ANALYST, cls.VIEWER]


# ---------------------------------------------------------------------------
# Password hashing (uses bcrypt under the hood via passlib)
# ---------------------------------------------------------------------------
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    return _pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT creation & verification
# ---------------------------------------------------------------------------

def create_access_token(
    subject: str,
    role: str = Roles.VIEWER,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Create a signed JWT access token.

    Standard payload claims:
      - sub  : user identifier (email or user_id)
      - role : RBAC role string
      - exp  : expiration timestamp (UTC)
      - iat  : issued-at timestamp (UTC)

    Args:
        subject:   Unique user identifier (email or user_id).
        role:      RBAC role from Roles class.
        extra_claims: Optional dict of additional claims to embed.

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=config.jwt_access_token_expire_minutes)

    payload: Dict[str, Any] = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": expire,
    }

    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(
        payload,
        config.jwt_secret_key,
        algorithm=config.jwt_algorithm,
    )
    logger.debug(f"JWT created for subject={subject} role={role} exp={expire.isoformat()}")
    return token


def verify_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT access token.

    Args:
        token: The raw JWT string.

    Returns:
        Decoded payload dict (contains 'sub', 'role', 'exp', 'iat').

    Raises:
        ValueError: If the token is expired, malformed, or signature invalid.
    """
    try:
        payload = jwt.decode(
            token,
            config.jwt_secret_key,
            algorithms=[config.jwt_algorithm],
        )
        return payload
    except JWTError as exc:
        logger.warning(f"JWT verification failed: {exc}")
        raise ValueError(f"Invalid or expired token: {exc}") from exc
