"""Database repositories."""

from .user_repo import UserRepository
from .availability_repo import AvailabilityRepository
from .destination_repo import DestinationRepository
from .flight_repo import FlightRepository
from .price_history_repo import PriceHistoryRepository
from .route_stats_repo import RouteStatsRepository

__all__ = [
    "UserRepository",
    "AvailabilityRepository",
    "DestinationRepository",
    "FlightRepository",
    "PriceHistoryRepository",
    "RouteStatsRepository",
]
