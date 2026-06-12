"""
Pool Scheduler — target-driven, user-agnostic flight scraping.

Pulls due routes from `scrape_targets`, scrapes one at a time via the Fli
backend, upserts results into `flights`, and records per-route runs into
`scrape_runs`.

Differences from the legacy user-driven scheduler.py:
  - No dependency on user availability/destinations
  - Continuous slot-based loop (default 2 min) instead of per-origin interval
  - Active window 07:00–23:00 local time only
  - Tier-aware cadence (A=24h, B=72h, C=168h)
  - Each slot = exactly ONE route (one origin × one destination)

Usage:
    python -m scheduler.pool_scheduler                # run forever
    python -m scheduler.pool_scheduler --once         # claim & run one route, exit
    python -m scheduler.pool_scheduler --route EIN BCN  # force-run a specific route, exit
    python -m scheduler.pool_scheduler --dry-run      # show next-due routes, scrape nothing
"""

import argparse
import importlib.util
import logging
import os
import statistics
import sys
import time
from datetime import datetime, timedelta

# Project root on path.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.config import (
    ACTIVE_WINDOW_START_HOUR,
    ACTIVE_WINDOW_END_HOUR,
    SLOT_MINUTES,
    SCRAPE_WINDOW_DAYS,
    SCRAPE_DURATION_BUCKETS,
    SCRAPE_TOP_N_CHEAP_DATES,
)
from database.repositories.scrape_target_repo import ScrapeTargetRepository
from database.repositories.scrape_run_repo import ScrapeRunRepository
from database.services.flight_service import FlightService

# Load FliScraper from the hyphenated scraper-fli directory.
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_fli_path = os.path.join(_PROJECT_ROOT, "scraper-fli", "scraper.py")
_fli_spec = importlib.util.spec_from_file_location("fli_scraper", _fli_path)
_fli_mod = importlib.util.module_from_spec(_fli_spec)
_fli_spec.loader.exec_module(_fli_mod)
FliScraper = _fli_mod.FliScraper

logger = logging.getLogger("pool_scheduler")

# Fares above this are routing artifacts (absurd multi-leg tickets Google
# returns when a route has no real option) — exclude them from the p50 EWMA
# baseline so deal scoring stays anchored to realistic prices. Mirrors
# HARD_PRICE_CEILING in frontend/lib/score.ts.
BASELINE_PRICE_CAP = 700


# ─── Logging ──────────────────────────────────────────────────────────────


def _ensure_file_logging():
    if logging.root.handlers:
        return
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(
                os.path.join(_PROJECT_ROOT, "scheduler-pool.log"), encoding="utf-8"
            ),
        ],
    )
    logging.getLogger("apscheduler").setLevel(logging.WARNING)


# ─── Window logic ─────────────────────────────────────────────────────────


def in_active_window(now: datetime = None) -> bool:
    """True if local hour is inside [START, END)."""
    now = now or datetime.now()
    return ACTIVE_WINDOW_START_HOUR <= now.hour < ACTIVE_WINDOW_END_HOUR


def seconds_until_window_open(now: datetime = None) -> float:
    """Seconds to wait until the next active window starts."""
    now = now or datetime.now()
    target = now.replace(hour=ACTIVE_WINDOW_START_HOUR, minute=0, second=0, microsecond=0)
    if now.hour >= ACTIVE_WINDOW_END_HOUR:
        # Past end-of-day → next morning.
        target += timedelta(days=1)
    elif now.hour < ACTIVE_WINDOW_START_HOUR:
        # Before start-of-day → today.
        pass
    return max(0.0, (target - now).total_seconds())


# ─── Scrape one route ─────────────────────────────────────────────────────


def scrape_one_route(
    origin: str,
    destination: str,
    tier: str,
    direct_only: bool = False,
) -> dict:
    """
    Run Fli for a single route and persist results.

    Returns: {"status": ..., "flight_count": ..., "api_calls": ..., "cheapest_price": ...}
    Updates scrape_runs (start + finish) and scrape_targets (record_run_result).
    """
    runs = ScrapeRunRepository()
    targets = ScrapeTargetRepository()
    route_key = f"{origin}-{destination}"

    run_id = runs.start(origin, destination, tier)
    t0 = time.time()

    try:
        scraper = FliScraper()
        flights, stats = scraper.search_one_route(
            origin=origin,
            destination=destination,
            durations=SCRAPE_DURATION_BUCKETS,
            window_days=SCRAPE_WINDOW_DAYS,
            top_n=SCRAPE_TOP_N_CHEAP_DATES,
            direct_only=direct_only,
        )

        # Determine status.
        if stats["errors"] > 0 and not flights:
            status = "error"
            err = f"{stats['errors']} fli calls failed"
        elif not flights:
            status = "empty"
            err = None
        else:
            status = "success"
            err = None

        # Baseline median over realistic fares only — see BASELINE_PRICE_CAP.
        sane_prices = [f.price for f in flights if f.price <= BASELINE_PRICE_CAP]
        median_price = statistics.median(sane_prices) if sane_prices else None

        if flights:
            save_result = FlightService().save_scraped_flights(flights)
            logger.info(
                f"[{route_key}] {len(flights)} flights "
                f"(saved new={save_result['new']} upd={save_result['updated']} "
                f"dropped={save_result['dropped']}) "
                f"cheapest=€{stats['cheapest_price']:.0f} "
                f"api={stats['api_calls']} dur={time.time()-t0:.1f}s"
            )
        else:
            logger.info(
                f"[{route_key}] {status} — 0 flights "
                f"api={stats['api_calls']} dur={time.time()-t0:.1f}s"
            )

        runs.finish(
            run_id,
            status=status,
            flight_count=len(flights),
            api_calls=stats["api_calls"],
            cheapest_price=stats["cheapest_price"],
            error_message=err,
        )
        targets.record_run_result(
            route_key=route_key,
            status=status,
            flight_count=len(flights),
            cheapest_price=stats["cheapest_price"],
            median_price=median_price,
            error_message=err,
        )

        return {
            "status": status,
            "flight_count": len(flights),
            "api_calls": stats["api_calls"],
            "cheapest_price": stats["cheapest_price"],
        }

    except Exception as exc:
        err = f"{type(exc).__name__}: {exc}"
        logger.error(f"[{route_key}] CRASH — {err}", exc_info=True)
        runs.finish(run_id, status="error", flight_count=0, api_calls=0, error_message=err)
        targets.record_run_result(
            route_key=route_key,
            status="error",
            flight_count=0,
            cheapest_price=None,
            median_price=None,
            error_message=err,
        )
        return {"status": "error", "flight_count": 0, "api_calls": 0, "cheapest_price": None}


