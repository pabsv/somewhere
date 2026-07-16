"""
MongoDB configuration settings.

Uses environment variables with sensible defaults for local development.
"""

import os
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

# MongoDB connection settings
MONGO_HOST = os.getenv("MONGO_HOST", "localhost")
MONGO_PORT = int(os.getenv("MONGO_PORT", "27017"))
MONGO_DATABASE = os.getenv("MONGO_DATABASE", "flight_scraper")

# Optional authentication (for production)
MONGO_USERNAME = os.getenv("MONGO_USERNAME", "")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "")

# Connection string builder
def get_connection_string() -> str:
    """Build MongoDB connection string."""
    # Atlas / full URI takes priority (set MONGODB_URI env var for production)
    uri = os.getenv("MONGODB_URI")
    if uri:
        return uri
    # Local fallback
    if MONGO_USERNAME and MONGO_PASSWORD:
        return f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/{MONGO_DATABASE}"
    return f"mongodb://{MONGO_HOST}:{MONGO_PORT}/{MONGO_DATABASE}"

# Collection names
COLLECTION_USERS = "users"
COLLECTION_AVAILABILITY = "availability"
COLLECTION_DESTINATIONS = "destination_preferences"
COLLECTION_FLIGHTS = "flights"
COLLECTION_PRICE_HISTORY = "price_history"
COLLECTION_ROUTE_STATS = "route_stats"
COLLECTION_SCHEDULE_STATE = "schedule_state"
COLLECTION_SCRAPE_TARGETS = "scrape_targets"   # pool-based scraping config
COLLECTION_SCRAPE_RUNS = "scrape_runs"         # per-execution log for observability
COLLECTION_FRIENDSHIPS = "friendships"         # friend requests + accepted pairs (written by frontend)
COLLECTION_GROUPS = "groups"          # travel groups + embedded invite tokens (written by frontend)

# TTL settings
FLIGHTS_TTL_DAYS = 14          # Auto-delete flights not re-seen in 14 days
SCRAPE_RUNS_TTL_DAYS = 30      # Auto-delete scrape run logs after 30 days

# Price sanity guard — flights outside (MIN, MAX] are dropped before save.
# Deal scoring itself lives in the frontend (frontend/lib/score.ts).
PRICE_SANITY_MIN = 5
PRICE_SANITY_MAX = 3000

# ─── Pool scheduler config ────────────────────────────────────────────────
# Active scraping window (local time, 24h). Outside this window scheduler idles.
# 0–24 = always on: the box runs 24/7, and spreading slots over the full day
# leaves headroom for more origin airports later.
ACTIVE_WINDOW_START_HOUR = 0   # 00:00
ACTIVE_WINDOW_END_HOUR = 24    # 24:00 (never idles)

# Minutes between slots inside the active window.
# 24h * 60 / 2 = 720 slots/day → comfortably covers ~437 daily target with headroom.
SLOT_MINUTES = 2

# Cadence per tier — how long to wait before the same route is due again.
TIER_A_HOURS = 24    # daily
TIER_B_HOURS = 72    # every 3 days
TIER_C_HOURS = 168   # weekly

# Per-route scrape parameters (used by pool scheduler).
SCRAPE_WINDOW_DAYS = 180             # how far ahead to look (~6 months — MVP target)
SCRAPE_DURATION_BUCKETS = [3, 7, 10] # trip lengths (weekend, week, long)
SCRAPE_TOP_N_CHEAP_DATES = 6         # Phase-2 detail fetches per route per cycle

# Auto-disable a route after this many consecutive empty/error runs.
ROUTE_MAX_CONSECUTIVE_FAILURES = 5
