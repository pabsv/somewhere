"""
MongoDB index setup script.

Run this once to create all necessary indexes for optimal performance.

Usage:
    python -m database.setup_indexes

Or from Python:
    from database.setup_indexes import setup_all_indexes
    setup_all_indexes()
"""

import logging
from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.errors import OperationFailure

from .connection import get_database
from .config import (
    COLLECTION_USERS,
    COLLECTION_AVAILABILITY,
    COLLECTION_DESTINATIONS,
    COLLECTION_FLIGHTS,
    COLLECTION_PRICE_HISTORY,
    COLLECTION_ROUTE_STATS,
    PRICE_HISTORY_TTL_DAYS,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def setup_user_indexes(db):
    """Create indexes for users collection."""
    collection = db[COLLECTION_USERS]

    indexes = [
        # Unique email index
        IndexModel([("email", ASCENDING)], unique=True, name="email_unique"),
        # Active users index
        IndexModel([("is_active", ASCENDING)], name="is_active"),
    ]

    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_USERS}")


def setup_availability_indexes(db):
    """Create indexes for availability collection."""
    collection = db[COLLECTION_AVAILABILITY]

    indexes = [
        # User lookup
        IndexModel([("user_id", ASCENDING)], name="user_id"),
        # Active availability for user
        IndexModel(
            [("user_id", ASCENDING), ("is_active", ASCENDING)],
            name="user_active"
        ),
        # Date range queries
        IndexModel(
            [("user_id", ASCENDING), ("start_date", ASCENDING), ("end_date", ASCENDING)],
            name="user_date_range"
        ),
        # Future availability
        IndexModel(
            [("is_active", ASCENDING), ("end_date", ASCENDING)],
            name="active_future"
        ),
    ]

    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_AVAILABILITY}")


def setup_destination_indexes(db):
    """Create indexes for destination_preferences collection."""
    collection = db[COLLECTION_DESTINATIONS]

    indexes = [
        # User lookup
        IndexModel([("user_id", ASCENDING)], name="user_id"),
        # Destination lookup (reverse lookup)
        IndexModel([("destination_code", ASCENDING)], name="destination_code"),
        # User + destination (for checking duplicates)
        IndexModel(
            [("user_id", ASCENDING), ("destination_code", ASCENDING)],
            unique=True,
            name="user_destination_unique"
        ),
        # Active destinations for user
        IndexModel(
            [("user_id", ASCENDING), ("is_active", ASCENDING), ("priority", ASCENDING)],
            name="user_active_priority"
        ),
    ]

    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_DESTINATIONS}")


def setup_flight_indexes(db):
    """Create indexes for flights collection."""
    collection = db[COLLECTION_FLIGHTS]

    indexes = [
        # Unique flight key
        IndexModel([("flight_key", ASCENDING)], unique=True, name="flight_key_unique"),
        # Route lookup
        IndexModel(
            [("origin", ASCENDING), ("destination", ASCENDING)],
            name="route"
        ),
        # Origin lookup
        IndexModel([("origin", ASCENDING)], name="origin"),
        # Destination lookup
        IndexModel([("destination", ASCENDING)], name="destination"),
        # Price sorting
        IndexModel([("price", ASCENDING)], name="price"),
        # Deals lookup
        IndexModel(
            [("is_deal", ASCENDING), ("deal_score", DESCENDING)],
            name="deals"
        ),
        # Date range queries
        IndexModel(
            [("outbound_date", ASCENDING), ("return_date", ASCENDING)],
            name="date_range"
        ),
        # Recently scraped
        IndexModel([("scraped_at", DESCENDING)], name="scraped_at"),
        # Last seen (for cleanup)
        IndexModel([("last_seen_at", ASCENDING)], name="last_seen"),
        # Combined route + price for sorted queries
        IndexModel(
            [("origin", ASCENDING), ("destination", ASCENDING), ("price", ASCENDING)],
            name="route_price"
        ),
        # Deals by destination
        IndexModel(
            [("destination", ASCENDING), ("is_deal", ASCENDING), ("deal_score", DESCENDING)],
            name="destination_deals"
        ),
    ]

    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_FLIGHTS}")


