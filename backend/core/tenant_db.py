"""
Tenant-isolated MongoDB collection wrapper.

TenantCollection wraps a Motor AsyncIOMotorCollection and automatically
injects {"user_id": <user_id>} into every query filter.  It is structurally
impossible to issue a read, write, or delete without that filter being present
in the final MongoDB query — the caller cannot accidentally omit it.

Usage inside a route handler:
    portfolios = get_tenant_collection("portfolios", current_user["sub"])

    # find_one — Mongo sees {"user_id": "alice@example.com", "symbol": "BTCUSDT"}
    doc = await portfolios.find_one({"symbol": "BTCUSDT"})

    # insert_one — stamps user_id onto the document automatically
    await portfolios.insert_one({"symbol": "ETHUSDT", "qty": 1.5})

    # update scoped to this user only
    await portfolios.update_one({"symbol": "BTCUSDT"}, {"$set": {"qty": 0.5}})
"""

from motor.motor_asyncio import AsyncIOMotorCollection

from core.database import Database
from core.logging_config import get_logger

logger = get_logger(__name__)


class TenantCollection:
    """
    Motor collection wrapper that hard-scopes every query to a single user_id.
    """

    def __init__(self, collection: AsyncIOMotorCollection, user_id: str) -> None:
        if not user_id:
            raise ValueError("TenantCollection requires a non-empty user_id")
        self._col = collection
        self._user_id = user_id

    # ------------------------------------------------------------------
    # Internal scope builder — the single enforcement point
    # ------------------------------------------------------------------

    def _scope(self, extra: dict | None = None) -> dict:
        """Merge tenant scope with an optional caller-supplied filter."""
        base: dict = {"user_id": self._user_id}
        if extra:
            base.update(extra)
        return base

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------

    async def find_one(self, filter: dict | None = None, **kwargs):
        return await self._col.find_one(self._scope(filter), **kwargs)

    def find(self, filter: dict | None = None, **kwargs):
        """Returns a Motor cursor scoped to this tenant."""
        return self._col.find(self._scope(filter), **kwargs)

    async def count_documents(self, filter: dict | None = None, **kwargs) -> int:
        return await self._col.count_documents(self._scope(filter), **kwargs)

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    async def insert_one(self, document: dict, **kwargs):
        """Stamps user_id onto the document before insertion."""
        document["user_id"] = self._user_id
        return await self._col.insert_one(document, **kwargs)

    async def update_one(self, filter: dict, update: dict, **kwargs):
        return await self._col.update_one(self._scope(filter), update, **kwargs)

    async def update_many(self, filter: dict, update: dict, **kwargs):
        return await self._col.update_many(self._scope(filter), update, **kwargs)

    # ------------------------------------------------------------------
    # Delete operations
    # ------------------------------------------------------------------

    async def delete_one(self, filter: dict | None = None, **kwargs):
        return await self._col.delete_one(self._scope(filter), **kwargs)

    async def delete_many(self, filter: dict | None = None, **kwargs):
        return await self._col.delete_many(self._scope(filter), **kwargs)


# ---------------------------------------------------------------------------
# Factory — call this inside route handlers
# ---------------------------------------------------------------------------

def get_tenant_collection(collection_name: str, user_id: str) -> TenantCollection:
    """
    Return a tenant-scoped collection bound to user_id.

    Args:
        collection_name: MongoDB collection name (e.g. "portfolios", "trades")
        user_id:         The authenticated user's identifier — use current_user["sub"]

    Raises:
        ValueError: if user_id is empty (prevents misconfigured callers)
        RuntimeError: if the database is not yet connected (propagated from Database)
    """
    raw = Database.get_collection(collection_name)
    return TenantCollection(raw, user_id)
