"""
Seed scrape_targets from scraper/targets.py.

Idempotent — safe to re-run after editing the target list:
  - New routes are inserted, schedules staggered across the next 24h.
  - Existing routes keep their schedule state; only `tier` is refreshed
    in case it changed in code.
  - Routes removed from targets.py are NOT deleted automatically;
    use --prune to disable orphans, or --prune-delete to drop them.

Usage:
    python -m scripts.seed_targets
    python -m scripts.seed_targets --stagger 1440   # spread initial dues over 24h
    python -m scripts.seed_targets --prune          # disable routes not in targets.py
    python -m scripts.seed_targets --prune-delete   # delete routes not in targets.py
    python -m scripts.seed_targets --stats          # print current stats and exit
"""

import argparse
import logging
import os
import sys

# Project root on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scraper.targets import expand_routes, summary
from database.repositories.scrape_target_repo import ScrapeTargetRepository
from database.connection import get_collection
from database.config import COLLECTION_SCRAPE_TARGETS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("seed_targets")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--stagger",
        type=int,
        default=1440,
        help="Spread initial next_due_at across N minutes (default 1440 = 24h)",
    )
    parser.add_argument(
        "--prune",
        action="store_true",
        help="Disable routes in DB that no longer appear in targets.py",
    )
    parser.add_argument(
        "--prune-delete",
        action="store_true",
        help="DELETE routes in DB that no longer appear in targets.py (irreversible)",
    )
    parser.add_argument("--stats", action="store_true", help="Print stats and exit.")
    args = parser.parse_args()

    repo = ScrapeTargetRepository()

    if args.stats:
        logger.info("Current scrape_targets stats:")
        import json
        print(json.dumps(repo.stats(), indent=2, default=str))
        return

    # ── Seed ────────────────────────────────────────────────────────────
    src_summary = summary()
    logger.info(f"Source targets.py: {src_summary}")

    routes = expand_routes()
    logger.info(f"Upserting {len(routes)} routes (stagger={args.stagger}min)...")
    result = repo.bulk_upsert_seed(routes, stagger_minutes=args.stagger)
    logger.info(f"Seed result: {result}")

    # ── Prune orphans ───────────────────────────────────────────────────
    if args.prune or args.prune_delete:
        wanted_keys = {f"{o}-{d}" for o, d, _ in routes}
        coll = get_collection(COLLECTION_SCRAPE_TARGETS)
        orphans = [
            doc["route_key"]
            for doc in coll.find({}, {"route_key": 1})
            if doc.get("route_key") not in wanted_keys
        ]
        logger.info(f"Found {len(orphans)} orphan routes in DB not in targets.py")
        if orphans:
            if args.prune_delete:
                res = coll.delete_many({"route_key": {"$in": orphans}})
                logger.warning(f"DELETED {res.deleted_count} orphan routes")
            else:
                res = coll.update_many(
                    {"route_key": {"$in": orphans}},
                    {"$set": {"enabled": False, "last_error": "orphan: not in targets.py"}},
                )
                logger.info(f"Disabled {res.modified_count} orphan routes")

    logger.info("Final stats:")
    import json
    print(json.dumps(repo.stats(), indent=2, default=str))


if __name__ == "__main__":
    main()
