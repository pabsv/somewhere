"""Database models."""

from .user import User, UserAirports, UserNotifications, UserSearchPreferences
from .availability import Availability
from .destination import DestinationPreference
from .flight import FlightModel
from .price_history import PriceHistory
from .route_stats import RouteStats

__all__ = [
    "User",
    "UserAirports",
    "UserNotifications",
    "UserSearchPreferences",
    "Availability",
    "DestinationPreference",
    "FlightModel",
    "PriceHistory",
    "RouteStats",
]
