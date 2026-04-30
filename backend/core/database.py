"""
MongoDB client singleton using Motor (async driver).

Provides a single shared MotorClient instance for the entire application.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from core.config import config
from core.logging_config import get_logger

logger = get_logger(__name__)


class Database:
    """Singleton async MongoDB client wrapper."""

    _client: AsyncIOMotorClient | None = None
    _db = None

    @classmethod
    async def connect(cls):
        """Initialize the MongoDB connection."""
        if cls._client is not None:
            return

        logger.info("Connecting to MongoDB...")
        cls._client = AsyncIOMotorClient(
            config.mongo_uri,
            serverSelectionTimeoutMS=5000,
        )
        # Ping to verify connection
        await cls._client.admin.command("ping")
        cls._db = cls._client.get_default_database()
        logger.info(f"Connected to MongoDB: {config.mongo_uri.split('@')[0].split('//')[0]}//...@{config.mongo_uri.split('@')[1] if '@' in config.mongo_uri else 'local'}")

    @classmethod
    async def close(cls):
        """Close the MongoDB connection."""
        if cls._client:
            cls._client.close()
            cls._client = None
            cls._db = None
            logger.info("MongoDB connection closed.")

    @classmethod
    def get_db(cls):
        """Get the database instance."""
        if cls._db is None:
            raise RuntimeError("Database not connected. Call Database.connect() first.")
        return cls._db

    @classmethod
    def get_collection(cls, name: str):
        """Get a collection by name."""
        return cls.get_db()[name]
