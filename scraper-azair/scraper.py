"""
Azair Flight Scraper - Phase 1 Complete

Features:
- Multi-origin support (search from multiple airports)
- Multiple date ranges (for user availability windows)
- Retry logic with exponential backoff
- Rate limiting to avoid blocks
- Proper logging
- JSON export
- Direct flights filter
"""

import requests
import time
import logging
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode
from dataclasses import dataclass

from parser import (
    parse_results, filter_by_price, filter_direct_only,
    sort_by_price, deduplicate, flights_to_json, save_flights_json, Flight
)
from config import (
    DEFAULT_ORIGIN, NEARBY_ORIGINS, DESTINATION_CODES, AIRPORT_NAMES,
    MAX_PRICE, DEFAULT_MIN_DAYS, DEFAULT_MAX_DAYS,
    REQUEST_TIMEOUT, RETRY_ATTEMPTS, RETRY_DELAY, DELAY_BETWEEN_REQUESTS,
    LOG_LEVEL, LOG_FILE
)


# =============================================================================
# LOGGING SETUP
# =============================================================================

def setup_logging(level: str = LOG_LEVEL, log_file: str = LOG_FILE) -> logging.Logger:
    """Configure logging for the scraper."""
    logger = logging.getLogger("azair_scraper")
    logger.setLevel(getattr(logging, level.upper()))

    # Console handler
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console_fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s", "%H:%M:%S")
    console.setFormatter(console_fmt)

    # File handler
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    file_handler.setFormatter(file_fmt)

    logger.addHandler(console)
    logger.addHandler(file_handler)

    return logger


logger = setup_logging()


# =============================================================================
# DATE RANGE HELPER
# =============================================================================

@dataclass
class DateRange:
    """Represents a date range for availability."""
    start: datetime
    end: datetime
    label: str = ""

    def __str__(self):
        return f"{self.start.strftime('%Y-%m-%d')} to {self.end.strftime('%Y-%m-%d')}"


# =============================================================================
# MAIN SCRAPER CLASS
# =============================================================================

BASE_URL = "https://www.azair.eu/azfin.php"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}


