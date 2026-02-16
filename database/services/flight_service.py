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

        # Track results
        new_count = 0
        updated_count = 0
        deals_count = 0
        hot_deals_count = 0

        # Batch price history records
        price_records = []

        for scraper_flight in flights:
            # Convert to FlightModel
            flight = FlightModel.from_scraper_flight(scraper_flight)

            # Get route stats for deal detection
            route_stats = self.route_stats_repo.find_by_route_key(flight.route_key)

            # Calculate deal status
            # Method 1: Absolute price threshold (always applies)
            is_hot_deal_price = flight.price <= HOT_DEAL_PRICE_THRESHOLD
            is_deal_price = flight.price <= DEAL_PRICE_THRESHOLD

            # Method 2: Relative to route average (needs historical data)
            percent_below = 0
            is_hot_deal_relative = False
            is_deal_relative = False

            if route_stats and route_stats.sample_count >= 5:
                percent_below = -route_stats.percent_below_average(flight.price)
                is_hot_deal_relative = percent_below >= HOT_DEAL_THRESHOLD_PERCENT
                is_deal_relative = percent_below >= DEAL_THRESHOLD_PERCENT

                # Set price stats
                flight.price_stats.lowest = route_stats.min_price_ever
                flight.price_stats.highest = route_stats.max_price_ever
                flight.price_stats.average = route_stats.average_price
                flight.price_stats.current_vs_avg_percent = -percent_below

            # Determine final deal status (either method triggers a deal)
            if is_hot_deal_price or is_hot_deal_relative:
                flight.is_deal = True
                # Score: base 80 for hot deal price, bonus for relative savings
                flight.deal_score = min(100, 80 + int(percent_below))
                hot_deals_count += 1
                deals_count += 1
            elif is_deal_price or is_deal_relative:
                flight.is_deal = True
                # Score: base 60 for deal price, bonus for relative savings
                flight.deal_score = min(100, 60 + int(percent_below))
                deals_count += 1
            else:
                flight.is_deal = False
                flight.deal_score = 0

            # Upsert flight
            _, is_new = self.flight_repo.upsert(flight)
            if is_new:
                new_count += 1
            else:
                updated_count += 1

            # Queue price history record
            price_records.append((flight.flight_key, flight.route_key, flight.price))

            # Update route stats
            self.route_stats_repo.update_from_price(
                route_key=flight.route_key,
                price=flight.price,
                origin=flight.origin,
                destination=flight.destination
            )

        # Batch insert price history
        if price_records:
            self.price_history_repo.record_many(price_records)
            logger.debug(f"Recorded {len(price_records)} price history entries")

        result = {
            "new": new_count,
            "updated": updated_count,
            "deals": deals_count,
            "hot_deals": hot_deals_count
        }

        logger.info(f"Save complete: {new_count} new, {updated_count} updated, "
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
