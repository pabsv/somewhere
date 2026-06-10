"""
Flight Scraper Pipeline - Phase 3 Integration

This script connects the scraper to the database:
1. Runs the Azair scraper
2. Saves flights to MongoDB via FlightService (deal scoring lives in the frontend)
3. Reports results

Usage:
    python run_pipeline.py              # Quick test (2 origins, 3 destinations)
    python run_pipeline.py --full       # Full scan (all configured airports)
"""

import sys
import os
import argparse
import logging
from datetime import datetime, timedelta

# Add modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scraper-azair"))
sys.path.insert(0, os.path.dirname(__file__))

from scraper import AzairScraper, DateRange
from database.services.flight_service import FlightService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)


# Quick test configuration
TEST_ORIGINS = ["EIN", "AMS"]
TEST_DESTINATIONS = ["BCN", "LIS", "ATH"]

# Full scan configuration (from scraper config)
FULL_ORIGINS = ["EIN", "AMS", "BRU", "DUS", "CGN"]
FULL_DESTINATIONS = [
    # Southern Europe
    "BCN", "MAD", "VLC", "AGP", "PMI", "IBZ",  # Spain
    "LIS", "OPO", "FAO",                        # Portugal
    "FCO", "MXP", "NAP", "VCE", "BGY",          # Italy
    "ATH", "SKG", "HER",                        # Greece
    "MLA",                                       # Malta
    # Eastern Europe
    "BUD", "PRG", "WAW", "KRK", "VIE",
    "ZAG", "BEG", "SOF", "OTP", "CLJ",
    # Northern Europe
    "CPH", "ARN", "OSL", "HEL", "KEF",
    # UK & Ireland
    "DUB", "EDI", "STN", "LTN", "MAN",
    # North Africa
    "RAK", "AGA", "TNG",
]


def run_pipeline(
    full_scan: bool = False,
    days_ahead: int = 14,
    search_window: int = 45,
    single_origin: str = None
):
    """
    Run the scraper and save results to database.

    Args:
        full_scan: If True, use all origins/destinations. Otherwise quick test.
        days_ahead: Start searching from X days in the future
        search_window: Search within this many days
        single_origin: If provided, only scrape from this single origin airport
    """
    # Select configuration
    if single_origin:
        origins = [single_origin.upper()]
        destinations = FULL_DESTINATIONS  # Always use full destinations for single origin
    else:
        origins = FULL_ORIGINS if full_scan else TEST_ORIGINS
        destinations = FULL_DESTINATIONS if full_scan else TEST_DESTINATIONS

    # Create date range
    start_date = datetime.now() + timedelta(days=days_ahead)
    end_date = start_date + timedelta(days=search_window)
    date_range = DateRange(start_date, end_date)

    logger.info("=" * 60)
    logger.info("FLIGHT SCRAPER PIPELINE")
    logger.info("=" * 60)
    logger.info(f"Mode: {'FULL SCAN' if full_scan else 'TEST'}")
    logger.info(f"Origins: {len(origins)} airports")
    logger.info(f"Destinations: {len(destinations)} airports")
    logger.info(f"Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    logger.info(f"Total searches: {len(origins) * len(destinations)}")
    logger.info("=" * 60)

    # Initialize components
    scraper = AzairScraper()
    flight_service = FlightService()

    # Phase 1: Scrape flights
    logger.info("\n[PHASE 1] Scraping flights from Azair...")
    flights = scraper.search_all(
        origins=origins,
        destinations=destinations,
        date_ranges=[date_range],
        min_days=2,
        max_days=7,
        direct_only=False
    )

    logger.info(f"Scraper found {len(flights)} flights")

    if not flights:
        logger.warning("No flights found. Exiting.")
        return

    # Phase 2: Save to database
    logger.info("\n[PHASE 2] Saving to database...")
    result = flight_service.save_scraped_flights(flights)

    # Phase 3: Report results
    logger.info("\n" + "=" * 60)
    logger.info("RESULTS")
    logger.info("=" * 60)
    logger.info(f"New flights:     {result['new']}")
    logger.info(f"Updated flights: {result['updated']}")
    logger.info(f"Dropped (price sanity): {result['dropped']}")
    logger.info(f"Total flights in DB:    {flight_service.flight_repo.count_total()}")

    logger.info("\n" + "=" * 60)
    logger.info("Pipeline complete!")
    logger.info("=" * 60)

    return result


def main():
    parser = argparse.ArgumentParser(description="Flight Scraper Pipeline")
    parser.add_argument(
        "--full",
        action="store_true",
        help="Run full scan with all origins/destinations"
    )
    parser.add_argument(
        "--origin",
        type=str,
        help="Only scrape from this single origin airport (e.g., EIN, AMS)"
    )
    parser.add_argument(
        "--days-ahead",
        type=int,
        default=14,
        help="Start searching X days from now (default: 14)"
    )
    parser.add_argument(
        "--window",
        type=int,
        default=45,
        help="Search window in days (default: 45)"
    )

    args = parser.parse_args()

    try:
        run_pipeline(
            full_scan=args.full,
            days_ahead=args.days_ahead,
            search_window=args.window,
            single_origin=args.origin
        )
    except KeyboardInterrupt:
        logger.info("\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        raise


if __name__ == "__main__":
    main()
