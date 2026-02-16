"""
Route statistics model - aggregated price data for routes.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from bson import ObjectId


@dataclass
class RouteStats:
    """
    Aggregated statistics for a route.

    MongoDB document structure:
    {
        "_id": ObjectId,
        "route_key": "EIN-BCN",
        "origin": "EIN",
        "destination": "BCN",
        "average_price": 95.0,
        "min_price_ever": 45.0,
        "max_price_ever": 250.0,
        "sample_count": 1500,
        "monthly_averages": {
            "2026-01": 85.0,
            "2026-02": 95.0,
            "2026-03": 110.0,
            ...
        },
        "last_updated": datetime
    }
    """
    route_key: str
    origin: str = ""
    destination: str = ""
    average_price: float = 0.0
    min_price_ever: float = 0.0
    max_price_ever: float = 0.0
    sample_count: int = 0
    monthly_averages: dict = field(default_factory=dict)  # {"2026-01": 85.0, ...}
    last_updated: Optional[datetime] = None
    _id: Optional[ObjectId] = None

    def __post_init__(self):
        if self.last_updated is None:
            self.last_updated = datetime.utcnow()

        # Extract origin/destination from route_key if not set
        if not self.origin or not self.destination:
            parts = self.route_key.split("-")
            if len(parts) >= 2:
                self.origin = parts[0]
                self.destination = parts[1]

    @property
    def id(self) -> Optional[str]:
        """Return string ID."""
        return str(self._id) if self._id else None

    def get_current_month_average(self) -> Optional[float]:
        """Get the average for the current month."""
        month_key = datetime.utcnow().strftime("%Y-%m")
        return self.monthly_averages.get(month_key)

    def get_month_average(self, year: int, month: int) -> Optional[float]:
        """Get the average for a specific month."""
        month_key = f"{year:04d}-{month:02d}"
        return self.monthly_averages.get(month_key)

    def is_below_average(self, price: float) -> bool:
        """Check if a price is below the route average."""
        return price < self.average_price

    def percent_below_average(self, price: float) -> float:
        """Calculate how much below average a price is (negative = below)."""
        if self.average_price == 0:
            return 0.0
        return ((price - self.average_price) / self.average_price) * 100

    def to_dict(self) -> dict:
        """Convert to dictionary for MongoDB storage."""
        doc = {
            "route_key": self.route_key,
            "origin": self.origin,
            "destination": self.destination,
            "average_price": self.average_price,
            "min_price_ever": self.min_price_ever,
            "max_price_ever": self.max_price_ever,
            "sample_count": self.sample_count,
            "monthly_averages": self.monthly_averages,
            "last_updated": self.last_updated,
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_dict(cls, data: dict) -> "RouteStats":
        """Create RouteStats from MongoDB document."""
        return cls(
            _id=data.get("_id"),
            route_key=data.get("route_key", ""),
            origin=data.get("origin", ""),
            destination=data.get("destination", ""),
            average_price=data.get("average_price", 0.0),
            min_price_ever=data.get("min_price_ever", 0.0),
            max_price_ever=data.get("max_price_ever", 0.0),
            sample_count=data.get("sample_count", 0),
            monthly_averages=data.get("monthly_averages", {}),
            last_updated=data.get("last_updated"),
        )

    def to_api_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "route_key": self.route_key,
            "origin": self.origin,
            "destination": self.destination,
            "average_price": round(self.average_price, 2),
            "min_price_ever": round(self.min_price_ever, 2),
            "max_price_ever": round(self.max_price_ever, 2),
            "sample_count": self.sample_count,
            "monthly_averages": {k: round(v, 2) for k, v in self.monthly_averages.items()},
            "current_month_average": self.get_current_month_average(),
        }

    def __str__(self):
        return (
            f"{self.route_key}: avg €{self.average_price:.0f} "
            f"(min €{self.min_price_ever:.0f}, max €{self.max_price_ever:.0f}, "
            f"{self.sample_count} samples)"
        )
