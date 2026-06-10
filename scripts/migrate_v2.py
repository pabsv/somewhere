"""
v2 migration — DESIGN_V1.md section B item 8.

Idempotent — safe to re-run at any time:
  1. Drops legacy collections: flights, price_history, route_stats,
     destination_preferences, schedule_state (drop() is a no-op if missing).
  2. users: role="admin" on the pablo user (email contains "pablove"),
     role="user" on any user missing a role.
  3. scrape_targets: seeds price_p50_ewma = avg_price * 1.3 where avg_price
     exists and price_p50_ewma is missing/null.
  4. Prints a summary of every action.

Usage:
    python -m scripts.migrate_v2
"""

import logging
import os
import sys

# Project root on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("migrate_v2")

COLLECTIONS_TO_DROP = [
    "flights",
    "price_history",
    "route_stats",
    "destination_preferences",
    "schedule_state",
]


def drop_legacy_collections(db, summary):
    existing = set(db.list_collection_names())
    for name in COLLECTIONS_TO_DROP:
        if name in existing:
            count = db[name].estimated_document_count()
            db[name].drop()
            logger.info(f"Dropped collection '{name}' (~{count} docs)")
            summary.append(f"dropped '{name}' (~{count} docs)")
        else:
            db[name].drop()  # idempotent no-op, keeps behaviour explicit
            logger.info(f"Collection '{name}' not present — nothing to drop")
            summary.append(f"'{name}' already absent")


def migrate_user_roles(db, summary):
    users = db["users"]

    res_admin = users.update_many(
        {"email": {"$regex": "pablove", "$options": "i"}},
        {"$set": {"role": "admin"}},
    )
    logger.info(
        f"users: admin role — matched {res_admin.matched_count}, "
        f"modified {res_admin.modified_count}"
    )
    summary.append(
        f"users: role='admin' set on {res_admin.matched_count} pablove user(s) "
        f"({res_admin.modified_count} modified)"
    )
    if res_admin.matched_count == 0:
        logger.warning("users: no user with email containing 'pablove' found")

    res_default = users.update_many(
        {"$or": [{"role": {"$exists": False}}, {"role": None}]},
        {"$set": {"role": "user"}},
    )
    logger.info(
        f"users: default role — matched {res_default.matched_count}, "
        f"modified {res_default.modified_count}"
    )
    summary.append(
        f"users: role='user' defaulted on {res_default.modified_count} user(s)"
    )


def seed_price_p50_ewma(db, summary):
    targets = db["scrape_targets"]
    query = {
        "avg_price": {"$ne": None, "$exists": True},
        "$or": [{"price_p50_ewma": {"$exists": False}}, {"price_p50_ewma": None}],
    }
    # Aggregation-pipeline update so the new value derives from avg_price
    res = targets.update_many(
        query,
        [{"$set": {"price_p50_ewma": {"$multiply": ["$avg_price", 1.3]}}}],
    )
    logger.info(
        f"scrape_targets: seeded price_p50_ewma = avg_price * 1.3 on "
        f"{res.modified_count} target(s) (matched {res.matched_count})"
    )
    summary.append(
        f"scrape_targets: price_p50_ewma seeded on {res.modified_count} target(s)"
    )


def main():
    db = get_database()
    summary = []

    logger.info("=== migrate_v2 start ===")

    # ── 1. Drop legacy collections ──────────────────────────────────────
    drop_legacy_collections(db, summary)

    # ── 2. User roles ───────────────────────────────────────────────────
    migrate_user_roles(db, summary)

    # ── 3. Seed price_p50_ewma baseline ─────────────────────────────────
    seed_price_p50_ewma(db, summary)

    # ── 4. Summary ──────────────────────────────────────────────────────
    logger.info("=== migrate_v2 summary ===")
    for line in summary:
        print(f"  - {line}")
    logger.info("=== migrate_v2 done ===")


if __name__ == "__main__":
    main()
