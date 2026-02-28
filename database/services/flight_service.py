"""
Flight service - main integration point for saving scraped flights.

Handles:
- Saving flights from scraper
- Recording price history
- Updating route stats
- Detecting deals
"""

import logging
from datetime import datetime
from typing import Any

from ..config import (
    DEAL_THRESHOLD_PERCENT, HOT_DEAL_THRESHOLD_PERCENT,
    DEAL_PRICE_THRESHOLD, HOT_DEAL_PRICE_THRESHOLD
)
from ..models.flight import FlightModel
from ..models.route_stats import RouteStats
from ..repositories.flight_repo import FlightRepository
from ..repositories.price_history_repo import PriceHistoryRepository
from ..repositories.route_stats_repo import RouteStatsRepository

logger = logging.getLogger(__name__)


class FlightService:
    """
    Main service for flight operations.

    Usage:
        from database.services import FlightService
        from scraper import AzairScraper

        scraper = AzairScraper()
        service = FlightService()

        flights = scraper.search_all(...)
        result = service.save_scraped_flights(flights)
        # Returns: {"new": 45, "updated": 283, "deals": 23}
    """

    def __init__(self):
        self.flight_repo = FlightRepository()
        self.price_history_repo = PriceHistoryRepository()
        self.route_stats_repo = RouteStatsRepository()

    def save_scraped_flights(self, flights: list[Any]) -> dict:
        """
        Save flights from scraper to database.

        This is the main integration point. It:
        1. Converts scraper Flight objects to FlightModel
        2. Upserts flights to database
        3. Records price history
        4. Updates route statistics
        5. Calculates and marks deals

        Args:
            flights: List of Flight objects from scraper

        Returns:
            Dict with counts: {"new": X, "updated": Y, "deals": Z, "hot_deals": W}
        """
        if not flights:
            logger.info("No flights to save")
            return {"new": 0, "updated": 0, "deals": 0, "hot_deals": 0}

        logger.info(f"Saving {len(flights)} flights to database...")

        now = datetime.utcnow()
        month_key = now.strftime("%Y-%m")

        # Convert all scraper flights up front
        flight_models = [FlightModel.from_scraper_flight(f) for f in flights]

        # Pre-fetch all route stats in ONE query instead of one per flight
        route_keys = list({f.route_key for f in flight_models})
        stats_cache = self.route_stats_repo.fetch_many(route_keys)

        deals_count = 0
        hot_deals_count = 0
        price_records = []

        # Working copy of stats — updated in memory, written once at the end
        working_stats: dict[str, RouteStats] = dict(stats_cache)

        for flight in flight_models:
            route_stats = stats_cache.get(flight.route_key)

            # Deal detection (unchanged logic)
            is_hot_deal_price = flight.price <= HOT_DEAL_PRICE_THRESHOLD
            is_deal_price = flight.price <= DEAL_PRICE_THRESHOLD

            percent_below = 0
            is_hot_deal_relative = False
            is_deal_relative = False

            if route_stats and route_stats.sample_count >= 5:
                percent_below = -route_stats.percent_below_average(flight.price)
                is_hot_deal_relative = percent_below >= HOT_DEAL_THRESHOLD_PERCENT
                is_deal_relative = percent_below >= DEAL_THRESHOLD_PERCENT

                flight.price_stats.lowest = route_stats.min_price_ever
                flight.price_stats.highest = route_stats.max_price_ever
                flight.price_stats.average = route_stats.average_price
                flight.price_stats.current_vs_avg_percent = -percent_below

            if is_hot_deal_price or is_hot_deal_relative:
                flight.is_deal = True
                flight.deal_score = min(100, 80 + int(percent_below))
                hot_deals_count += 1
                deals_count += 1
            elif is_deal_price or is_deal_relative:
                flight.is_deal = True
                flight.deal_score = min(100, 60 + int(percent_below))
                deals_count += 1
            else:
                flight.is_deal = False
                flight.deal_score = 0

            price_records.append((flight.flight_key, flight.route_key, flight.price))

            # Update route stats in memory — no DB call per flight
            existing = working_stats.get(flight.route_key)
            if existing:
                n = existing.sample_count + 1
                existing.average_price += (flight.price - existing.average_price) / n
                existing.min_price_ever = min(existing.min_price_ever, flight.price)
                existing.max_price_ever = max(existing.max_price_ever, flight.price)
                existing.sample_count = n
                if month_key in existing.monthly_averages:
                    existing.monthly_averages[month_key] = (existing.monthly_averages[month_key] + flight.price) / 2
                else:
                    existing.monthly_averages[month_key] = flight.price
            else:
                working_stats[flight.route_key] = RouteStats(
                    route_key=flight.route_key,
                    origin=flight.origin,
                    destination=flight.destination,
                    average_price=flight.price,
                    min_price_ever=flight.price,
                    max_price_ever=flight.price,
                    sample_count=1,
                    monthly_averages={month_key: flight.price},
                )

        # Bulk write all flights — 1 batch instead of 2 ops per flight
        counts = self.flight_repo.bulk_upsert(flight_models)

        # Bulk write all route stats — 1 batch instead of 2 ops per flight
        self.route_stats_repo.bulk_upsert_many(list(working_stats.values()))

        # Batch insert price history (was already bulk)
        if price_records:
            self.price_history_repo.record_many(price_records)

        result = {
            "new": counts["new"],
            "updated": counts["updated"],
            "deals": deals_count,
            "hot_deals": hot_deals_count,
        }

        logger.info(f"Save complete: {counts['new']} new, {counts['updated']} updated, "
                    f"{deals_count} deals ({hot_deals_count} hot)")

        return result

    def get_deals(
        self,
        min_score: int = 50,
        origin: str = None,
        destination: str = None,
        max_price: float = None,
        direct_only: bool = False,
        limit: int = 50
    ) -> list[FlightModel]:
        """
        Get current deals matching criteria.

        Args:
            min_score: Minimum deal score (0-100)
            origin: Filter by origin airport
            destination: Filter by destination airport
            max_price: Maximum price filter
            direct_only: Only direct flights
            limit: Max results

        Returns:
            List of FlightModel objects sorted by deal_score
        """
        flights = self.flight_repo.find_deals(
            min_score=min_score,
            origin=origin,
            destination=destination,
            limit=limit * 2  # Get extra for filtering
        )

        # Apply additional filters
        if max_price:
            flights = [f for f in flights if f.price <= max_price]
        if direct_only:
            flights = [f for f in flights if f.is_direct]

        return flights[:limit]

    def get_hot_deals(self, limit: int = 20) -> list[FlightModel]:
        """Get the hottest deals (highest scores)."""
        return self.get_deals(min_score=70, limit=limit)

    def get_route_analysis(self, origin: str, destination: str) -> dict:
        """
        Get comprehensive analysis for a route.

        Returns:
            Dict with stats, trends, and current deals
        """
        route_key = f"{origin.upper()}-{destination.upper()}"

        # Get route stats
        stats = self.route_stats_repo.find_by_route_key(route_key)
        if not stats:
            return {"error": "No data for this route"}

        # Get recent price trend
        trend = self.price_history_repo.get_price_trend(route_key, days=7)

        # Get current flights
        current_flights = self.flight_repo.find_by_route(origin, destination, limit=10)

        # Get any deals
        deals = [f for f in current_flights if f.is_deal]

        return {
            "route_key": route_key,
            "stats": stats.to_api_dict(),
            "trend": trend,
            "current_cheapest": current_flights[0].to_api_dict() if current_flights else None,
            "deals": [f.to_api_dict() for f in deals],
            "deal_count": len(deals)
        }

    def cleanup_old_data(self, flight_days: int = 90, history_days: int = 180) -> dict:
        """
        Clean up old flights and price history.

        Args:
            flight_days: Delete flights not seen in X days
            history_days: Delete price history older than X days

        Returns:
            Dict with counts of deleted records
        """
        flights_deleted = self.flight_repo.delete_old_flights(days=flight_days)
        history_deleted = self.price_history_repo.delete_old_records(days=history_days)

        logger.info(f"Cleanup: removed {flights_deleted} old flights, "
                   f"{history_deleted} old price history records")

        return {
            "flights_deleted": flights_deleted,
            "history_deleted": history_deleted
        }

    def get_stats(self) -> dict:
        """Get overall database statistics."""
        return {
            "total_flights": self.flight_repo.count_total(),
            "total_deals": self.flight_repo.count_deals(),
            "total_routes": self.route_stats_repo.count_total(),
            "total_price_history": self.price_history_repo.count_total(),
            "global_route_stats": self.route_stats_repo.get_global_stats()
        }
