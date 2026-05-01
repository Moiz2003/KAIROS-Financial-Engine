"""
NFR7: Rate limiting singleton using slowapi.

Key function is get_remote_address (IP-based) by default.
For authenticated endpoints the decorator can override key_func on a per-route
basis, but IP-based limits are sufficient for the current deployment model.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
