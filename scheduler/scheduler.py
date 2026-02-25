"""
Flight Scraper Scheduler

Reads origins from the first active user's DB preferences.
Spreads one job per origin evenly across the configured period.

Modes
-----
  Production  — 1 cycle = 24 hours
  Simulate    — 1 cycle = 60 minutes  (default when run from API startup)

Usage (standalone CLI)
-----
  python -m scheduler.scheduler                # production schedule
  python -m scheduler.scheduler --simulate     # simulate: 1 day = 1 hour
  python -m scheduler.scheduler --now          # run all immediately, then schedule
  python -m scheduler.scheduler --test         # run all once and exit
  python -m scheduler.scheduler --test EIN     # run single origin once and exit
"""

import sys
import os
import argparse
import logging
from datetime import datetime, timedelta

# Project root on path (needed when running as a script)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from database.repositories.user_repo import UserRepository
from database.repositories.availability_repo import AvailabilityRepository
from database.repositories.destination_repo import DestinationRepository
from database.repositories.schedule_repo import ScheduleRepository
from database.services.flight_service import FlightService

# Add scraper-azair to path (hyphenated dir, not a package)
_scraper_dir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scraper-azair"
)
if _scraper_dir not in sys.path:
    sys.path.insert(0, _scraper_dir)

from scraper import AzairScraper, DateRange  # noqa: E402

# ─── Logging ──────────────────────────────────────────────────────────────────

logger = logging.getLogger("scheduler")


def _ensure_file_logging():
    """Set up file + console logging when running as a standalone script."""
    if not logging.root.handlers:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler(
                    os.path.join(os.path.dirname(__file__), "..", "scheduler.log"),
                    encoding="utf-8",
                ),
            ],
        )
    logging.getLogger("apscheduler").setLevel(logging.WARNING)


# ─── Period constants ─────────────────────────────────────────────────────────

PRODUCTION_PERIOD_MINUTES = 24 * 60   # 1440
SIMULATION_PERIOD_MINUTES = 60        # 60


# ─── Scrape logic ─────────────────────────────────────────────────────────────

def run_origin_job(origin: str, period_minutes: int) -> dict:
    """
    Scrape one origin against the first active user's current destinations
    and availability windows. Writes state to MongoDB before and after.
    """
    schedule_repo = ScheduleRepository()
    now = datetime.utcnow()

    schedule_repo.upsert_state(
        origin,
        status="running",
        last_run_at=now,
        finished_at=None,
        last_result=None,
        last_error=None,
        next_run_at=now + timedelta(minutes=period_minutes),
        period_minutes=period_minutes,
    )
    logger.info(f"[{origin}] Job started")

    try:
        users = UserRepository().find_all_active()
        if not users:
            raise RuntimeError("No active users in database.")
        user = users[0]

        availabilities = AvailabilityRepository().find_future_windows(user.id)
        destinations = DestinationRepository().get_destination_codes_for_user(user.id)

        if not availabilities:
            raise ValueError("No availability windows set — add some in Settings first.")
        if not destinations:
            raise ValueError("No destinations configured — add some in Settings first.")

        date_ranges = [
            DateRange(start=a.start_date, end=a.end_date, label=a.label or "")
            for a in availabilities
        ]
        max_window = max((a.end_date - a.start_date).days + 1 for a in availabilities)

        logger.info(
            f"[{origin}] {len(destinations)} destinations, "
            f"{len(date_ranges)} windows, trips up to {max_window} days"
        )

        scraper = AzairScraper()
        flights = scraper.search_all(
            origins=[origin],
            destinations=destinations,
            date_ranges=date_ranges,
            min_days=2,
            max_days=max_window,
            direct_only=user.search_preferences.direct_only,
        )

        result = FlightService().save_scraped_flights(flights)
        schedule_repo.upsert_state(
            origin,
            status="done",
            finished_at=datetime.utcnow(),
            last_result=result,
            last_error=None,
        )
        logger.info(f"[{origin}] Done — {result}")
        return result

    except Exception as exc:
        logger.error(f"[{origin}] Failed — {exc}", exc_info=True)
        schedule_repo.upsert_state(
            origin,
            status="error",
            finished_at=datetime.utcnow(),
            last_error=str(exc),
        )
        raise


# ─── Scheduler config (shared between CLI and API startup) ───────────────────

def load_origins() -> tuple[list[str], str]:
    """Load airports from the first active user. Returns (origins, user_email)."""
    users = UserRepository().find_all_active()
    if not users:
        raise RuntimeError(
            "No active users found. Open the app and create an account first."
        )
    user = users[0]
    origins = [a for a in user.all_airports if a]
    if not origins:
        raise RuntimeError(
            f"User '{user.email}' has no airports configured. "
            "Add departure airports in Settings."
        )
    return origins, user.email


def make_job_fn(origin: str, period_minutes: int):
    """Return a named closure for APScheduler."""
    def job():
        run_origin_job(origin, period_minutes)
    job.__name__ = f"scrape_{origin}"
    return job


def job_listener(event):
    if event.exception:
        logger.error(f"Job {event.job_id} raised an exception")
    else:
        logger.info(f"Job {event.job_id} completed")


