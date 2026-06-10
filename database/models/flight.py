"""
Flight model - scraped flight data with price statistics.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any
from bson import ObjectId
import sys
import os

# Add scraper-azair to path for Flight import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scraper-azair"))


@dataclass
class FlightModel:
    """
    Flight model for database storage.

    MongoDB document structure:
    {
        "_id": ObjectId,
        "flight_key": "EIN-BCN-2026-03-15-2026-03-20-85.0",
        "origin": "EIN",
        "destination": "BCN",
        "outbound_date": "2026-03-15",
        "return_date": "2026-03-20",
        "duration_days": 5,
        "price": 85.0,
        "currency": "EUR",
        "airlines": ["Ryanair"],
        "outbound_departure": "06:25",
        "outbound_arrival": "09:10",
        "return_departure": "19:30",
        "return_arrival": "22:15",
        "outbound_duration": "2h 45m",
        "return_duration": "2h 45m",
        "outbound_stops": 0,
        "return_stops": 0,
        "azair_link": "https://...",
        "price_stats": { "lowest": 70, "highest": 150, "average": 95, "current_vs_avg_percent": -10.5 },
        "is_deal": true,
        "deal_score": 75,
        "first_seen_at": datetime,
        "last_seen_at": datetime,
        "scraped_at": datetime
    }
    """
    # Route info
    origin: str
    destination: str

    # Dates
    outbound_date: str
    return_date: str
    duration_days: int

    # Price
    price: float
    currency: str = "EUR"

    # Flight details
    airlines: list[str] = field(default_factory=list)
    outbound_departure: str = ""
    outbound_arrival: str = ""
    return_departure: str = ""
    return_arrival: str = ""
    outbound_duration: str = ""
    return_duration: str = ""
    outbound_stops: int = 0
    return_stops: int = 0

    # Booking
    azair_link: str = ""
    search_link: str = ""    # Google Flights URL (for Fli-sourced flights)
    source: str = "azair"    # "azair" or "fli"

    # Deal detection
    is_deal: bool = False
    deal_score: int = 0  # 0-100, higher = better deal

    # Timestamps
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    scraped_at: Optional[datetime] = None

    # MongoDB ID
    _id: Optional[ObjectId] = None

    def __post_init__(self):
        now = datetime.utcnow()
        if self.first_seen_at is None:
            self.first_seen_at = now
        if self.last_seen_at is None:
            self.last_seen_at = now
        if self.scraped_at is None:
            self.scraped_at = now

    @property
    def id(self) -> Optional[str]:
        """Return string ID."""
        return str(self._id) if self._id else None

    @property
    def flight_key(self) -> str:
        """Unique identifier for this specific flight."""
        return f"{self.origin}-{self.destination}-{self.outbound_date}-{self.return_date}-{self.price}"

    @property
    def route_key(self) -> str:
        """Key for route statistics."""
        return f"{self.origin}-{self.destination}"

    @property
    def is_direct(self) -> bool:
        """Check if both legs are direct flights."""
        return self.outbound_stops == 0 and self.return_stops == 0

    def to_dict(self) -> dict:
        """Convert to dictionary for MongoDB storage."""
        doc = {
            "flight_key": self.flight_key,
            "origin": self.origin,
            "destination": self.destination,
            "outbound_date": self.outbound_date,
            "return_date": self.return_date,
            "duration_days": self.duration_days,
            "price": self.price,
            "currency": self.currency,
            "airlines": self.airlines,
            "outbound_departure": self.outbound_departure,
            "outbound_arrival": self.outbound_arrival,
            "return_departure": self.return_departure,
            "return_arrival": self.return_arrival,
            "outbound_duration": self.outbound_duration,
            "return_duration": self.return_duration,
            "outbound_stops": self.outbound_stops,
            "return_stops": self.return_stops,
            "azair_link": self.azair_link,
            "search_link": self.search_link,
            "source": self.source,
            "is_deal": self.is_deal,
            "deal_score": self.deal_score,
            "first_seen_at": self.first_seen_at,
            "last_seen_at": self.last_seen_at,
            "scraped_at": self.scraped_at,
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_dict(cls, data: dict) -> "FlightModel":
        """Create FlightModel from MongoDB document."""
        return cls(
            _id=data.get("_id"),
            origin=data.get("origin", ""),
            destination=data.get("destination", ""),
            outbound_date=data.get("outbound_date", ""),
            return_date=data.get("return_date", ""),
            duration_days=data.get("duration_days", 0),
            price=data.get("price", 0.0),
            currency=data.get("currency", "EUR"),
            airlines=data.get("airlines", []),
            outbound_departure=data.get("outbound_departure", ""),
            outbound_arrival=data.get("outbound_arrival", ""),
            return_departure=data.get("return_departure", ""),
            return_arrival=data.get("return_arrival", ""),
            outbound_duration=data.get("outbound_duration", ""),
            return_duration=data.get("return_duration", ""),
            outbound_stops=data.get("outbound_stops", 0),
            return_stops=data.get("return_stops", 0),
            azair_link=data.get("azair_link", ""),
            search_link=data.get("search_link", ""),
            source=data.get("source", "azair"),
            is_deal=data.get("is_deal", False),
            deal_score=data.get("deal_score", 0),
            first_seen_at=data.get("first_seen_at"),
            last_seen_at=data.get("last_seen_at"),
            scraped_at=data.get("scraped_at"),
        )

    @classmethod
    def from_scraper_flight(cls, flight: Any) -> "FlightModel":
        """
        Create FlightModel from scraper's Flight dataclass.

        Args:
            flight: Flight object from parser.py

        Returns:
            FlightModel ready for database storage
        """
        return cls(
            origin=flight.origin,
            destination=flight.destination,
            outbound_date=flight.outbound_date,
            return_date=flight.return_date,
            duration_days=flight.duration_days,
            price=flight.price,
            currency=flight.currency,
            airlines=flight.airlines,
            outbound_departure=flight.outbound_departure,
            outbound_arrival=flight.outbound_arrival,
            return_departure=flight.return_departure,
            return_arrival=flight.return_arrival,
            outbound_duration=flight.outbound_duration,
            return_duration=flight.return_duration,
            outbound_stops=flight.outbound_stops,
            return_stops=flight.return_stops,
            azair_link=flight.azair_link,
            search_link=getattr(flight, "search_link", "") or "",
            source=getattr(flight, "source", "azair"),
        )

    def to_api_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "flight_key": self.flight_key,
            "route_key": self.route_key,
            "origin": self.origin,
            "destination": self.destination,
            "outbound_date": self.outbound_date,
            "return_date": self.return_date,
            "duration_days": self.duration_days,
            "price": self.price,
            "currency": self.currency,
            "airlines": self.airlines,
            "outbound_departure": self.outbound_departure,
            "outbound_arrival": self.outbound_arrival,
            "return_departure": self.return_departure,
            "return_arrival": self.return_arrival,
            "outbound_duration": self.outbound_duration,
            "return_duration": self.return_duration,
            "outbound_stops": self.outbound_stops,
            "return_stops": self.return_stops,
            "is_direct": self.is_direct,
            "azair_link": self.azair_link,
            "search_link": self.search_link,
            "source": self.source,
            "is_deal": self.is_deal,
            "deal_score": self.deal_score,
            "first_seen_at": self.first_seen_at.isoformat() if self.first_seen_at else None,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
        }

    def __str__(self):
        stops = "direct" if self.is_direct else f"{self.outbound_stops}stop"
        deal_str = f" DEAL({self.deal_score})" if self.is_deal else ""
        return (
            f"{self.origin}->{self.destination}: €{self.price:.0f} "
            f"({self.outbound_date} to {self.return_date}, {self.duration_days}d, {stops}){deal_str}"
        )
