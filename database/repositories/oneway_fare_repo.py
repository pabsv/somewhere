"""
OnewayFareRepository — one-way leg fare grids (open-jaw foundation).

One doc per directed leg, keyed by leg_key ("EIN-BCN"). The prices grid is
replaced wholesale on every upsert; first_seen_at is preserved on updates.

Future open-jaw read path (not built yet) is two point lookups plus an
in-memory date join with the nights constraint:
  - origin-side:      find_by_leg("EIN", "BCN") x find_by_leg("BCN", "AMS")
  - destination-side: find_by_leg("EIN", "BCN") x find_by_leg("MAD", "EIN")
"""

from datetime import datetime
from typing import Optional

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

    def find_by_leg(self, origin: str, destination: str) -> Optional[OnewayFareModel]:
        """Get the fare grid for one directed leg."""
        doc = self.collection.find_one({"leg_key": f"{origin}-{destination}"})
        return OnewayFareModel.from_dict(doc) if doc else None

    def find_by_origin(self, origin: str) -> list[OnewayFareModel]:
        """All legs departing from an airport."""
        return [OnewayFareModel.from_dict(d) for d in self.collection.find({"origin": origin})]

    def find_by_destination(self, destination: str) -> list[OnewayFareModel]:
        """All legs arriving at an airport."""
        return [OnewayFareModel.from_dict(d) for d in self.collection.find({"destination": destination})]

    def count_total(self) -> int:
        """Total number of leg grids stored."""
        return self.collection.count_documents({})
