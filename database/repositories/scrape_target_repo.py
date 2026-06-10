"""
ScrapeTargetRepository — manages the route pool.

Core operations:
  bulk_upsert_seed      — idempotent seed from scraper/targets.py
  claim_next_due        — atomically grab the next-due target for scraping
  record_run_result     — update tier-based next_due_at + success/error counters
  list_overdue          — diagnostic
  list_by_status        — diagnostic
"""

from datetime import datetime, timedelta
from typing import Optional

from pymongo import ReturnDocument, UpdateOne

from ..connection import get_collection
from ..config import (
    COLLECTION_SCRAPE_TARGETS,
    TIER_A_HOURS,
    TIER_B_HOURS,
    TIER_C_HOURS,
    ROUTE_MAX_CONSECUTIVE_FAILURES,
)
from ..models.scrape_target import ScrapeTargetModel


TIER_HOURS = {"A": TIER_A_HOURS, "B": TIER_B_HOURS, "C": TIER_C_HOURS}


class ScrapeTargetRepository:
    def __init__(self):
        self.collection = get_collection(COLLECTION_SCRAPE_TARGETS)

    # ── Seed / config ────────────────────────────────────────────────────

    def bulk_upsert_seed(self, routes: list[tuple[str, str, str]], stagger_minutes: int = 0) -> dict:
        """
        Seed `scrape_targets` from a list of (origin, destination, tier) tuples.

        Idempotent:
          - New routes are inserted with next_due_at = now + stagger.
          - Existing routes keep their schedule state; only `tier` is refreshed.

        Args:
            routes: list of (origin, destination, tier) tuples.
            stagger_minutes: spread initial next_due_at across this window so
                             the first day after seeding doesn't stampede.

        Returns:
            {"new": X, "tier_updated": Y, "unchanged": Z}
        """
        if not routes:
            return {"new": 0, "tier_updated": 0, "unchanged": 0}

        now = datetime.utcnow()
        ops = []
        # Round-robin assign offsets across the stagger window so seeds are
        # spread evenly, not all at minute 0.
        step = stagger_minutes / max(len(routes), 1)
        for i, (origin, destination, tier) in enumerate(routes):
            route_key = f"{origin}-{destination}"
            offset = timedelta(minutes=i * step) if stagger_minutes > 0 else timedelta(0)
            ops.append(UpdateOne(
                {"route_key": route_key},
                {
                    "$set": {
                        "tier": tier,
                        "updated_at": now,
                    },
                    "$setOnInsert": {
                        "route_key": route_key,
                        "origin": origin,
                        "destination": destination,
                        "enabled": True,
                        "last_scraped_at": None,
                        "next_due_at": now + offset,
                        "last_status": None,
                        "last_error": None,
                        "last_flight_count": 0,
                        "total_runs": 0,
                        "success_runs": 0,
                        "empty_runs": 0,
                        "error_runs": 0,
                        "consecutive_failures": 0,
                        "avg_price": None,
                        "price_p50_ewma": None,
                        "min_price_seen": None,
                        "created_at": now,
                    },
                },
                upsert=True,
            ))

        result = self.collection.bulk_write(ops, ordered=False)
        return {
            "new": result.upserted_count,
            "tier_updated": result.modified_count,
            "unchanged": len(ops) - result.upserted_count - result.modified_count,
        }

    # ── Scheduling ───────────────────────────────────────────────────────

    def claim_next_due(self, now: Optional[datetime] = None) -> Optional[ScrapeTargetModel]:
        """
        Atomically claim the next-due enabled target.

        Marks it as 'running' by pushing next_due_at into the future (1 hour)
        so a concurrent worker doesn't pick the same route. The actual
        next_due_at is rewritten by record_run_result() once the job ends.

        Returns None if no target is currently due.
        """
        now = now or datetime.utcnow()
        # Push lock 1h ahead — long enough for any single-route scrape.
        lock_until = now + timedelta(hours=1)

        doc = self.collection.find_one_and_update(
            {
                "enabled": True,
                "next_due_at": {"$lte": now},
            },
            {
                "$set": {"next_due_at": lock_until, "last_status": "running"},
            },
            sort=[("next_due_at", 1)],  # oldest-due first
            return_document=ReturnDocument.AFTER,
        )
        if not doc:
            return None
        return ScrapeTargetModel.from_dict(doc)

    def record_run_result(
        self,
        route_key: str,
        status: str,
        flight_count: int,
        cheapest_price: Optional[float],
        median_price: Optional[float] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Finalize a target after a scrape attempt.

        Computes next_due_at from tier cadence, updates rolling counters,
        and auto-disables if too many consecutive failures.

        Price baselines (both EWMA, alpha=0.3):
          avg_price      — EWMA of the CHEAPEST price per run (kept for compat)
          price_p50_ewma — EWMA of the MEDIAN price per run (scoring baseline)
        Plus min_price_seen — all-time low for the route.
        """
        now = datetime.utcnow()
        existing = self.collection.find_one({"route_key": route_key})
        if not existing:
            return

        tier = existing.get("tier", "C")
        cadence_hours = TIER_HOURS.get(tier, TIER_C_HOURS)
        next_due = now + timedelta(hours=cadence_hours)

        update = {
            "$set": {
                "last_scraped_at": now,
                "next_due_at": next_due,
                "last_status": status,
                "last_error": error_message,
                "last_flight_count": flight_count,
                "updated_at": now,
            },
            "$inc": {"total_runs": 1},
        }

        if status == "success":
            update["$inc"]["success_runs"] = 1
            update["$set"]["consecutive_failures"] = 0
        elif status == "empty":
            update["$inc"]["empty_runs"] = 1
            update["$inc"]["consecutive_failures"] = 1
        elif status == "error":
            update["$inc"]["error_runs"] = 1
            update["$inc"]["consecutive_failures"] = 1

        # Rolling cheapest-per-run price — exponential decay (alpha=0.3).
        if cheapest_price is not None and cheapest_price > 0:
            prev_avg = existing.get("avg_price")
            new_avg = cheapest_price if prev_avg is None else 0.7 * prev_avg + 0.3 * cheapest_price
            update["$set"]["avg_price"] = round(new_avg, 2)

            prev_min = existing.get("min_price_seen")
            if prev_min is None or cheapest_price < prev_min:
                update["$set"]["min_price_seen"] = cheapest_price

        # Rolling median-per-run price — exponential decay (alpha=0.3).
        if median_price is not None and median_price > 0:
            prev_p50 = existing.get("price_p50_ewma")
            new_p50 = median_price if prev_p50 is None else 0.7 * prev_p50 + 0.3 * median_price
            update["$set"]["price_p50_ewma"] = round(new_p50, 2)

        self.collection.update_one({"route_key": route_key}, update)

        # Auto-disable after too many consecutive failures.
        fresh = self.collection.find_one({"route_key": route_key})
        if fresh and fresh.get("consecutive_failures", 0) >= ROUTE_MAX_CONSECUTIVE_FAILURES:
            self.collection.update_one(
                {"route_key": route_key},
                {"$set": {"enabled": False, "last_error": "auto-disabled: too many failures"}},
            )

    # ── Diagnostics ──────────────────────────────────────────────────────

    def count(self, **filt) -> int:
        return self.collection.count_documents(filt)

    def list_overdue(self, limit: int = 50) -> list[ScrapeTargetModel]:
        now = datetime.utcnow()
        docs = self.collection.find(
            {"enabled": True, "next_due_at": {"$lte": now}}
        ).sort("next_due_at", 1).limit(limit)
        return [ScrapeTargetModel.from_dict(d) for d in docs]

    def list_by_tier(self, tier: str, limit: int = 50) -> list[ScrapeTargetModel]:
        docs = self.collection.find({"tier": tier}).limit(limit)
        return [ScrapeTargetModel.from_dict(d) for d in docs]

    def find_by_route(self, origin: str, destination: str) -> Optional[ScrapeTargetModel]:
        doc = self.collection.find_one({"route_key": f"{origin}-{destination}"})
        return ScrapeTargetModel.from_dict(doc) if doc else None

    def reenable_all(self) -> int:
        result = self.collection.update_many(
            {"enabled": False},
            {"$set": {"enabled": True, "consecutive_failures": 0, "last_error": None}},
        )
        return result.modified_count

    def stats(self) -> dict:
        total = self.collection.count_documents({})
        if total == 0:
            return {"total": 0}
        return {
            "total": total,
            "enabled": self.collection.count_documents({"enabled": True}),
            "disabled": self.collection.count_documents({"enabled": False}),
            "by_tier": {
                t: self.collection.count_documents({"tier": t})
                for t in ("A", "B", "C")
            },
            "overdue": self.collection.count_documents({
                "enabled": True,
                "next_due_at": {"$lte": datetime.utcnow()},
            }),
            "never_scraped": self.collection.count_documents({"last_scraped_at": None}),
        }
