"""
Price history model - historical price snapshots for flights.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from bson import ObjectId


@dataclass
class PriceHistory:
    """
    Price snapshot for a flight.

    MongoDB document structure:
    {
        "_id": ObjectId,
        "flight_key": "EIN-BCN-2026-03-15-2026-03-20-85.0",
        "route_key": "EIN-BCN",
        "price": 85.0,
        "scraped_at": datetime
    }

    Has TTL index on scraped_at for auto-deletion after 180 days.
    """
    flight_key: str
    route_key: str
    price: float
    scraped_at: Optional[datetime] = None
    _id: Optional[ObjectId] = None

    def __post_init__(self):
        if self.scraped_at is None:
            self.scraped_at = datetime.utcnow()

    @property
    def id(self) -> Optional[str]:
        """Return string ID."""
        return str(self._id) if self._id else None

    def to_dict(self) -> dict:
        """Convert to dictionary for MongoDB storage."""
        doc = {
            "flight_key": self.flight_key,
            "route_key": self.route_key,
            "price": self.price,
            "scraped_at": self.scraped_at,
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_dict(cls, data: dict) -> "PriceHistory":
        """Create PriceHistory from MongoDB document."""
        return cls(
            _id=data.get("_id"),
            flight_key=data.get("flight_key", ""),
            route_key=data.get("route_key", ""),
            price=data.get("price", 0.0),
            scraped_at=data.get("scraped_at"),
        )

    @classmethod
    def from_flight(cls, flight_key: str, route_key: str, price: float) -> "PriceHistory":
        """Create PriceHistory from flight data."""
        return cls(
            flight_key=flight_key,
            route_key=route_key,
            price=price,
        )
