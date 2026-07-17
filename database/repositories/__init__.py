"""Database repositories."""

from .user_repo import UserRepository
from .availability_repo import AvailabilityRepository
from .destination_repo import DestinationRepository
from .flight_repo import FlightRepository
from .oneway_fare_repo import OnewayFareRepository
from .price_history_repo import PriceHistoryRepository
from .route_stats_repo import RouteStatsRepository
from .scrape_target_repo import ScrapeTargetRepository
from .scrape_run_repo import ScrapeRunRepository

__all__ = [
    "UserRepository",
    "AvailabilityRepository",
    "DestinationRepository",
    "FlightRepository",
    "OnewayFareRepository",
    "PriceHistoryRepository",
    "RouteStatsRepository",
    "ScrapeTargetRepository",
    "ScrapeRunRepository",
]