def configure_scheduler(
    scheduler,
    simulate: bool = True,
    warmup_minutes: float = 1.0,
) -> tuple[list[str], float]:
    """
    Add per-origin interval jobs to any APScheduler scheduler instance.
    Works with both BackgroundScheduler (API) and BlockingScheduler (CLI).

    Also writes initial schedule state to MongoDB so the admin timeline
    is visible immediately, before any job has run.

    Args:
        scheduler:       Any APScheduler scheduler instance.
        simulate:        True = 60-min cycle, False = 24-hour cycle.
        warmup_minutes:  Delay before the first job fires (default 1 min).

    Returns:
        (origins, slot_minutes) for logging.

    Raises:
        RuntimeError: if no active users with airports exist in the DB.
    """
    period_minutes = SIMULATION_PERIOD_MINUTES if simulate else PRODUCTION_PERIOD_MINUTES
    origins, email = load_origins()
    slot_minutes = period_minutes / len(origins)
    now = datetime.now()
    schedule_repo = ScheduleRepository()

    for i, origin in enumerate(origins):
        first_run = now + timedelta(minutes=warmup_minutes + i * slot_minutes)
        scheduler.add_job(
            make_job_fn(origin, period_minutes),
            trigger=IntervalTrigger(minutes=period_minutes, start_date=first_run),
            id=f"scrape_{origin}",
            name=f"Scrape {origin}",
            replace_existing=True,
            misfire_grace_time=60,
        )

        # Write initial state so the admin timeline appears immediately on startup.
        existing = schedule_repo.get_state(origin)
        if not existing:
            # First ever run — write a clean idle state.
            schedule_repo.upsert_state(
                origin,
                status="idle",
                last_run_at=None,
                finished_at=None,
                last_result=None,
                last_error=None,
                next_run_at=datetime.utcnow() + timedelta(minutes=warmup_minutes + i * slot_minutes),
                period_minutes=period_minutes,
            )
        elif existing.get("status") == "running":
            # API restarted mid-run — mark that run as failed.
            schedule_repo.upsert_state(
                origin,
                status="error",
                last_error="Scheduler restarted during run",
                finished_at=datetime.utcnow(),
                next_run_at=datetime.utcnow() + timedelta(minutes=warmup_minutes + i * slot_minutes),
                period_minutes=period_minutes,
            )
        else:
            # Existing state — just refresh the next_run_at for this session.
            schedule_repo.upsert_state(
                origin,
                next_run_at=datetime.utcnow() + timedelta(minutes=warmup_minutes + i * slot_minutes),
                period_minutes=period_minutes,
            )

    mode = f"simulate ({period_minutes} min/cycle)" if simulate else f"production ({period_minutes} min/cycle)"
    logger.info(
        f"Scheduler configured — {len(origins)} origins, {mode}, "
        f"slot={slot_minutes:.1f} min, user={email}"
    )
    return origins, slot_minutes


# ─── Standalone CLI ───────────────────────────────────────────────────────────

def run_all_now(period_minutes: int) -> None:
    """Run every origin job immediately in sequence."""
    origins, email = load_origins()
    logger.info(f"Running all {len(origins)} origins immediately for user '{email}'")
    for origin in origins:
        try:
            run_origin_job(origin, period_minutes)
        except Exception:
            pass  # error already logged inside run_origin_job


def run_scheduler(simulate: bool = False, run_now: bool = False) -> None:
    period_minutes = SIMULATION_PERIOD_MINUTES if simulate else PRODUCTION_PERIOD_MINUTES
    origins, email = load_origins()
    slot_minutes = period_minutes / len(origins)

    mode_label = (
        f"SIMULATE  — 1 cycle = {period_minutes} min  (day compressed to 1 hour)"
        if simulate
        else f"PRODUCTION — 1 cycle = {period_minutes} min  (24-hour day)"
    )

    logger.info("=" * 60)
    logger.info("FLIGHT SCRAPER SCHEDULER (standalone)")
    logger.info("=" * 60)
    logger.info(f"Mode    : {mode_label}")
    logger.info(f"User    : {email}")
    logger.info(f"Origins : {origins}")
    logger.info(f"Slot gap: {slot_minutes:.1f} min between origins")
    logger.info("-" * 60)

    if run_now:
        run_all_now(period_minutes)

    scheduler = BlockingScheduler()
    scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)
    configure_scheduler(scheduler, simulate=simulate, warmup_minutes=0)

    logger.info("Press Ctrl+C to stop")
    logger.info("=" * 60)

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped by user")
        scheduler.shutdown()


def main():
    _ensure_file_logging()

    parser = argparse.ArgumentParser(description="Flight Scraper Scheduler")
    parser.add_argument("--simulate", action="store_true",
                        help="Compress one day into one hour")
    parser.add_argument("--now", action="store_true",
                        help="Run all origins immediately, then schedule")
    parser.add_argument("--test", nargs="?", const="ALL", metavar="ORIGIN",
                        help="Run once and exit. E.g. --test EIN")
    args = parser.parse_args()

    period_minutes = SIMULATION_PERIOD_MINUTES if args.simulate else PRODUCTION_PERIOD_MINUTES

    if args.test:
        if args.test == "ALL":
            logger.info("Test mode — running all origins once then exiting")
            run_all_now(period_minutes)
        else:
            origin = args.test.upper()
            logger.info(f"Test mode — running {origin} once then exiting")
            try:
                run_origin_job(origin, period_minutes)
            except Exception as e:
                logger.error(f"Test failed: {e}")
                sys.exit(1)
    else:
        run_scheduler(simulate=args.simulate, run_now=args.now)


if __name__ == "__main__":
    main()
