"""
NFR7: Rate limiting singleton using slowapi.

Key function resolves the real client IP behind reverse proxies by checking
X-Forwarded-For and X-Real-IP headers before falling back to request.client.host.
"""

from fastapi import Request
from slowapi import Limiter


def get_real_ip(request: Request) -> str:
    # X-Forwarded-For may be a comma-separated chain: client, proxy1, proxy2, ...
    # The leftmost entry is the originating client.
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_real_ip)
