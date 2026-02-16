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

# TTL settings
PRICE_HISTORY_TTL_DAYS = 180  # Auto-delete price history after 180 days

# Deal detection settings
# Relative thresholds (compared to route average)
DEAL_THRESHOLD_PERCENT = 20  # Consider it a deal if price is X% below average
HOT_DEAL_THRESHOLD_PERCENT = 30  # Hot deal if price is X% below average

# Absolute price thresholds (always a deal regardless of history)
DEAL_PRICE_THRESHOLD = 100.0  # Anything under €100 round-trip is a deal
HOT_DEAL_PRICE_THRESHOLD = 75.0  # Anything under €75 round-trip is a hot deal