class AzairScraper:
    """
    Robust Azair flight scraper.

    Features:
    - Multi-origin: Search from multiple airports
    - Date ranges: Search within specific availability windows
    - Retry logic: Automatic retries on failure
    - Rate limiting: Configurable delays
    - Direct flights: Filter option
    """

    def __init__(
        self,
        retry_attempts: int = RETRY_ATTEMPTS,
        retry_delay: float = RETRY_DELAY,
        request_delay: float = DELAY_BETWEEN_REQUESTS,
        timeout: int = REQUEST_TIMEOUT,
    ):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay
        self.request_delay = request_delay
        self.timeout = timeout

        # Stats
        self.stats = {
            "requests": 0,
            "successful": 0,
            "failed": 0,
            "flights_found": 0,
        }

    def build_url(
        self,
        origin: str,
        destination: str,
        date_from: datetime,
        date_to: datetime,
        min_days: int = DEFAULT_MIN_DAYS,
        max_days: int = DEFAULT_MAX_DAYS,
        max_stops: int = 1,
    ) -> str:
        """Build Azair search URL."""
        origin_name = AIRPORT_NAMES.get(origin, origin)
        dest_name = AIRPORT_NAMES.get(destination, destination)

        params = {
            "lang": "en",
            "searchtype": "flexi",
            "tp": "0",
            "isOneway": "return",
            "srcAirport": f"{origin_name} [{origin}]",
            "srcTypedText": origin,
            "srcap": origin,
            "dstAirport": f"{dest_name} [{destination}]",
            "dstTypedText": destination,
            "dstap": destination,
            "depmonth": date_from.strftime("%Y%m"),
            "depdate": date_from.strftime("%Y-%m-%d"),
            "arrmonth": date_to.strftime("%Y%m"),
            "arrdate": date_to.strftime("%Y-%m-%d"),
            "minDaysStay": str(min_days),
            "maxDaysStay": str(max_days),
            "dep0": "true", "dep1": "true", "dep2": "true", "dep3": "true",
            "dep4": "true", "dep5": "true", "dep6": "true",
            "arr0": "true", "arr1": "true", "arr2": "true", "arr3": "true",
            "arr4": "true", "arr5": "true", "arr6": "true",
            "samedep": "true",
            "samearr": "true",
            "minHourStay": "0:45",
            "maxHourStay": "23:20",
            "minHourOutbound": "0:00",
            "maxHourOutbound": "24:00",
            "minHourInbound": "0:00",
            "maxHourInbound": "24:00",
            "autoprice": "true",
            "maxChng": str(max_stops),
            "currency": "EUR",
            "indexSubmit": "Search",
        }

        return BASE_URL + "?" + urlencode(params, safe="[]:")

    def fetch_with_retry(self, url: str, origin: str, destination: str) -> Optional[str]:
        """Fetch URL with retry logic."""
        for attempt in range(1, self.retry_attempts + 1):
            try:
                self.stats["requests"] += 1
                response = self.session.get(url, timeout=self.timeout)
                response.raise_for_status()

                # Check for Azair-specific errors
                if "noResults" in response.text:
                    logger.debug(f"No results for {origin}->{destination}")
                    self.stats["successful"] += 1
                    return None

                self.stats["successful"] += 1
                return response.text

            except requests.exceptions.Timeout:
                logger.warning(f"Timeout {origin}->{destination} (attempt {attempt}/{self.retry_attempts})")
            except requests.exceptions.RequestException as e:
                logger.warning(f"Error {origin}->{destination}: {e} (attempt {attempt}/{self.retry_attempts})")

            if attempt < self.retry_attempts:
                sleep_time = self.retry_delay * attempt  # Exponential backoff
                logger.debug(f"Retrying in {sleep_time}s...")
                time.sleep(sleep_time)

        self.stats["failed"] += 1
        logger.error(f"Failed after {self.retry_attempts} attempts: {origin}->{destination}")
        return None

    def search_route(
        self,
        origin: str,
        destination: str,
        date_from: datetime,
        date_to: datetime,
        min_days: int = DEFAULT_MIN_DAYS,
        max_days: int = DEFAULT_MAX_DAYS,
        max_stops: int = 1,
    ) -> list[Flight]:
        """Search a single route."""
        url = self.build_url(origin, destination, date_from, date_to, min_days, max_days, max_stops)
        html = self.fetch_with_retry(url, origin, destination)

        if not html:
            return []

        flights = parse_results(html, origin_override=origin)
        self.stats["flights_found"] += len(flights)

        return flights

    def search_destinations(
        self,
        origin: str,
        destinations: list[str],
        date_from: datetime,
        date_to: datetime,
        min_days: int = DEFAULT_MIN_DAYS,
        max_days: int = DEFAULT_MAX_DAYS,
        max_stops: int = 1,
    ) -> list[Flight]:
        """Search multiple destinations from one origin."""
        all_flights = []

        for i, dest in enumerate(destinations, 1):
            logger.info(f"[{i}/{len(destinations)}] {origin} -> {dest}")

            flights = self.search_route(
                origin=origin,
                destination=dest,
                date_from=date_from,
                date_to=date_to,
                min_days=min_days,
                max_days=max_days,
                max_stops=max_stops,
            )

            if flights:
                logger.info(f"  Found {len(flights)} flights")
                all_flights.extend(flights)
            else:
                logger.info(f"  No flights found")

            # Rate limiting
            if i < len(destinations):
                time.sleep(self.request_delay)

        return all_flights

    def search_all(
        self,
        origins: list[str],
        destinations: list[str],
        date_ranges: list[DateRange],
        min_days: int = DEFAULT_MIN_DAYS,
        max_days: int = DEFAULT_MAX_DAYS,
        max_stops: int = 1,
        direct_only: bool = False,
    ) -> list[Flight]:
        """
        Full search across multiple origins, destinations, and date ranges.

        Args:
            origins: List of origin airport codes
            destinations: List of destination airport codes
            date_ranges: List of DateRange objects (user availability windows)
            min_days: Minimum trip duration
            max_days: Maximum trip duration
            max_stops: Maximum number of stops (0 = direct only in search)
            direct_only: Filter results to only direct flights

        Returns:
            List of Flight objects, deduplicated and sorted by price
        """
        all_flights = []
        total_searches = len(origins) * len(destinations) * len(date_ranges)

        logger.info("=" * 60)
        logger.info(f"Starting search: {len(origins)} origins x {len(destinations)} destinations x {len(date_ranges)} date ranges")
        logger.info(f"Total searches: {total_searches}")
        logger.info("=" * 60)

        search_num = 0
        for date_range in date_ranges:
            logger.info(f"\n📅 Date range: {date_range}")

            for origin in origins:
                logger.info(f"\n✈️  Origin: {origin}")

                flights = self.search_destinations(
                    origin=origin,
                    destinations=destinations,
                    date_from=date_range.start,
                    date_to=date_range.end,
                    min_days=min_days,
                    max_days=max_days,
                    max_stops=0 if direct_only else max_stops,
                )

                all_flights.extend(flights)
                search_num += len(destinations)
                logger.info(f"Progress: {search_num}/{total_searches} searches complete")

        # Post-processing
        logger.info("\n" + "=" * 60)
        logger.info("Post-processing results...")

        # Deduplicate
        unique_flights = deduplicate(all_flights)
        logger.info(f"Deduplicated: {len(all_flights)} -> {len(unique_flights)} flights")

        # Filter direct only (if requested and not already filtered in search)
        if direct_only:
            unique_flights = filter_direct_only(unique_flights)
            logger.info(f"Direct flights only: {len(unique_flights)} flights")

        # Sort by price
        sorted_flights = sort_by_price(unique_flights)

        logger.info(f"Final result: {len(sorted_flights)} flights")
        self._print_stats()

        return sorted_flights

    def find_deals(
        self,
        origins: list[str] = None,
        destinations: list[str] = None,
        date_ranges: list[DateRange] = None,
        max_price: float = MAX_PRICE,
        min_days: int = DEFAULT_MIN_DAYS,
        max_days: int = DEFAULT_MAX_DAYS,
        direct_only: bool = False,
    ) -> list[Flight]:
        """
        Find deals under a certain price.

        Convenience method that searches and filters by price.
        """
        if origins is None:
            origins = [DEFAULT_ORIGIN]
        if destinations is None:
            destinations = DESTINATION_CODES[:10]  # Default to first 10
        if date_ranges is None:
            # Default: next 3 months
            date_ranges = [
                DateRange(
                    start=datetime.now() + timedelta(days=7),
                    end=datetime.now() + timedelta(days=90),
                    label="Next 3 months"
                )
            ]

        all_flights = self.search_all(
            origins=origins,
            destinations=destinations,
            date_ranges=date_ranges,
            min_days=min_days,
            max_days=max_days,
            direct_only=direct_only,
        )

        deals = filter_by_price(all_flights, max_price)
        logger.info(f"Deals under €{max_price}: {len(deals)}")

        return deals

    def _print_stats(self):
        """Print scraping statistics."""
        logger.info("-" * 40)
        logger.info(f"Stats: {self.stats['requests']} requests, "
                   f"{self.stats['successful']} successful, "
                   f"{self.stats['failed']} failed, "
                   f"{self.stats['flights_found']} flights found")


# =============================================================================
# MAIN / TEST
# =============================================================================

def main():
    """Test the scraper with a small search."""
    print("=" * 60)
    print("Azair Flight Scraper - Test Run")
    print("=" * 60)

    scraper = AzairScraper()

    # Test with 2 origins, 3 destinations, 1 date range
    origins = ["EIN", "AMS"]
    destinations = ["BCN", "BUD", "LIS"]
    date_ranges = [
        DateRange(
            start=datetime.now() + timedelta(days=14),
            end=datetime.now() + timedelta(days=60),
            label="Test range"
        )
    ]

    flights = scraper.search_all(
        origins=origins,
        destinations=destinations,
        date_ranges=date_ranges,
        min_days=2,
        max_days=5,
    )

    print(f"\n{'=' * 60}")
    print(f"Top 10 cheapest flights:")
    print("=" * 60)
    for i, flight in enumerate(flights[:10], 1):
        print(f"{i:2}. {flight}")
        print(f"    Link: {flight.azair_link[:60]}...")

    # Save to JSON
    if flights:
        save_flights_json(flights, "test_results.json")
        print(f"\nSaved {len(flights)} flights to test_results.json")

    return flights


if __name__ == "__main__":
    main()