def setup_price_history_indexes(db):
    """Create indexes for price_history collection."""
    collection = db[COLLECTION_PRICE_HISTORY]

    indexes = [
        # Flight lookup
        IndexModel([("flight_key", ASCENDING)], name="flight_key"),
        # Route lookup
        IndexModel([("route_key", ASCENDING)], name="route_key"),
        # Time-based queries
        IndexModel([("scraped_at", DESCENDING)], name="scraped_at"),
        # Route + time for trend queries
        IndexModel(
            [("route_key", ASCENDING), ("scraped_at", DESCENDING)],
            name="route_time"
        ),
        # TTL index - auto-delete after X days
        IndexModel(
            [("scraped_at", ASCENDING)],
            expireAfterSeconds=PRICE_HISTORY_TTL_DAYS * 24 * 60 * 60,
            name="ttl_cleanup"
        ),
    ]

    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_PRICE_HISTORY}")
    logger.info(f"TTL index set to delete records after {PRICE_HISTORY_TTL_DAYS} days")


def setup_route_stats_indexes(db):
    """Create indexes for route_stats collection."""
    collection = db[COLLECTION_ROUTE_STATS]

    indexes = [
        # Unique route key
        IndexModel([("route_key", ASCENDING)], unique=True, name="route_key_unique"),
        # Origin lookup
        IndexModel([("origin", ASCENDING)], name="origin"),
        # Destination lookup
        IndexModel([("destination", ASCENDING)], name="destination"),
        # Average price sorting
        IndexModel([("average_price", ASCENDING)], name="avg_price"),
        # Sample count (for filtering routes with enough data)
        IndexModel([("sample_count", DESCENDING)], name="sample_count"),
    ]

    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_ROUTE_STATS}")


def setup_all_indexes():
    """Create all indexes for all collections."""
    logger.info("=" * 60)
    logger.info("Setting up MongoDB indexes...")
    logger.info("=" * 60)

    try:
        db = get_database()
        logger.info(f"Connected to database: {db.name}")

        setup_user_indexes(db)
        setup_availability_indexes(db)
        setup_destination_indexes(db)
        setup_flight_indexes(db)
        setup_price_history_indexes(db)
        setup_route_stats_indexes(db)

        logger.info("=" * 60)
        logger.info("All indexes created successfully!")
        logger.info("=" * 60)

        return True

    except OperationFailure as e:
        logger.error(f"Failed to create indexes: {e}")
        return False
    except Exception as e:
        logger.error(f"Error during index setup: {e}")
        return False


def list_all_indexes():
    """List all indexes in all collections."""
    db = get_database()

    collections = [
        COLLECTION_USERS,
        COLLECTION_AVAILABILITY,
        COLLECTION_DESTINATIONS,
        COLLECTION_FLIGHTS,
        COLLECTION_PRICE_HISTORY,
        COLLECTION_ROUTE_STATS,
    ]

    for coll_name in collections:
        print(f"\n{coll_name}:")
        for index in db[coll_name].list_indexes():
            print(f"  - {index['name']}: {index['key']}")


def drop_all_indexes():
    """Drop all indexes (except _id) from all collections. Use with caution!"""
    db = get_database()

    collections = [
        COLLECTION_USERS,
        COLLECTION_AVAILABILITY,
        COLLECTION_DESTINATIONS,
        COLLECTION_FLIGHTS,
        COLLECTION_PRICE_HISTORY,
        COLLECTION_ROUTE_STATS,
    ]

    for coll_name in collections:
        db[coll_name].drop_indexes()
        logger.info(f"Dropped all indexes from {coll_name}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "list":
            list_all_indexes()
        elif sys.argv[1] == "drop":
            response = input("Are you sure you want to drop all indexes? (yes/no): ")
            if response.lower() == "yes":
                drop_all_indexes()
        else:
            print("Usage: python -m database.setup_indexes [list|drop]")
    else:
        setup_all_indexes()
