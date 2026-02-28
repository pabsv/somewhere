"""
Flight repository with upsert logic and deal queries.
"""

from datetime import datetime
from typing import Optional
from bson import ObjectId

from ..connection import get_collection
from ..config import COLLECTION_FLIGHTS
from ..models.flight import FlightModel


class FlightRepository:
    """Repository for Flight CRUD operations."""

    def __init__(self):
        self.collection = get_collection(COLLECTION_FLIGHTS)

    # Create / Upsert
    def upsert(self, flight: FlightModel) -> tuple[FlightModel, bool]:
        """
        Insert or update a flight based on flight_key.

        Args:
            flight: FlightModel to insert/update

        Returns:
            Tuple of (FlightModel, is_new) where is_new indicates if it was inserted
        """
        now = datetime.utcnow()
        flight.last_seen_at = now
        flight.scraped_at = now

        # Try to find existing flight
        existing = self.find_by_flight_key(flight.flight_key)

        if existing:
            # Update existing - preserve first_seen_at
            flight.first_seen_at = existing.first_seen_at
            flight._id = existing._id

            self.collection.update_one(
                {"flight_key": flight.flight_key},
                {"$set": flight.to_dict()}
            )
            return flight, False
        else:
            # Insert new
            flight.first_seen_at = now
            result = self.collection.insert_one(flight.to_dict())
            flight._id = result.inserted_id
            return flight, True

    def upsert_many(self, flights: list[FlightModel]) -> dict:
        """
        Upsert multiple flights.

        Returns:
            Dict with counts: {"new": X, "updated": Y}
        """
        new_count = 0
        updated_count = 0

        for flight in flights:
            _, is_new = self.upsert(flight)
            if is_new:
                new_count += 1
            else:
                updated_count += 1

        return {"new": new_count, "updated": updated_count}

    def bulk_upsert(self, flights: list[FlightModel]) -> dict:
        """
        Upsert many flights in a single bulk_write call.
        Uses $setOnInsert for first_seen_at so it is only written on insert.

        Returns:
            Dict with counts: {"new": X, "updated": Y}
        """
        from pymongo import UpdateOne
        if not flights:
            return {"new": 0, "updated": 0}

        now = datetime.utcnow()
        ops = []
        for flight in flights:
            flight.last_seen_at = now
            flight.scraped_at = now
            doc = flight.to_dict()
            doc.pop("first_seen_at", None)  # handled by $setOnInsert below
            ops.append(UpdateOne(
                {"flight_key": flight.flight_key},
                {
                    "$set": doc,
                    "$setOnInsert": {"first_seen_at": now},
                },
                upsert=True,
            ))

        result = self.collection.bulk_write(ops, ordered=False)
        new_count = result.upserted_count
        return {"new": new_count, "updated": len(ops) - new_count}

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

    def find_deals(
        self,
        min_score: int = 50,
        origin: Optional[str] = None,
        destination: Optional[str] = None,
        limit: int = 50
    ) -> list[FlightModel]:
        """
        Find flights marked as deals.

        Args:
            min_score: Minimum deal score (0-100)
            origin: Optional origin filter
            destination: Optional destination filter
            limit: Max results
        """
        query = {
            "is_deal": True,
            "deal_score": {"$gte": min_score}
        }
        if origin:
            query["origin"] = origin.upper()
        if destination:
            query["destination"] = destination.upper()

        docs = self.collection.find(query).sort("deal_score", -1).limit(limit)
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
        cutoff = datetime.utcnow().replace(
            hour=datetime.utcnow().hour - hours
        )
        docs = self.collection.find({
            "scraped_at": {"$gte": cutoff}
        }).sort("scraped_at", -1).limit(limit)
        return [FlightModel.from_dict(doc) for doc in docs]

    # Update
    def update(self, flight: FlightModel) -> bool:
        """Update an existing flight."""
        if not flight._id:
            return False

        result = self.collection.update_one(
            {"_id": flight._id},
            {"$set": flight.to_dict()}
        )
        return result.modified_count > 0

    def update_deal_status(
        self,
        flight_key: str,
        is_deal: bool,
        deal_score: int
    ) -> bool:
        """Update a flight's deal status."""
        result = self.collection.update_one(
            {"flight_key": flight_key},
            {
                "$set": {
                    "is_deal": is_deal,
                    "deal_score": deal_score
                }
            }
        )
        return result.modified_count > 0

    def update_price_stats(
        self,
        flight_key: str,
        lowest: float,
        highest: float,
        average: float,
        current_vs_avg_percent: float
    ) -> bool:
        """Update a flight's price statistics."""
        result = self.collection.update_one(
            {"flight_key": flight_key},
            {
                "$set": {
                    "price_stats.lowest": lowest,
                    "price_stats.highest": highest,
                    "price_stats.average": average,
                    "price_stats.current_vs_avg_percent": current_vs_avg_percent
                }
            }
        )
        return result.modified_count > 0

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

    def count_deals(self) -> int:
        """Count flights marked as deals."""
        return self.collection.count_documents({"is_deal": True})

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
