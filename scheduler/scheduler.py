"""
Flight Scraper Scheduler - Phase 4

Runs the flight scraper pipeline automatically on a staggered schedule.
Each origin airport is scraped at a different time to spread the load.

Default Schedule (15-minute intervals starting at 6 AM):
    - 06:00 - EIN (Eindhoven)
    - 06:15 - AMS (Amsterdam)
    - 06:30 - BRU (Brussels)
    - 06:45 - DUS (Düsseldorf)
    - 07:00 - CGN (Cologne)

Usage:
    python -m scheduler.scheduler              # Start scheduler with default times
    python -m scheduler.scheduler --now        # Run all jobs immediately, then schedule
    python -m scheduler.scheduler --test       # Run all jobs once and exit
    python -m scheduler.scheduler --test EIN   # Test single origin only
"""

import sys
import os
import argparse
import logging
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from run_pipeline import run_pipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            os.path.join(os.path.dirname(__file__), "..", "scheduler.log"),
            encoding="utf-8"
        )
    ]
)
logger = logging.getLogger("scheduler")

# Reduce noise from APScheduler
logging.getLogger("apscheduler").setLevel(logging.WARNING)


# Staggered schedule: (origin_code, hour, minute)
# Spread across the morning, 15 minutes apart
ORIGIN_SCHEDULE = [
    ("EIN", 6, 0),    # 06:00
    ("AMS", 6, 15),   # 06:15
    ("BRU", 6, 30),   # 06:30
    ("DUS", 6, 45),   # 06:45
    ("CGN", 7, 0),    # 07:00
]


def create_origin_job(origin: str):
    """
    Create a job function for a specific origin airport.
    Returns a function that can be scheduled.
    """
    def job():
        logger.info("=" * 60)
        logger.info(f"SCHEDULED JOB: {origin}")
        logger.info(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 60)

        try:
            result = run_pipeline(single_origin=origin)

            logger.info(f"Job {origin} completed successfully")
            logger.info(f"Results: {result}")

            return result

        except Exception as e:
            logger.error(f"Job {origin} failed with error: {e}")
            raise

    # Set a name for the function (helps with logging)
    job.__name__ = f"scrape_{origin}"
    return job


def job_listener(event):
    """Listen for job events and log them."""
    if event.exception:
        logger.error(f"Job {event.job_id} failed!")
    else:
        logger.info(f"Job {event.job_id} completed successfully")


def run_all_now():
    """Run all origin jobs immediately (sequentially)."""
    logger.info("Running all jobs immediately...")
    results = {}

    for origin, _, _ in ORIGIN_SCHEDULE:
        logger.info(f"\n>>> Starting {origin}...")
        try:
            job = create_origin_job(origin)
            result = job()
            results[origin] = result
        except Exception as e:
            logger.error(f"Failed {origin}: {e}")
            results[origin] = {"error": str(e)}

    return results


def run_scheduler(run_now: bool = False):
    """
    Start the scheduler with staggered jobs for each origin.

    Args:
        run_now: If True, run all jobs immediately before starting schedule
    """
    scheduler = BlockingScheduler()

    # Add listener for job events
    scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

    # Schedule a job for each origin airport
    for origin, hour, minute in ORIGIN_SCHEDULE:
        trigger = CronTrigger(hour=hour, minute=minute)
        job = create_origin_job(origin)

        scheduler.add_job(
            job,
            trigger=trigger,
            id=f"scrape_{origin}",
            name=f"Scrape {origin}",
            replace_existing=True
        )

    # Print schedule
    logger.info("=" * 60)
    logger.info("FLIGHT SCRAPER SCHEDULER")
    logger.info("=" * 60)
    logger.info("Daily Schedule (staggered by origin):")
    for origin, hour, minute in ORIGIN_SCHEDULE:
        logger.info(f"  {hour:02d}:{minute:02d} - {origin}")
    logger.info("-" * 60)
    logger.info("Press Ctrl+C to stop")
    logger.info("=" * 60)

    # Run immediately if requested
    if run_now:
        run_all_now()

    # Print next run times
    jobs = scheduler.get_jobs()
    if jobs:
        logger.info("\nNext scheduled runs:")
        for job in sorted(jobs, key=lambda j: j.next_run_time):
            logger.info(f"  {job.next_run_time.strftime('%Y-%m-%d %H:%M')} - {job.name}")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped by user")
        scheduler.shutdown()


def main():
    parser = argparse.ArgumentParser(description="Flight Scraper Scheduler")
    parser.add_argument(
        "--now",
        action="store_true",
        help="Run all jobs immediately, then continue with schedule"
    )
    parser.add_argument(
        "--test",
        nargs="?",
        const="ALL",
        metavar="ORIGIN",
        help="Run jobs once and exit. Optionally specify single origin (e.g., --test EIN)"
    )

    args = parser.parse_args()

    if args.test:
        if args.test == "ALL":
            # Run all origins
            logger.info("Running test for ALL origins...")
            results = run_all_now()
            logger.info("\n" + "=" * 60)
            logger.info("TEST COMPLETE - Summary:")
            logger.info("=" * 60)
            for origin, result in results.items():
                if "error" in result:
                    logger.info(f"  {origin}: FAILED - {result['error']}")
                else:
                    logger.info(f"  {origin}: {result['new']} new, {result['deals']} deals")
        else:
            # Run single origin
            origin = args.test.upper()
            logger.info(f"Running test for {origin} only...")
            job = create_origin_job(origin)
            try:
                result = job()
                logger.info(f"Test complete. Results: {result}")
            except Exception as e:
                logger.error(f"Test failed: {e}")
                sys.exit(1)
    else:
        # Start the scheduler
        run_scheduler(run_now=args.now)


if __name__ == "__main__":
    main()
