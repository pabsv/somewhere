"""
Flight Scraper Database Layer

Provides MongoDB models, repositories, and services for:
- Users with airports and notification preferences
- Availability date ranges
- Destination preferences
- Flights with price history
- Route statistics for deal detection

Usage:
    from database.services import FlightService, UserMatcher
    from database.repositories import UserRepository, FlightRepository

    # Save scraped flights
    service = FlightService()
    result = service.save_scraped_flights(flights)

    # Find deals for a user
    matcher = UserMatcher()
    deals = matcher.find_deals_for_user(user_id)
"""

from .connection import get_database, get_collection, close_connection
from .config import (
    COLLECTION_USERS,
    COLLECTION_AVAILABILITY,
    COLLECTION_DESTINATIONS,
    COLLECTION_FLIGHTS,
    COLLECTION_PRICE_HISTORY,
    COLLECTION_ROUTE_STATS,
)

# Import services for convenience
from .services.flight_service import FlightService
from .services.user_matcher import UserMatcher

__all__ = [
    # Connection
    "get_database",
    "get_collection",
    "close_connection",
    # Collection names
    "COLLECTION_USERS",
    "COLLECTION_AVAILABILITY",
    "COLLECTION_DESTINATIONS",
    "COLLECTION_FLIGHTS",
    "COLLECTION_PRICE_HISTORY",
    "COLLECTION_ROUTE_STATS",
    # Services
    "FlightService",
    "UserMatcher",
]
