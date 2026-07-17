"""
One-way fare grid model — open-jaw foundation.

One document per DIRECTED leg (origin -> destination), holding the full
date -> cheapest-one-way-price grid from the scraper's Phase-1 SearchDates
sweep. The grid is replaced wholesale on every scrape of the owning pool
route, so past dates self-clean and no per-date TTL churn is needed.

Because every pool route is swept in both directions, this collection ends
up containing every leg needed to combine open-jaw trips at read time:
  - origin-side   (EIN->BCN out, BCN->AMS back): EIN-BCN x BCN-AMS
  - destination-side (EIN->BCN out, MAD->EIN back): EIN-BCN x MAD-EIN
An open-jaw combo's price = sum of the two one-way fares, which is the
actual bookable price (two separate tickets).

Caveat for future readers: return-direction grids start at ~today+min_nights
(the sweep window is shifted), so very-near-term dates in that direction may
be missing the first couple of days.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from bson import ObjectId


@dataclass
class OnewayFareModel:
    """
    One-way fare grid for a directed leg.

    MongoDB document structure:
    {
        "_id": ObjectId,
        "leg_key": "EIN-BCN",
        "origin": "EIN",
        "destination": "BCN",
        "currency": "EUR",
        "prices": {"2026-07-20": 45.0, "2026-07-21": 39.0, ...},
        "price_count": 178,     # derived — diagnostics
        "min_price": 19.0,      # derived — diagnostics
        "first_seen_at": datetime,
        "scraped_at": datetime  # TTL anchor
    }
    """
    origin: str
    destination: str

    # "YYYY-MM-DD" -> cheapest one-way fare in EUR, replaced wholesale each scrape
    prices: dict = field(default_factory=dict)
    currency: str = "EUR"

    # Timestamps
    first_seen_at: Optional[datetime] = None
    scraped_at: Optional[datetime] = None

    # MongoDB ID
    _id: Optional[ObjectId] = None

    def __post_init__(self):
        now = datetime.utcnow()
        if self.first_seen_at is None:
            self.first_seen_at = now
        if self.scraped_at is None:
            self.scraped_at = now

    @property
    def id(self) -> Optional[str]:
        """Return string ID."""
        return str(self._id) if self._id else None

    @property
    def leg_key(self) -> str:
        """Unique identifier for this directed leg."""
        return f"{self.origin}-{self.destination}"

    def to_dict(self) -> dict:
        """Convert to dictionary for MongoDB storage."""
        doc = {
            "leg_key": self.leg_key,
            "origin": self.origin,
            "destination": self.destination,
            "currency": self.currency,
            "prices": self.prices,
            "price_count": len(self.prices),
            "min_price": min(self.prices.values()) if self.prices else None,
            "first_seen_at": self.first_seen_at,
            "scraped_at": self.scraped_at,
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_dict(cls, data: dict) -> "OnewayFareModel":
        """Create OnewayFareModel from MongoDB document."""
        return cls(
            _id=data.get("_id"),
            origin=data.get("origin", ""),
            destination=data.get("destination", ""),
            prices=data.get("prices", {}),
            currency=data.get("currency", "EUR"),
            first_seen_at=data.get("first_seen_at"),
            scraped_at=data.get("scraped_at"),
        )

    def __str__(self):
        cheapest = min(self.prices.values()) if self.prices else None
        cheapest_str = f"€{cheapest:.0f}" if cheapest is not None else "n/a"
        return f"{self.leg_key}: {len(self.prices)} dates, min {cheapest_str}"
