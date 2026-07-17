"""
Flight service — main integration point for saving scraped flights.

v2: Python computes NO deal scores — scoring lives in frontend/lib/score.ts
(read-time, against scrape_targets baselines). This service only:
  1. Converts scraper Flight objects to FlightModel
  2. Drops obviously-bogus prices (sanity guard)
  3. Bulk-upserts into the flights collection
"""

import logging
from datetime import date
from typing import Any

from ..config import PRICE_SANITY_MIN, PRICE_SANITY_MAX
from ..models.flight import FlightModel
from ..models.oneway_fare import OnewayFareModel
from ..repositories.flight_repo import FlightRepository
from ..repositories.oneway_fare_repo import OnewayFareRepository

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
        self.oneway_fare_repo = OnewayFareRepository()

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

        # Sanity guards: bogus prices, and non-EUR fares — Google picks the
        # response currency itself unless the request pins curr=EUR, and a
        # non-EUR number is meaningless against EUR baselines.
        sane = []
        dropped_price = 0
        dropped_currency = 0
        for f in flight_models:
            if not (PRICE_SANITY_MIN < f.price <= PRICE_SANITY_MAX):
                dropped_price += 1
            elif f.currency != "EUR":
                dropped_currency += 1
            else:
                sane.append(f)
        dropped = dropped_price + dropped_currency
        if dropped_price:
            logger.warning(
                f"Price sanity guard dropped {dropped_price} flights "
                f"(price <= {PRICE_SANITY_MIN} or > {PRICE_SANITY_MAX})"
            )
        if dropped_currency:
            logger.warning(
                f"Currency guard dropped {dropped_currency} non-EUR flights"
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

    def save_oneway_grids(self, grids: list[dict]) -> dict:
        """
        Persist one-way leg fare grids (open-jaw foundation).

        Args:
            grids: [{"origin": "EIN", "destination": "BCN",
                     "prices": {"2026-07-20": 45.0, ...}}, ...]
                   — the `oneway_grids` entry from FliScraper stats.

        Steps per grid:
          1. Drop past dates.
          2. Price sanity guard: keep only PRICE_SANITY_MIN < p <= PRICE_SANITY_MAX.
             This doubles as the currency mitigation — SearchDates returns bare
             floats (no per-response currency field exists at that layer, unlike
             SearchFlights), but the grids come from the same curr=EUR-pinned
             endpoint, and wrong-currency grids (HKD/ISK/...) mostly trip the cap.
          3. If nothing survives, skip the leg entirely — the previous good grid
             stays until TTL, which beats wiping it with an empty doc.

        Returns:
            {"legs_saved": X, "legs_skipped": Y, "prices_dropped": Z}
        """
        if not grids:
            return {"legs_saved": 0, "legs_skipped": 0, "prices_dropped": 0}

        today = date.today().isoformat()  # ISO string compare is date-safe
        fares = []
        legs_skipped = 0
        prices_dropped = 0
        for grid in grids:
            clean = {}
            for d, p in grid.get("prices", {}).items():
                if d < today or not (PRICE_SANITY_MIN < p <= PRICE_SANITY_MAX):
                    prices_dropped += 1
                    continue
                clean[d] = p
            if not clean:
                legs_skipped += 1
                continue
            fares.append(OnewayFareModel(
                origin=grid["origin"],
                destination=grid["destination"],
                prices=clean,
            ))

        if fares:
            self.oneway_fare_repo.bulk_upsert_grids(fares)

        result = {
            "legs_saved": len(fares),
            "legs_skipped": legs_skipped,
            "prices_dropped": prices_dropped,
        }
        logger.info(
            f"One-way grids: {result['legs_saved']} legs saved, "
            f"{result['legs_skipped']} skipped, {result['prices_dropped']} prices dropped"
        )
        return result
