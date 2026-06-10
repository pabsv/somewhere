"""
ScrapeRun model — one document per scraper execution of one route.

Pure observability log. TTL-deleted after SCRAPE_RUNS_TTL_DAYS.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ScrapeRunModel:
    origin: str
    destination: str
    tier: str
    started_at: datetime

    finished_at: Optional[datetime] = None
    status: str = "running"          # "running" | "success" | "empty" | "error"
    flight_count: int = 0
    api_calls: int = 0               # SearchDates + SearchFlights combined
    cheapest_price: Optional[float] = None
    error_message: Optional[str] = None
    duration_seconds: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "origin": self.origin,
            "destination": self.destination,
            "route_key": f"{self.origin}-{self.destination}",
            "tier": self.tier,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "status": self.status,
            "flight_count": self.flight_count,
            "api_calls": self.api_calls,
            "cheapest_price": self.cheapest_price,
            "error_message": self.error_message,
            "duration_seconds": self.duration_seconds,
        }
