"""
MongoDB index setup script (v2).

Run this once to create all necessary indexes for optimal performance.

flights gets EXACTLY four indexes (plus _id):
  flight_key unique, (origin, outbound_date, price),
  (destination, outbound_date, price), TTL last_seen_at 14d.
Any other existing flights index is dropped by name.

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
    COLLECTION_FLIGHTS,
    COLLECTION_SCRAPE_TARGETS,
    COLLECTION_SCRAPE_RUNS,
    COLLECTION_FRIENDSHIPS,
    COLLECTION_GROUPS,
    COLLECTION_ONEWAY_FARES,
    FLIGHTS_TTL_DAYS,
    SCRAPE_RUNS_TTL_DAYS,
    ONEWAY_FARES_TTL_DAYS,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def setup_user_indexes(db):
    """Create indexes for users collection."""
    collection = db[COLLECTION_USERS]

    indexes = [
        # Unique email index
        IndexModel([("email", ASCENDING)], unique=True, name="email_unique"),
    ]

    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_USERS}")


def setup_availability_indexes(db):
    """Create indexes for availability collection."""
    collection = db[COLLECTION_AVAILABILITY]

    indexes = [
        # User + window-end lookups (future windows per user)
        IndexModel(
            [("user_id", ASCENDING), ("end_date", ASCENDING)],
            name="user_end_date"
        ),
    ]

    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_AVAILABILITY}")


def setup_friendship_indexes(db):
    """Create indexes for friendships collection (written by the frontend)."""
    collection = db[COLLECTION_FRIENDSHIPS]

    indexes = [
        # Canonical sorted user-id pair — at most one live relationship per
        # pair in either direction; also the dupe/race guard for requests.
        IndexModel([("pair_key", ASCENDING)], unique=True, name="pair_key_unique"),
        # Per-side lookups (my outgoing / my incoming, by status).
        IndexModel(
            [("requester_id", ASCENDING), ("status", ASCENDING)],
            name="requester_status"
        ),
        IndexModel(
            [("recipient_id", ASCENDING), ("status", ASCENDING)],
            name="recipient_status"
        ),
    ]

    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_FRIENDSHIPS}")


def setup_group_indexes(db):
    """Create indexes for groups collection (written by the frontend)."""
    collection = db[COLLECTION_GROUPS]

    indexes = [
        # Multikey: "my groups" lookup for the list page and membership guards.
        IndexModel([("members.user_id", ASCENDING)], name="members_user"),
        # Invite-link resolution; unique so a token maps to exactly one group.
        IndexModel(
            [("invite.token", ASCENDING)],
            unique=True,
            name="invite_token_unique",
            partialFilterExpression={"invite.token": {"$exists": True}},
        ),
    ]
    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_GROUPS}")


# The ONLY indexes allowed on flights (besides the implicit _id).
FLIGHTS_INDEX_NAMES = {
    "_id_",
    "flight_key_unique",
    "origin_outbound_price",
    "destination_outbound_price",
    "ttl_last_seen",
}


def setup_flight_indexes(db):
    """
    Create the v2 index set for the flights collection and drop everything
    else by name (legacy deal/route/price indexes from v1).
    """
    collection = db[COLLECTION_FLIGHTS]

    # Drop any index that is not part of the v2 set.
    try:
        existing = list(collection.list_indexes())
    except OperationFailure:
        existing = []
    for idx in existing:
        name = idx["name"]
        if name not in FLIGHTS_INDEX_NAMES:
            try:
                collection.drop_index(name)
                logger.info(f"Dropped legacy index '{name}' on {COLLECTION_FLIGHTS}")
            except OperationFailure as e:
                logger.warning(f"Could not drop index '{name}' on {COLLECTION_FLIGHTS}: {e}")

    indexes = [
        # Unique itinerary key (no price component in v2)
        IndexModel([("flight_key", ASCENDING)], unique=True, name="flight_key_unique"),
        # Origin-side queries sorted by price
        IndexModel(
            [("origin", ASCENDING), ("outbound_date", ASCENDING), ("price", ASCENDING)],
            name="origin_outbound_price"
        ),
        # Destination-side queries sorted by price
        IndexModel(
            [("destination", ASCENDING), ("outbound_date", ASCENDING), ("price", ASCENDING)],
            name="destination_outbound_price"
        ),
        # Last seen TTL — auto-delete flights not re-seen in FLIGHTS_TTL_DAYS.
        # This is the pool-scraper's primary cleanup mechanism.
        IndexModel(
            [("last_seen_at", ASCENDING)],
            expireAfterSeconds=FLIGHTS_TTL_DAYS * 24 * 60 * 60,
            name="ttl_last_seen"
        ),
    ]

    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_FLIGHTS}")
    logger.info(f"  TTL: flights expire {FLIGHTS_TTL_DAYS}d after last_seen_at")


def setup_scrape_target_indexes(db):
    """Create indexes for scrape_targets collection (pool scheduler)."""
    collection = db[COLLECTION_SCRAPE_TARGETS]

    indexes = [
        IndexModel([("route_key", ASCENDING)], unique=True, name="route_key_unique"),
        # Primary scheduling query: enabled + due-time.
        IndexModel(
            [("enabled", ASCENDING), ("next_due_at", ASCENDING)],
            name="enabled_next_due"
        ),
        IndexModel([("tier", ASCENDING)], name="tier"),
        IndexModel([("origin", ASCENDING), ("destination", ASCENDING)], name="route"),
        IndexModel([("last_status", ASCENDING)], name="last_status"),
    ]
    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_SCRAPE_TARGETS}")


def setup_scrape_run_indexes(db):
    """Create indexes for scrape_runs collection (observability log)."""
    collection = db[COLLECTION_SCRAPE_RUNS]

    indexes = [
        IndexModel([("started_at", DESCENDING)], name="started_at"),
        IndexModel([("route_key", ASCENDING), ("started_at", DESCENDING)], name="route_time"),
        IndexModel([("status", ASCENDING)], name="status"),
        # TTL: keep run logs for SCRAPE_RUNS_TTL_DAYS, then drop.
        IndexModel(
            [("started_at", ASCENDING)],
            expireAfterSeconds=SCRAPE_RUNS_TTL_DAYS * 24 * 60 * 60,
            name="ttl_started_at"
        ),
    ]
    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_SCRAPE_RUNS}")
    logger.info(f"  TTL: scrape_runs expire {SCRAPE_RUNS_TTL_DAYS}d after started_at")


def setup_oneway_fare_indexes(db):
    """
    Create indexes for the oneway_fares collection.

    leg_key_unique serves BOTH the write path (it makes bulk_upsert_grids'
    upsert race-safe) and the only read path, frontend/lib/fareGrids.ts, which
    looks grids up by a `leg_key: {$in: [...]}` for the trip-stretch bubble.
    """
    collection = db[COLLECTION_ONEWAY_FARES]

    indexes = [
        IndexModel([("leg_key", ASCENDING)], unique=True, name="leg_key_unique"),
        # TTL: grids not refreshed (route disabled/removed) age out.
        IndexModel(
            [("scraped_at", ASCENDING)],
            expireAfterSeconds=ONEWAY_FARES_TTL_DAYS * 24 * 60 * 60,
            name="ttl_scraped_at"
        ),
    ]
    collection.create_indexes(indexes)
    logger.info(f"Created {len(indexes)} indexes for {COLLECTION_ONEWAY_FARES}")
    logger.info(f"  TTL: oneway_fares expire {ONEWAY_FARES_TTL_DAYS}d after scraped_at")


def setup_all_indexes():
    """Create all indexes for all collections."""
    logger.info("=" * 60)
    logger.info("Setting up MongoDB indexes (v2)...")
    logger.info("=" * 60)

    db = get_database()
    logger.info(f"Connected to database: {db.name}")

    steps = [
        ("users",          setup_user_indexes),
        ("availability",   setup_availability_indexes),
        ("friendships",    setup_friendship_indexes),
        ("groups",         setup_group_indexes),
        ("flights",        setup_flight_indexes),
        ("scrape_targets", setup_scrape_target_indexes),
        ("scrape_runs",    setup_scrape_run_indexes),
        ("oneway_fares",   setup_oneway_fare_indexes),
    ]
    failures = []
    for name, fn in steps:
        try:
            fn(db)
        except OperationFailure as e:
            # Most common: an existing index already covers the same keys but
            # has a different name. Log and continue — not fatal.
            logger.warning(f"[{name}] skipped — {e}")
            failures.append((name, str(e)))
        except Exception as e:
            logger.error(f"[{name}] error — {e}")
            failures.append((name, str(e)))

    logger.info("=" * 60)
    if failures:
        logger.warning(f"Completed with {len(failures)} skipped/failed collections")
        for name, msg in failures:
            logger.warning(f"  {name}: {msg[:100]}")
    else:
        logger.info("All indexes created successfully!")
    logger.info("=" * 60)
    return not failures


def list_all_indexes():
    """List all indexes in all collections."""
    db = get_database()

    collections = [
        COLLECTION_USERS,
        COLLECTION_AVAILABILITY,
        COLLECTION_FRIENDSHIPS,
        COLLECTION_GROUPS,
        COLLECTION_FLIGHTS,
        COLLECTION_SCRAPE_TARGETS,
        COLLECTION_SCRAPE_RUNS,
        COLLECTION_ONEWAY_FARES,
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
        COLLECTION_FRIENDSHIPS,
        COLLECTION_GROUPS,
        COLLECTION_FLIGHTS,
        COLLECTION_SCRAPE_TARGETS,
        COLLECTION_SCRAPE_RUNS,
        COLLECTION_ONEWAY_FARES,
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