# ─── Main loop ────────────────────────────────────────────────────────────


def run_one_slot(direct_only: bool = False) -> bool:
    """
    Claim the next-due target and scrape it.

    Returns True if a route was scraped, False if nothing was due.
    """
    targets = ScrapeTargetRepository()
    target = targets.claim_next_due()
    if target is None:
        return False

    scrape_one_route(
        origin=target.origin,
        destination=target.destination,
        tier=target.tier,
        direct_only=direct_only,
    )
    return True


def run_forever(direct_only: bool = False):
    """Slot loop. Sleeps SLOT_MINUTES between attempts; idles outside active window."""
    slot_seconds = SLOT_MINUTES * 60

    targets = ScrapeTargetRepository()
    stats = targets.stats()
    logger.info("=" * 60)
    logger.info("POOL SCHEDULER")
    logger.info("=" * 60)
    logger.info(f"Active window  : {ACTIVE_WINDOW_START_HOUR:02d}:00–{ACTIVE_WINDOW_END_HOUR:02d}:00 local")
    logger.info(f"Slot interval  : {SLOT_MINUTES} min")
    logger.info(f"Target pool    : {stats}")
    logger.info(f"Window/dur/topN: {SCRAPE_WINDOW_DAYS}d / {SCRAPE_DURATION_BUCKETS} / top {SCRAPE_TOP_N_CHEAP_DATES}")
    logger.info("=" * 60)

    while True:
        try:
            if not in_active_window():
                sleep_s = seconds_until_window_open()
                wake = (datetime.now() + timedelta(seconds=sleep_s)).strftime("%Y-%m-%d %H:%M")
                logger.info(f"Outside active window — sleeping {int(sleep_s/60)} min (until {wake})")
                time.sleep(min(sleep_s, 30 * 60))  # wake up at least every 30 min to recheck
                continue

            scraped = run_one_slot(direct_only=direct_only)
            if not scraped:
                logger.info("No routes currently due — sleeping one slot")

            time.sleep(slot_seconds)

        except KeyboardInterrupt:
            logger.info("Stopped by user")
            return
        except Exception as exc:
            logger.error(f"Loop iteration failed — {exc}", exc_info=True)
            time.sleep(slot_seconds)  # don't tight-loop on errors


# ─── CLI ──────────────────────────────────────────────────────────────────


def main():
    _ensure_file_logging()

    parser = argparse.ArgumentParser(description="Pool-based flight scraper scheduler")
    parser.add_argument("--once", action="store_true",
                        help="Claim and scrape one due route, then exit")
    parser.add_argument("--route", nargs=2, metavar=("ORIGIN", "DEST"),
                        help="Force-run one specific route and exit (bypasses due check)")
    parser.add_argument("--dry-run", action="store_true",
                        help="List up to 20 next-due routes; scrape nothing")
    parser.add_argument("--ignore-window", action="store_true",
                        help="Skip the 7-23 active window check (one-shot modes only)")
    parser.add_argument("--direct-only", action="store_true",
                        help="Pass direct_only=True to fli (no stops)")
    args = parser.parse_args()

    # Dry-run.
    if args.dry_run:
        repo = ScrapeTargetRepository()
        overdue = repo.list_overdue(limit=20)
        logger.info(f"{len(overdue)} routes overdue. First 20:")
        for t in overdue:
            logger.info(f"  {t.route_key} (tier {t.tier}) due {t.next_due_at}")
        return

    # Specific route.
    if args.route:
        origin, dest = [c.upper() for c in args.route]
        repo = ScrapeTargetRepository()
        t = repo.find_by_route(origin, dest)
        tier = t.tier if t else "A"
        if not t:
            logger.warning(f"{origin}-{dest} not in scrape_targets; running anyway as tier A")
        if not args.ignore_window and not in_active_window():
            logger.warning("Outside active window — proceeding anyway because of explicit --route")
        scrape_one_route(origin, dest, tier, direct_only=args.direct_only)
        return

    # One slot, exit.
    if args.once:
        if not args.ignore_window and not in_active_window():
            logger.warning("Outside active window — proceeding anyway because of --once")
        scraped = run_one_slot(direct_only=args.direct_only)
        if not scraped:
            logger.info("No routes were due.")
        return

    # Continuous.
    run_forever(direct_only=args.direct_only)


if __name__ == "__main__":
    main()
