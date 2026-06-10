"""
Flight repository — upsert and query logic for the flights collection.

v2: flight_key excludes price (one doc per itinerary date-pair), and
bulk_upsert maintains an embedded `price_points` array that appends only
when the stored price actually changes (capped at the last 20 points).
"""

from datetime import datetime
from typing import Optional
from bson import ObjectId

from pymongo import UpdateOne

from ..connection import get_collection
from ..config import COLLECTION_FLIGHTS
from ..models.flight import FlightModel

# Max number of price points retained per flight doc.
PRICE_POINTS_CAP = 20


class FlightRepository:
    """Repository for Flight CRUD operations."""

    def __init__(self):
        self.collection = get_collection(COLLECTION_FLIGHTS)

    # Create / Upsert
    def upsert(self, flight: FlightModel) -> dict:
        """Upsert a single flight. Returns {"new": 0|1, "updated": 0|1}."""
        return self.bulk_upsert([flight])

    def upsert_many(self, flights: list[FlightModel]) -> dict:
        """Alias for bulk_upsert. Returns {"new": X, "updated": Y}."""
        return self.bulk_upsert(flights)

    def bulk_upsert(self, flights: list[FlightModel]) -> dict:
        """
        Upsert many flights in a single bulk_write call.

        v2 semantics:
          1. The incoming batch is FIRST deduped by flight_key keeping the
             LOWEST price (fli returns duplicate itineraries for the same
             date-pair).
          2. Each op is an aggregation-pipeline update (list-of-stages) so
             `price_points` appends ONLY when the price changed, capped at
             the last PRICE_POINTS_CAP entries. New docs get their first
             price point on insert.
          3. `first_seen_at` is preserved on existing docs via $ifNull.

        Returns:
            Dict with counts: {"new": X, "updated": Y}
        """
        if not flights:
            return {"new": 0, "updated": 0}

        # 1. Dedupe the batch by flight_key, keeping the lowest price.
        best: dict[str, FlightModel] = {}
        for flight in flights:
            key = flight.flight_key
            if key not in best or flight.price < best[key].price:
                best[key] = flight

        now = datetime.utcnow()
        now_iso = now.isoformat(timespec="seconds") + "Z"

        ops = []
        for key, flight in best.items():
            flight.last_seen_at = now
            flight.scraped_at = now
            price = float(flight.price)

            scalar_fields = {
                "flight_key": key,
                "origin": flight.origin,
                "destination": flight.destination,
                "outbound_date": flight.outbound_date,
                "return_date": flight.return_date,
                "duration_days": flight.duration_days,
                "price": price,
                "currency": flight.currency,
                "airlines": flight.airlines,
                "outbound_departure": flight.outbound_departure,
                "outbound_arrival": flight.outbound_arrival,
                "return_departure": flight.return_departure,
                "return_arrival": flight.return_arrival,
                "outbound_duration": flight.outbound_duration,
                "return_duration": flight.return_duration,
                "outbound_stops": flight.outbound_stops,
                "return_stops": flight.return_stops,
                "search_link": flight.search_link,
                "source": flight.source,
            }
            # $literal-wrap plain values so strings can never be read as
            # field paths by the aggregation pipeline.
            set_stage = {k: {"$literal": v} for k, v in scalar_fields.items()}
            set_stage["last_seen_at"] = now
            set_stage["scraped_at"] = now
            set_stage["first_seen_at"] = {"$ifNull": ["$first_seen_at", now]}
            # Append {p, at} only when the last recorded price differs from
            # the new price. ($arrayElemAt on an empty array yields missing,
            # so brand-new docs always get their first point.)
            set_stage["price_points"] = {"$let": {
                "vars": {"pp": {"$ifNull": ["$price_points", []]}},
                "in": {"$cond": [
                    {"$eq": [
                        {"$arrayElemAt": [
                            {"$map": {"input": "$$pp", "as": "x", "in": "$$x.p"}},
                            -1,
                        ]},
                        price,
                    ]},
                    "$$pp",
                    {"$slice": [
                        {"$concatArrays": [
                            "$$pp",
                            [{"p": {"$literal": price}, "at": {"$literal": now_iso}}],
                        ]},
                        -PRICE_POINTS_CAP,
                    ]},
                ]},
            }}

            ops.append(UpdateOne(
                {"flight_key": key},
                [{"$set": set_stage}],  # aggregation-pipeline update
                upsert=True,
            ))

        result = self.collection.bulk_write(ops, ordered=False)
        return {"new": result.upserted_count, "updated": result.modified_count}

    # Read
    def find_by_id(self, flight_id: str) -> Optional[FlightModel]:
        """Find a flight by ID."""
        try:
            doc = self.collection.find_one({"_id": ObjectId(flight_id)})
            return FlightModel.from_dict(doc) if doc else None
        except Exception:
            return None

    def find_by_flight_key(self, flight_key: str) -> Optional[FlightModel]:
        """Find a flight by its unique key."""
        doc = self.collection.find_one({"flight_key": flight_key})
        return FlightModel.from_dict(doc) if doc else None

    def find_by_route(
        self,
        origin: str,
        destination: str,
        limit: int = 100
    ) -> list[FlightModel]:
        """Find flights by route."""
        docs = self.collection.find({
            "origin": origin.upper(),
            "destination": destination.upper()
        }).sort("price", 1).limit(limit)
        return [FlightModel.from_dict(doc) for doc in docs]

    def find_by_origin(self, origin: str, limit: int = 100) -> list[FlightModel]:
        """Find flights from an origin."""
        docs = self.collection.find({
            "origin": origin.upper()
        }).sort("price", 1).limit(limit)
        return [FlightModel.from_dict(doc) for doc in docs]

    def find_by_destination(self, destination: str, limit: int = 100) -> list[FlightModel]:
        """Find flights to a destination."""
        docs = self.collection.find({
            "destination": destination.upper()
        }).sort("price", 1).limit(limit)
        return [FlightModel.from_dict(doc) for doc in docs]

    def find_by_date_range(
        self,
        start_date: str,
        end_date: str,
        origin: Optional[str] = None,
        destination: Optional[str] = None,
        limit: int = 100
    ) -> list[FlightModel]:
        """
        Find flights within a date range.

        Args:
            start_date: Earliest outbound date (YYYY-MM-DD)
            end_date: Latest return date (YYYY-MM-DD)
            origin: Optional origin filter
            destination: Optional destination filter
            limit: Max results
        """
        query = {
            "outbound_date": {"$gte": start_date},
            "return_date": {"$lte": end_date}
        }
        if origin:
            query["origin"] = origin.upper()
        if destination:
            query["destination"] = destination.upper()

        docs = self.collection.find(query).sort("price", 1).limit(limit)
        return [FlightModel.from_dict(doc) for doc in docs]

    def find_under_price(
        self,
        max_price: float,
        origin: Optional[str] = None,
        destination: Optional[str] = None,
        direct_only: bool = False,
        limit: int = 100
    ) -> list[FlightModel]:
        """Find flights under a certain price."""
        query = {"price": {"$lte": max_price}}
        if origin:
            query["origin"] = origin.upper()
        if destination:
            query["destination"] = destination.upper()
        if direct_only:
            query["outbound_stops"] = 0
            query["return_stops"] = 0

        docs = self.collection.find(query).sort("price", 1).limit(limit)
        return [FlightModel.from_dict(doc) for doc in docs]

    def find_recent(self, hours: int = 24, limit: int = 100) -> list[FlightModel]:
        """Find recently scraped flights."""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        docs = self.collection.find({
            "scraped_at": {"$gte": cutoff}
        }).sort("scraped_at", -1).limit(limit)
        return [FlightModel.from_dict(doc) for doc in docs]

    # Delete
    def delete(self, flight_id: str) -> bool:
        """Delete a flight."""
        result = self.collection.delete_one({"_id": ObjectId(flight_id)})
        return result.deleted_count > 0

    def delete_old_flights(self, days: int = 90) -> int:
        """Delete flights not seen in X days. Returns count deleted."""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = self.collection.delete_many({"last_seen_at": {"$lt": cutoff}})
        return result.deleted_count

    # Stats & Aggregation
    def count_total(self) -> int:
        """Count all flights."""
        return self.collection.count_documents({})

    def get_cheapest_by_route(self, limit: int = 20) -> list[dict]:
        """Get cheapest flight per route."""
        pipeline = [
            {"$sort": {"price": 1}},
            {
                "$group": {
                    "_id": {"origin": "$origin", "destination": "$destination"},
                    "cheapest": {"$first": "$$ROOT"}
                }
            },
            {"$replaceRoot": {"newRoot": "$cheapest"}},
            {"$sort": {"price": 1}},
            {"$limit": limit}
        ]
        result = self.collection.aggregate(pipeline)
        return [FlightModel.from_dict(doc) for doc in result]

    def get_price_range_for_route(self, origin: str, destination: str) -> dict:
        """Get price range for a route."""
        pipeline = [
            {
                "$match": {
                    "origin": origin.upper(),
                    "destination": destination.upper()
                }
            },
            {
                "$group": {
                    "_id": None,
                    "min_price": {"$min": "$price"},
                    "max_price": {"$max": "$price"},
                    "avg_price": {"$avg": "$price"},
                    "count": {"$sum": 1}
                }
            }
        ]
        result = list(self.collection.aggregate(pipeline))
        if result:
            return {
                "min": result[0]["min_price"],
                "max": result[0]["max_price"],
                "avg": result[0]["avg_price"],
                "count": result[0]["count"]
            }
        return {"min": 0, "max": 0, "avg": 0, "count": 0}
