"""
Price history repository with aggregation queries.
"""

from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId

from ..connection import get_collection
from ..config import COLLECTION_PRICE_HISTORY
from ..models.price_history import PriceHistory


class PriceHistoryRepository:
    """Repository for PriceHistory operations."""

    def __init__(self):
        self.collection = get_collection(COLLECTION_PRICE_HISTORY)

    # Create
    def record(self, flight_key: str, route_key: str, price: float) -> PriceHistory:
        """
        Record a price snapshot.

        Args:
            flight_key: Unique flight identifier
            route_key: Route identifier (e.g., "EIN-BCN")
            price: Current price

        Returns:
            Created PriceHistory object
        """
        history = PriceHistory(
            flight_key=flight_key,
            route_key=route_key,
            price=price,
        )

        result = self.collection.insert_one(history.to_dict())
        history._id = result.inserted_id

        return history

    def record_many(self, records: list[tuple[str, str, float]]) -> int:
        """
        Record multiple price snapshots at once.

        Args:
            records: List of (flight_key, route_key, price) tuples

        Returns:
            Number of records inserted
        """
        if not records:
            return 0

        now = datetime.utcnow()
        docs = [
            {
                "flight_key": flight_key,
                "route_key": route_key,
                "price": price,
                "scraped_at": now,
            }
            for flight_key, route_key, price in records
        ]

        result = self.collection.insert_many(docs)
        return len(result.inserted_ids)

    # Read
    def find_by_flight_key(
        self,
        flight_key: str,
        limit: int = 100
    ) -> list[PriceHistory]:
        """Find price history for a specific flight."""
        docs = self.collection.find(
            {"flight_key": flight_key}
        ).sort("scraped_at", -1).limit(limit)
        return [PriceHistory.from_dict(doc) for doc in docs]

    def find_by_route(
        self,
        route_key: str,
        days: int = 30,
        limit: int = 1000
    ) -> list[PriceHistory]:
        """Find price history for a route within last X days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        docs = self.collection.find({
            "route_key": route_key,
            "scraped_at": {"$gte": cutoff}
        }).sort("scraped_at", -1).limit(limit)
        return [PriceHistory.from_dict(doc) for doc in docs]

    # Aggregations
    def get_route_average(self, route_key: str, days: int = 90) -> Optional[float]:
        """Calculate average price for a route over last X days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        pipeline = [
            {
                "$match": {
                    "route_key": route_key,
                    "scraped_at": {"$gte": cutoff}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "average": {"$avg": "$price"}
                }
            }
        ]
        result = list(self.collection.aggregate(pipeline))
        return result[0]["average"] if result else None

    def get_route_stats(self, route_key: str, days: int = 90) -> dict:
        """Get comprehensive stats for a route."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        pipeline = [
            {
                "$match": {
                    "route_key": route_key,
                    "scraped_at": {"$gte": cutoff}
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

    def get_monthly_averages(self, route_key: str) -> dict:
        """
        Get monthly average prices for a route.

        Returns:
            Dict of {"YYYY-MM": average_price}
        """
        pipeline = [
            {"$match": {"route_key": route_key}},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$scraped_at"},
                        "month": {"$month": "$scraped_at"}
                    },
                    "average": {"$avg": "$price"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]
        result = self.collection.aggregate(pipeline)

        monthly = {}
        for doc in result:
            year = doc["_id"]["year"]
            month = doc["_id"]["month"]
            key = f"{year:04d}-{month:02d}"
            monthly[key] = doc["average"]

        return monthly

    def get_price_trend(
        self,
        route_key: str,
        days: int = 7
    ) -> list[dict]:
        """
        Get daily price trend for a route.

        Returns:
            List of {"date": "YYYY-MM-DD", "avg_price": X, "min_price": Y, "max_price": Z}
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        pipeline = [
            {
                "$match": {
                    "route_key": route_key,
                    "scraped_at": {"$gte": cutoff}
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$scraped_at"},
                        "month": {"$month": "$scraped_at"},
                        "day": {"$dayOfMonth": "$scraped_at"}
                    },
                    "avg_price": {"$avg": "$price"},
                    "min_price": {"$min": "$price"},
                    "max_price": {"$max": "$price"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
        ]
        result = self.collection.aggregate(pipeline)

        trend = []
        for doc in result:
            date_str = f"{doc['_id']['year']:04d}-{doc['_id']['month']:02d}-{doc['_id']['day']:02d}"
            trend.append({
                "date": date_str,
                "avg_price": round(doc["avg_price"], 2),
                "min_price": round(doc["min_price"], 2),
                "max_price": round(doc["max_price"], 2),
                "samples": doc["count"]
            })

        return trend

    def detect_price_drop(
        self,
        flight_key: str,
        current_price: float,
        hours: int = 24
    ) -> Optional[dict]:
        """
        Detect if there's been a significant price drop.

        Returns:
            Dict with previous price and drop percentage, or None if no significant drop
        """
        cutoff = datetime.utcnow() - timedelta(hours=hours)

        # Get most recent price before cutoff
        doc = self.collection.find_one(
            {
                "flight_key": flight_key,
                "scraped_at": {"$lt": cutoff}
            },
            sort=[("scraped_at", -1)]
        )

        if not doc:
            return None

        previous_price = doc["price"]
        if previous_price <= current_price:
            return None  # No drop

        drop_percent = ((previous_price - current_price) / previous_price) * 100

        return {
            "previous_price": previous_price,
            "current_price": current_price,
            "drop_amount": previous_price - current_price,
            "drop_percent": round(drop_percent, 1),
            "previous_seen_at": doc["scraped_at"]
        }

    # Cleanup
    def delete_old_records(self, days: int = 180) -> int:
        """Delete records older than X days. Returns count deleted."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = self.collection.delete_many({"scraped_at": {"$lt": cutoff}})
        return result.deleted_count

    # Stats
    def count_by_route(self, route_key: str) -> int:
        """Count price history records for a route."""
        return self.collection.count_documents({"route_key": route_key})

    def count_total(self) -> int:
        """Count all price history records."""
        return self.collection.count_documents({})
