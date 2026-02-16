"""
Destination preference model - user's preferred travel destinations.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from bson import ObjectId


@dataclass
class DestinationPreference:
    """
    User's destination preference.

    MongoDB document structure:
    {
        "_id": ObjectId,
        "user_id": ObjectId,
        "destination_code": "BCN",
        "destination_name": "Barcelona",
        "priority": 1,  # 1 = high, 2 = medium, 3 = low
        "max_price": 100.0,  # Max price user is willing to pay for this destination
        "is_active": true,
        "created_at": datetime,
        "updated_at": datetime
    }
    """
    user_id: ObjectId
    destination_code: str
    destination_name: str = ""
    priority: int = 2  # 1 = high, 2 = medium, 3 = low
    max_price: Optional[float] = None  # None = use user's default max_price_alert
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

        # Uppercase destination code
        self.destination_code = self.destination_code.upper()

    @property
    def id(self) -> Optional[str]:
        """Return string ID."""
        return str(self._id) if self._id else None

    @property
    def priority_label(self) -> str:
        """Return human-readable priority label."""
        labels = {1: "high", 2: "medium", 3: "low"}
        return labels.get(self.priority, "medium")

    def to_dict(self) -> dict:
        """Convert to dictionary for MongoDB storage."""
        doc = {
            "user_id": self.user_id,
            "destination_code": self.destination_code,
            "destination_name": self.destination_name,
            "priority": self.priority,
            "max_price": self.max_price,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_dict(cls, data: dict) -> "DestinationPreference":
        """Create DestinationPreference from MongoDB document."""
        return cls(
            _id=data.get("_id"),
            user_id=data.get("user_id"),
            destination_code=data.get("destination_code", ""),
            destination_name=data.get("destination_name", ""),
            priority=data.get("priority", 2),
            max_price=data.get("max_price"),
            is_active=data.get("is_active", True),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )

    def to_api_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "user_id": str(self.user_id),
            "destination_code": self.destination_code,
            "destination_name": self.destination_name,
            "priority": self.priority,
            "priority_label": self.priority_label,
            "max_price": self.max_price,
            "is_active": self.is_active,
        }

    def __str__(self):
        price_str = f" (max €{self.max_price})" if self.max_price else ""
        return f"{self.destination_code} [{self.priority_label}]{price_str}"
