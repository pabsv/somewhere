"""
MongoDB connection manager.

Singleton pattern to ensure a single database connection throughout the application.
"""

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure
import logging
from typing import Optional

from .config import get_connection_string, MONGO_DATABASE

logger = logging.getLogger(__name__)


class DatabaseConnection:
    """
    Singleton MongoDB connection manager.

    Usage:
        db = DatabaseConnection.get_database()
        collection = db["users"]
    """

    _instance: Optional["DatabaseConnection"] = None
    _client: Optional[MongoClient] = None
    _database: Optional[Database] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def get_client(cls) -> MongoClient:
        """Get the MongoDB client, creating it if necessary."""
        if cls._client is None:
            connection_string = get_connection_string()
            logger.info(f"Connecting to MongoDB at {connection_string.split('@')[-1]}")
            cls._client = MongoClient(connection_string)

            # Verify connection
            try:
                cls._client.admin.command("ping")
                logger.info("MongoDB connection successful")
            except ConnectionFailure as e:
                logger.error(f"MongoDB connection failed: {e}")
                raise

        return cls._client

    @classmethod
    def get_database(cls) -> Database:
        """Get the database instance."""
        if cls._database is None:
            client = cls.get_client()
            cls._database = client[MONGO_DATABASE]
        return cls._database

    @classmethod
    def close(cls):
        """Close the database connection."""
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._database = None
            logger.info("MongoDB connection closed")

    @classmethod
    def is_connected(cls) -> bool:
        """Check if connected to MongoDB."""
        if cls._client is None:
            return False
        try:
            cls._client.admin.command("ping")
            return True
        except ConnectionFailure:
            return False


# Convenience functions
def get_database() -> Database:
    """Get the database instance."""
    return DatabaseConnection.get_database()


def get_collection(name: str):
    """Get a collection by name."""
    return get_database()[name]


def close_connection():
    """Close the database connection."""
    DatabaseConnection.close()
