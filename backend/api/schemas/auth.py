"""
Pydantic v2 schemas for all authentication request/response shapes.
Centralised here so routes stay thin and validation rules are not duplicated.
"""

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("at least 8 characters required")
    if not re.search(r"[A-Z]", v):
        raise ValueError("must contain at least one uppercase letter")
    if not re.search(r"[0-9]", v):
        raise ValueError("must contain at least one digit")
    return v


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class UserRegistrationRequest(BaseModel):
    email: EmailStr
    password: str
    name: str = ""

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.lower().strip()


class GoogleAuthRequest(BaseModel):
    google_id_token: str


class PasswordUpdateRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _validate_password_strength(v)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class AuthSuccessResponse(BaseModel):
    """
    Returned after a successful login or registration.
    The JWT is delivered via an HTTP-only cookie — it is intentionally
    absent from this response body.
    """
    role: str
    email: str
    name: str = ""
    expires_in_minutes: int


class UserProfile(BaseModel):
    email: str
    role: str
    sub: str
    name: str
    bio: str = ""
    avatar_url: str = ""
    iat: datetime
    exp: datetime


class ProfileUpdateRequest(BaseModel):
    bio: str = ""
    avatar_url: str = ""
