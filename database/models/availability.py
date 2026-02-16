"""
Availability model - user's available date ranges for travel.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from bson import ObjectId


@dataclass
class Availability:
    """
    User's availability window for travel.

    MongoDB document structure:
    {
        "_id": ObjectId,
        "user_id": ObjectId,
        "label": "Spring Break",
        "start_date": datetime,
        "end_date": datetime,
        "is_active": true,
        "created_at": datetime,
        "updated_at": datetime
    }
    """
    user_id: ObjectId
    start_date: datetime
    end_date: datetime
    label: str = ""
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    _id: Optional[ObjectId] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()

        # Convert string user_id to ObjectId if needed
        if isinstance(self.user_id, str):
            self.user_id = ObjectId(self.user_id)

    @property
    def id(self) -> Optional[str]:
        """Return string ID."""
        return str(self._id) if self._id else None

    @property
    def duration_days(self) -> int:
        """Return the number of days in this availability window."""
        return (self.end_date - self.start_date).days

    def contains_date(self, date: datetime) -> bool:
        """Check if a date falls within this availability window."""
        return self.start_date <= date <= self.end_date

    def overlaps_with(self, start: datetime, end: datetime) -> bool:
        """Check if this availability overlaps with a given date range."""
        return self.start_date <= end and self.end_date >= start

    def to_dict(self) -> dict:
        """Convert to dictionary for MongoDB storage."""
        doc = {
            "user_id": self.user_id,
            "label": self.label,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_dict(cls, data: dict) -> "Availability":
        """Create Availability from MongoDB document."""
        return cls(
            _id=data.get("_id"),
            user_id=data.get("user_id"),
            label=data.get("label", ""),
            start_date=data.get("start_date"),
            end_date=data.get("end_date"),
            is_active=data.get("is_active", True),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )

    def to_api_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "user_id": str(self.user_id),
            "label": self.label,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "duration_days": self.duration_days,
            "is_active": self.is_active,
        }

    def __str__(self):
        label_str = f" ({self.label})" if self.label else ""
        return f"{self.start_date.strftime('%Y-%m-%d')} to {self.end_date.strftime('%Y-%m-%d')}{label_str}"
