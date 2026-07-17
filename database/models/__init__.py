"""Database models."""

from .user import User, UserAirports, UserNotifications, UserSearchPreferences
from .availability import Availability
from .destination import DestinationPreference
from .flight import FlightModel
from .oneway_fare import OnewayFareModel
from .price_history import PriceHistory
from .route_stats import RouteStats
from .scrape_target import ScrapeTargetModel
from .scrape_run import ScrapeRunModel

__all__ = [
    "User",
    "UserAirports",
    "UserNotifications",
    "UserSearchPreferences",
    "Availability",
    "DestinationPreference",
    "FlightModel",
    "OnewayFareModel",
    "PriceHistory",
    "RouteStats",
    "ScrapeTargetModel",
    "ScrapeRunModel",
]
