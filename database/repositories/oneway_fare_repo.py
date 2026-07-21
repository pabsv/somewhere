"""
OnewayFareRepository — one-way leg fare grids.

One doc per directed leg, keyed by leg_key ("EIN-BCN"). The prices grid is
replaced wholesale on every upsert; first_seen_at is preserved on updates.

Grids are a free by-product of the Phase-1 one-way sweeps that round-trip pair
ranking already runs (scraper-fli/scraper.py) — persisting them costs no extra
HTTP calls. WRITE-ONLY from Python: the read path lives in the frontend
(frontend/lib/fareGrids.ts), which prices the `~` estimate rows of the calendar
trip-stretch bubble as the sum of a route's two grids.
"""

from datetime import datetime

from pymongo import UpdateOne

from ..connection import get_collection
from ..config import COLLECTION_ONEWAY_FARES
from ..models.oneway_fare import OnewayFareModel


class OnewayFareRepository:
    def __init__(self):
        self.collection = get_collection(COLLECTION_ONEWAY_FARES)

    def bulk_upsert_grids(self, fares: list[OnewayFareModel]) -> dict:
        """
        Wholesale-replace each leg's fare grid.

        Returns:
            {"new": X, "updated": Y}
        """
        if not fares:
            return {"new": 0, "updated": 0}

        now = datetime.utcnow()
        ops = []
        for fare in fares:
            ops.append(UpdateOne(
                {"leg_key": fare.leg_key},
                {
                    "$set": {
                        "leg_key": fare.leg_key,
                        "origin": fare.origin,
                        "destination": fare.destination,
                        "currency": fare.currency,
                        "prices": fare.prices,
                        "price_count": len(fare.prices),
                        "min_price": min(fare.prices.values()) if fare.prices else None,
                        "scraped_at": now,
                    },
                    "$setOnInsert": {"first_seen_at": now},
                },
                upsert=True,
            ))

        result = self.collection.bulk_write(ops, ordered=False)
        return {
            "new": result.upserted_count,
            "updated": result.modified_count,
        }
