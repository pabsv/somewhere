"""
POST /api/scrape        — trigger a scrape using the user's saved preferences
GET  /api/scrape/status — poll the status of the running/last scrape

Reads the user's airports, destinations, and availability windows from the DB
and passes them directly to the scraper. Runs in a background thread so the
HTTP response returns immediately. Poll /api/scrape/status to track progress.
"""

import sys
import logging
import threading
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends

from database.repositories.user_repo import UserRepository
from database.repositories.availability_repo import AvailabilityRepository
from database.repositories.destination_repo import DestinationRepository
from database.services.flight_service import FlightService
from ..dependencies import get_default_user_id

# Scraper lives in scraper-azair/ which isn't a Python package (hyphen in name),
# so we add it to sys.path and import scraper.py directly.
_scraper_dir = Path(__file__).parent.parent.parent / "scraper-azair"
if str(_scraper_dir) not in sys.path:
    sys.path.insert(0, str(_scraper_dir))

from scraper import AzairScraper, DateRange  # noqa: E402  (path added above)

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


# ─── In-process scrape state ──────────────────────────────────────────────────
# Single-user local app — a module-level dict is sufficient.
_state: dict = {
    "status": "idle",   # "idle" | "running" | "done" | "error"
    "started_at": None,
    "finished_at": None,
    "result": None,     # {"new": X, "updated": Y, "deals": Z, "hot_deals": W}
    "error": None,
}


def _run_scrape(user_id: str) -> None:
    """Background thread: scrape Azair using the user's saved preferences."""
    global _state
    _state.update({
        "status": "running",
        "started_at": datetime.now().isoformat(),
        "finished_at": None,
        "result": None,
        "error": None,
    })

    try:
        user = UserRepository().find_by_id(user_id)
        if not user:
            raise ValueError("User not found in database")

        availabilities = AvailabilityRepository().find_future_windows(user_id)
        destinations = DestinationRepository().get_destination_codes_for_user(user_id)

        if not availabilities:
            raise ValueError("No availability windows set — add some in Settings first")
        if not destinations:
            raise ValueError("No destinations configured — add some in Settings first")

        origins = user.all_airports

        # Convert DB availability windows → scraper DateRange objects
        date_ranges = [
            DateRange(
                start=avail.start_date,
                end=avail.end_date,
                label=avail.label or "",
            )
            for avail in availabilities
        ]

        # Search broadly so UserMatcher can apply the 70% rule on results.
        # max_days = longest availability window the user has.
        max_window = max(
            (avail.end_date - avail.start_date).days + 1
            for avail in availabilities
        )

        logger.info(
            f"Scrape started — {len(origins)} origins, {len(destinations)} destinations, "
            f"{len(date_ranges)} windows, trips up to {max_window} days"
        )

        scraper = AzairScraper()
        flights = scraper.search_all(
            origins=origins,
            destinations=destinations,
            date_ranges=date_ranges,
            min_days=2,
            max_days=max_window,
            direct_only=user.search_preferences.direct_only,
        )

        result = FlightService().save_scraped_flights(flights)
        _state.update({
            "status": "done",
            "finished_at": datetime.now().isoformat(),
            "result": result,
        })
        logger.info(f"Scrape finished: {result}")

    except Exception as exc:
        logger.error(f"Scrape failed: {exc}", exc_info=True)
        _state.update({
            "status": "error",
            "finished_at": datetime.now().isoformat(),
            "error": str(exc),
        })


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/scrape")
def start_scrape(user_id: str = Depends(get_default_user_id)):
    """Start a background scrape. Returns immediately."""
    if _state["status"] == "running":
        return {"status": "already_running"}

    thread = threading.Thread(target=_run_scrape, args=(user_id,), daemon=True)
    thread.start()
    return {"status": "started"}


@router.get("/scrape/status")
def get_scrape_status():
    """Return current scrape state for polling."""
    return _state
