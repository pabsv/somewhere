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

from ..config import DEAL_PRICE_THRESHOLD
from ..models.flight import FlightModel
from ..repositories.flight_repo import FlightRepository

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
            return {"new": 0, "updated": 0, "deals": 0}

        logger.info(f"Saving {len(flights)} flights to database...")

        flight_models = [FlightModel.from_scraper_flight(f) for f in flights]

        deals_count = 0
        for flight in flight_models:
            if flight.price <= DEAL_PRICE_THRESHOLD:
                flight.is_deal = True
                flight.deal_score = max(0, 100 - int((flight.price / DEAL_PRICE_THRESHOLD) * 100))
                deals_count += 1
            else:
                flight.is_deal = False
                flight.deal_score = 0

        counts = self.flight_repo.bulk_upsert(flight_models)

        result = {
            "new": counts["new"],
            "updated": counts["updated"],
            "deals": deals_count,
        }

        logger.info(f"Save complete: {counts['new']} new, {counts['updated']} updated, "
                    f"{deals_count} deals")

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
