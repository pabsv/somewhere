"""
Flight Scraper API — FastAPI application entry point.

Multi-user, no password auth. Designed for local use.

Run from the project root:
    uvicorn api.main:app --reload --port 9000

Docs available at:
    http://localhost:9000/docs
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from .routes import admin, auth, deals, preferences, scrape

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Flight Scraper API",
    version="1.0.0",
)

# Allow requests from the Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4173", "http://localhost:5173"],
    allow_methods=["GET", "PUT", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(deals.router)
app.include_router(preferences.router)
app.include_router(scrape.router)


# ─── Background scheduler ─────────────────────────────────────────────────────
# Starts automatically with the API in simulate mode (1 cycle = 60 min).
# To change the mode, set SCHEDULER_SIMULATE=false in your environment.

_scheduler: BackgroundScheduler | None = None


@app.on_event("startup")
def start_background_scheduler():
    global _scheduler
    try:
        from scheduler.scheduler import configure_scheduler, job_listener
        _scheduler = BackgroundScheduler()
        _scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)
        configure_scheduler(_scheduler, simulate=True, warmup_minutes=1)
        _scheduler.start()
        logger.info("Background scheduler started (simulate mode: 1 cycle = 60 min)")
    except RuntimeError as e:
        # No users or no airports configured yet — not a crash, just skip
        logger.warning(f"Scheduler not started: {e}")
    except Exception as e:
        logger.error(f"Scheduler startup failed: {e}", exc_info=True)


@app.on_event("shutdown")
def stop_background_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "scheduler": _scheduler.running if _scheduler else False,
    }
