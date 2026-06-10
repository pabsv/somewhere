"""
Flight service — main integration point for saving scraped flights.

v2: Python computes NO deal scores — scoring lives in frontend/lib/score.ts
(read-time, against scrape_targets baselines). This service only:
  1. Converts scraper Flight objects to FlightModel
  2. Drops obviously-bogus prices (sanity guard)
  3. Bulk-upserts into the flights collection
"""

import logging
from typing import Any

from ..config import PRICE_SANITY_MIN, PRICE_SANITY_MAX
from ..models.flight import FlightModel
from ..repositories.flight_repo import FlightRepository

logger = logging.getLogger(__name__)


class FlightService:
    """
    Main service for flight operations.

    Usage:
        from database.services import FlightService

        service = FlightService()
        result = service.save_scraped_flights(flights)
        # Returns: {"new": 45, "updated": 283, "dropped": 2}
    """

    def __init__(self):
        self.flight_repo = FlightRepository()

    def save_scraped_flights(self, flights: list[Any]) -> dict:
        """
        Save flights from scraper to database.

        Steps:
          1. Convert scraper Flight objects to FlightModel
          2. Price sanity guard: drop flights with
             price <= PRICE_SANITY_MIN or price > PRICE_SANITY_MAX
          3. Bulk-upsert (batch-deduped by flight_key, price_points
             maintained by the repository)

        Args:
            flights: List of Flight objects from scraper

        Returns:
            Dict with counts: {"new": X, "updated": Y, "dropped": Z}
        """
        if not flights:
            logger.info("No flights to save")
            return {"new": 0, "updated": 0, "dropped": 0}

        flight_models = [FlightModel.from_scraper_flight(f) for f in flights]

        # Price sanity guard.
        sane = [
            f for f in flight_models
            if PRICE_SANITY_MIN < f.price <= PRICE_SANITY_MAX
        ]
        dropped = len(flight_models) - len(sane)
        if dropped:
            logger.warning(
                f"Price sanity guard dropped {dropped} flights "
                f"(price <= {PRICE_SANITY_MIN} or > {PRICE_SANITY_MAX})"
            )

        if not sane:
            logger.info(f"All {dropped} flights dropped by sanity guard — nothing to save")
            return {"new": 0, "updated": 0, "dropped": dropped}

        logger.info(f"Saving {len(sane)} flights to database...")
        counts = self.flight_repo.bulk_upsert(sane)

        result = {
            "new": counts["new"],
            "updated": counts["updated"],
            "dropped": dropped,
        }

        logger.info(
            f"Save complete: {counts['new']} new, {counts['updated']} updated, "
            f"{dropped} dropped"
        )

        return result
