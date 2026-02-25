"""
Schedule state repository.

One document per origin airport, upserted on each run.
Tracks status, last result, and estimated next run time.
"""

from datetime import datetime
from typing import Optional

from ..connection import get_collection
from ..config import COLLECTION_SCHEDULE_STATE


class ScheduleRepository:
    def __init__(self):
        self.collection = get_collection(COLLECTION_SCHEDULE_STATE)

    def upsert_state(self, origin: str, **kwargs) -> None:
        """Insert or update schedule state for an origin."""
        self.collection.update_one(
            {"origin": origin},
            {"$set": {"origin": origin, **kwargs}},
            upsert=True,
        )

    def get_all(self) -> list[dict]:
        """Return state for all origins, sorted by origin code."""
        docs = list(self.collection.find({}, {"_id": 0}).sort("origin", 1))
        # Serialize datetimes to ISO strings for JSON compatibility
        for doc in docs:
            for key in ("last_run_at", "finished_at", "next_run_at"):
                if isinstance(doc.get(key), datetime):
                    doc[key] = doc[key].isoformat() + "Z"  # mark as UTC so JS parses correctly
        return docs

    def get_state(self, origin: str) -> Optional[dict]:
        """Return state for a single origin."""
        return self.collection.find_one({"origin": origin}, {"_id": 0})

    def clear(self) -> None:
        """Remove all schedule state (e.g. after changing the origin list)."""
        self.collection.delete_many({})
