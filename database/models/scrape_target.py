"""
ScrapeTarget model — one document per (origin, destination) route in the pool.

Owns per-route scheduling state: when it's due next, what tier it's in,
running success/failure counts, and an enabled flag for auto-disable.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ScrapeTargetModel:
    origin: str
    destination: str
    tier: str  # "A" | "B" | "C"

    enabled: bool = True
    last_scraped_at: Optional[datetime] = None
    next_due_at: Optional[datetime] = None
    last_status: Optional[str] = None        # "success" | "empty" | "error"
    last_error: Optional[str] = None
    last_flight_count: int = 0

    total_runs: int = 0
    success_runs: int = 0
    empty_runs: int = 0
    error_runs: int = 0
    consecutive_failures: int = 0            # success or non-empty resets to 0

    # Lightweight running stats (computed in repo on each save)
    avg_price: Optional[float] = None            # EWMA of cheapest-per-run
    price_p50_ewma: Optional[float] = None       # EWMA of median-per-run (scoring baseline)
    min_price_seen: Optional[float] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @property
    def route_key(self) -> str:
        return f"{self.origin}-{self.destination}"

    def to_dict(self) -> dict:
        return {
            "route_key": self.route_key,
            "origin": self.origin,
            "destination": self.destination,
            "tier": self.tier,
            "enabled": self.enabled,
            "last_scraped_at": self.last_scraped_at,
            "next_due_at": self.next_due_at,
            "last_status": self.last_status,
            "last_error": self.last_error,
            "last_flight_count": self.last_flight_count,
            "total_runs": self.total_runs,
            "success_runs": self.success_runs,
            "empty_runs": self.empty_runs,
            "error_runs": self.error_runs,
            "consecutive_failures": self.consecutive_failures,
            "avg_price": self.avg_price,
            "price_p50_ewma": self.price_p50_ewma,
            "min_price_seen": self.min_price_seen,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ScrapeTargetModel":
        return cls(
            origin=data["origin"],
            destination=data["destination"],
            tier=data.get("tier", "C"),
            enabled=data.get("enabled", True),
            last_scraped_at=data.get("last_scraped_at"),
            next_due_at=data.get("next_due_at"),
            last_status=data.get("last_status"),
            last_error=data.get("last_error"),
            last_flight_count=data.get("last_flight_count", 0),
            total_runs=data.get("total_runs", 0),
            success_runs=data.get("success_runs", 0),
            empty_runs=data.get("empty_runs", 0),
            error_runs=data.get("error_runs", 0),
            consecutive_failures=data.get("consecutive_failures", 0),
            avg_price=data.get("avg_price"),
            price_p50_ewma=data.get("price_p50_ewma"),
            min_price_seen=data.get("min_price_seen"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )
