"""
Route statistics repository with aggregation and update logic.
"""

from datetime import datetime
from typing import Optional
from bson import ObjectId

from ..connection import get_collection
from ..config import COLLECTION_ROUTE_STATS
from ..models.route_stats import RouteStats


class RouteStatsRepository:
    """Repository for RouteStats operations."""

    def __init__(self):
        self.collection = get_collection(COLLECTION_ROUTE_STATS)

    # Create / Upsert
    def upsert(self, stats: RouteStats) -> RouteStats:
        """
        Insert or update route statistics.

        Args:
            stats: RouteStats to insert/update

        Returns:
            Updated RouteStats
        """
        stats.last_updated = datetime.utcnow()

        result = self.collection.update_one(
            {"route_key": stats.route_key},
            {"$set": stats.to_dict()},
            upsert=True
        )

        if result.upserted_id:
            stats._id = result.upserted_id

        return stats

    def update_from_price(
        self,
        route_key: str,
        price: float,
        origin: str = "",
        destination: str = ""
    ) -> RouteStats:
        """
        Update route stats with a new price observation.

        This implements incremental averaging and updates min/max.

        Args:
            route_key: Route identifier
            price: New price observation
            origin: Origin airport code
            destination: Destination airport code

        Returns:
            Updated RouteStats
        """
        existing = self.find_by_route_key(route_key)

        if existing:
            # Update existing stats
            new_count = existing.sample_count + 1

            # Incremental average: new_avg = old_avg + (new_value - old_avg) / new_count
            new_avg = existing.average_price + (price - existing.average_price) / new_count

            # Update min/max
            new_min = min(existing.min_price_ever, price)
            new_max = max(existing.max_price_ever, price)

            # Update monthly average
            month_key = datetime.utcnow().strftime("%Y-%m")
            monthly = existing.monthly_averages.copy()

            if month_key in monthly:
                # Approximate update (not perfectly accurate but close enough)
                monthly[month_key] = (monthly[month_key] + price) / 2
            else:
                monthly[month_key] = price

            existing.average_price = new_avg
            existing.min_price_ever = new_min
            existing.max_price_ever = new_max
            existing.sample_count = new_count
            existing.monthly_averages = monthly

            return self.upsert(existing)
        else:
            # Create new stats
            month_key = datetime.utcnow().strftime("%Y-%m")
            stats = RouteStats(
                route_key=route_key,
                origin=origin or route_key.split("-")[0],
                destination=destination or route_key.split("-")[1] if len(route_key.split("-")) > 1 else "",
                average_price=price,
                min_price_ever=price,
                max_price_ever=price,
                sample_count=1,
                monthly_averages={month_key: price}
            )
            return self.upsert(stats)

    def bulk_update_from_prices(self, prices: list[tuple[str, float]]) -> int:
        """
        Update route stats with multiple price observations.

        Args:
            prices: List of (route_key, price) tuples

        Returns:
            Number of routes updated
        """
        updated = 0
        for route_key, price in prices:
            self.update_from_price(route_key, price)
            updated += 1
        return updated

    def fetch_many(self, route_keys: list[str]) -> dict:
        """
        Fetch route stats for multiple route keys in one query.

        Returns:
            Dict of {route_key: RouteStats}
        """
        docs = self.collection.find({"route_key": {"$in": route_keys}})
        return {doc["route_key"]: RouteStats.from_dict(doc) for doc in docs}

    def bulk_upsert_many(self, stats_list: list[RouteStats]) -> None:
        """
        Save multiple RouteStats in a single bulk_write call.
        """
        from pymongo import UpdateOne
        if not stats_list:
            return

        now = datetime.utcnow()
        ops = []
        for s in stats_list:
            s.last_updated = now
            ops.append(UpdateOne(
                {"route_key": s.route_key},
                {"$set": s.to_dict()},
                upsert=True,
            ))
        self.collection.bulk_write(ops, ordered=False)

    # Read
    def find_by_id(self, stats_id: str) -> Optional[RouteStats]:
        """Find route stats by ID."""
        try:
            doc = self.collection.find_one({"_id": ObjectId(stats_id)})
            return RouteStats.from_dict(doc) if doc else None
        except Exception:
            return None

    def find_by_route_key(self, route_key: str) -> Optional[RouteStats]:
        """Find route stats by route key."""
        doc = self.collection.find_one({"route_key": route_key})
        return RouteStats.from_dict(doc) if doc else None

    def find_by_origin(self, origin: str) -> list[RouteStats]:
        """Find all route stats from an origin."""
        docs = self.collection.find({"origin": origin.upper()})
        return [RouteStats.from_dict(doc) for doc in docs]

    def find_by_destination(self, destination: str) -> list[RouteStats]:
        """Find all route stats to a destination."""
        docs = self.collection.find({"destination": destination.upper()})
        return [RouteStats.from_dict(doc) for doc in docs]

    def find_all(self, limit: int = 100) -> list[RouteStats]:
        """Find all route stats."""
        docs = self.collection.find().sort("average_price", 1).limit(limit)
        return [RouteStats.from_dict(doc) for doc in docs]

    def get_cheapest_routes(self, limit: int = 20) -> list[RouteStats]:
        """Get routes with lowest average prices."""
        docs = self.collection.find(
            {"sample_count": {"$gte": 10}}  # Only routes with enough data
        ).sort("average_price", 1).limit(limit)
        return [RouteStats.from_dict(doc) for doc in docs]

    def get_routes_with_deals(
        self,
        current_prices: dict,
        threshold_percent: float = 20.0
    ) -> list[tuple[RouteStats, float]]:
        """
        Find routes where current price is significantly below average.

        Args:
            current_prices: Dict of {route_key: current_price}
            threshold_percent: Consider a deal if X% below average

        Returns:
            List of (RouteStats, percent_below) tuples
        """
        deals = []
        for route_key, current_price in current_prices.items():
            stats = self.find_by_route_key(route_key)
            if stats and stats.sample_count >= 5:  # Need enough data
                percent_below = -stats.percent_below_average(current_price)
                if percent_below >= threshold_percent:
                    deals.append((stats, percent_below))

        # Sort by best deal first
        deals.sort(key=lambda x: x[1], reverse=True)
        return deals

    # Delete
    def delete(self, route_key: str) -> bool:
        """Delete route stats."""
        result = self.collection.delete_one({"route_key": route_key})
        return result.deleted_count > 0

    # Stats
    def count_total(self) -> int:
        """Count all route stats."""
        return self.collection.count_documents({})

    def get_global_stats(self) -> dict:
        """Get global statistics across all routes."""
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_routes": {"$sum": 1},
                    "total_samples": {"$sum": "$sample_count"},
                    "avg_price_overall": {"$avg": "$average_price"},
                    "min_price_overall": {"$min": "$min_price_ever"},
                    "max_price_overall": {"$max": "$max_price_ever"}
                }
            }
        ]
        result = list(self.collection.aggregate(pipeline))
        if result:
            return {
                "total_routes": result[0]["total_routes"],
                "total_samples": result[0]["total_samples"],
                "avg_price_overall": round(result[0]["avg_price_overall"], 2),
                "min_price_overall": result[0]["min_price_overall"],
                "max_price_overall": result[0]["max_price_overall"]
            }
        return {
            "total_routes": 0,
            "total_samples": 0,
            "avg_price_overall": 0,
            "min_price_overall": 0,
            "max_price_overall": 0
        }
