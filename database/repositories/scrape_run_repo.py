"""
ScrapeRunRepository — append-only log of scrape executions.

One document per route execution. TTL'd by setup_indexes.py.
Useful for: per-route success rates, latency distribution, debugging.
"""

from datetime import datetime, timedelta
from typing import Optional

from ..connection import get_collection
from ..config import COLLECTION_SCRAPE_RUNS
from ..models.scrape_run import ScrapeRunModel


class ScrapeRunRepository:
    def __init__(self):
        self.collection = get_collection(COLLECTION_SCRAPE_RUNS)

    def start(self, origin: str, destination: str, tier: str) -> str:
        """Insert a 'running' record. Returns the inserted _id as str."""
        run = ScrapeRunModel(
            origin=origin,
            destination=destination,
            tier=tier,
            started_at=datetime.utcnow(),
        )
        result = self.collection.insert_one(run.to_dict())
        return str(result.inserted_id)

    def finish(
        self,
        run_id: str,
        status: str,
        flight_count: int,
        api_calls: int,
        cheapest_price: Optional[float] = None,
        error_message: Optional[str] = None,
    ) -> None:
        from bson import ObjectId
        now = datetime.utcnow()
        doc = self.collection.find_one({"_id": ObjectId(run_id)}, {"started_at": 1})
        duration_seconds = None
        if doc and doc.get("started_at"):
            duration_seconds = (now - doc["started_at"]).total_seconds()

        self.collection.update_one(
            {"_id": ObjectId(run_id)},
            {"$set": {
                "finished_at": now,
                "status": status,
                "flight_count": flight_count,
                "api_calls": api_calls,
                "cheapest_price": cheapest_price,
                "error_message": error_message,
                "duration_seconds": duration_seconds,
            }},
        )

    def recent(self, limit: int = 50) -> list[dict]:
        """Most recent runs, newest first."""
        docs = list(self.collection.find({}, {"_id": 0}).sort("started_at", -1).limit(limit))
        for d in docs:
            for k in ("started_at", "finished_at"):
                if isinstance(d.get(k), datetime):
                    d[k] = d[k].isoformat() + "Z"
        return docs

    def stats_last_24h(self) -> dict:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        match = {"started_at": {"$gte": cutoff}}
        pipeline = [
            {"$match": match},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "avg_duration": {"$avg": "$duration_seconds"},
                "total_flights": {"$sum": "$flight_count"},
                "total_api_calls": {"$sum": "$api_calls"},
            }},
        ]
        by_status = {row["_id"]: row for row in self.collection.aggregate(pipeline)}
        return {
            "total_runs": self.collection.count_documents(match),
            "by_status": by_status,
        }
