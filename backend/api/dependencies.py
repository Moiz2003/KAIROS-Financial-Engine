"""
FastAPI dependency injection functions for authentication and RBAC.

get_current_user   — reads JWT from HTTP-only cookie, falls back to Bearer header
require_role()     — factory that returns a dependency enforcing role membership
require_admin      — pre-built guard: ADMIN only
require_trader     — pre-built guard: ADMIN or TRADER
require_analyst    — pre-built guard: ADMIN, TRADER, or ANALYST
require_viewer     — pre-built guard: any authenticated role
"""

from fastapi import Depends, HTTPException, Request, status

from core.security import Roles, verify_token

COOKIE_NAME = "kairos_access_token"


# ---------------------------------------------------------------------------
# Core authentication dependency
# ---------------------------------------------------------------------------

async def get_current_user(request: Request) -> dict:
    """
    Resolves the caller's identity from the request.

    Resolution order:
      1. HTTP-only cookie named 'kairos_access_token'  (preferred — set by /login)
      2. Authorization: Bearer <token> header          (fallback for Swagger UI /
                                                        existing debug dashboard)

    Returns the decoded JWT payload dict on success.
    Raises HTTP 401 if no valid credential is present.
    """
    token: str | None = request.cookies.get(COOKIE_NAME)

    if token is None:
        authorization = request.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

    try:
        return verify_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ---------------------------------------------------------------------------
# RBAC enforcement factory
# ---------------------------------------------------------------------------

def require_role(*allowed_roles: str):
    """
    Returns a FastAPI dependency that enforces role-based access control.

    Usage — inject the verified user dict:
        @router.get("/admin-panel")
        async def view(user: dict = Depends(require_role(Roles.ADMIN))):
            ...

    Usage — gate only, no user dict needed in handler:
        @router.delete("/resource", dependencies=[Depends(require_role(Roles.ADMIN))])
        async def delete(): ...

    Multiple roles = OR semantics (any of them grants access):
        Depends(require_role(Roles.ADMIN, Roles.TRADER))
    """
    async def _guard(current_user: dict = Depends(get_current_user)) -> dict:
        role = current_user.get("role", "")
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role '{role}' is not permitted for this resource. "
                    f"Required: {list(allowed_roles)}"
                ),
            )
        return current_user

    return _guard


# ---------------------------------------------------------------------------
# Pre-built role guards — import these directly in route files
# ---------------------------------------------------------------------------

# Each level includes all roles above it in the hierarchy
require_admin   = require_role(Roles.ADMIN)
require_trader  = require_role(Roles.ADMIN, Roles.TRADER)
require_analyst = require_role(Roles.ADMIN, Roles.TRADER, Roles.ANALYST)
require_viewer  = require_role(Roles.ADMIN, Roles.TRADER, Roles.ANALYST, Roles.VIEWER)
