"""
User model with embedded airports and notification preferences.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional
from bson import ObjectId


@dataclass
class UserAirports:
    """User's airport preferences."""
    home: str = "EIN"  # Primary home airport
    nearby: list[str] = field(default_factory=lambda: ["AMS", "BRU"])

    def to_dict(self) -> dict:
        return {"home": self.home, "nearby": self.nearby}

    @classmethod
    def from_dict(cls, data: dict) -> "UserAirports":
        return cls(
            home=data.get("home", "EIN"),
            nearby=data.get("nearby", ["AMS", "BRU"])
        )


@dataclass
class UserNotifications:
    """User's notification preferences."""
    daily_digest: bool = True  # Receive daily summary email
    instant_alerts: bool = True  # Receive instant hot deal alerts
    max_price_alert: float = 75.0  # Only alert for flights under this price

    def to_dict(self) -> dict:
        return {
            "daily_digest": self.daily_digest,
            "instant_alerts": self.instant_alerts,
            "max_price_alert": self.max_price_alert
        }

    @classmethod
    def from_dict(cls, data: dict) -> "UserNotifications":
        return cls(
            daily_digest=data.get("daily_digest", True),
            instant_alerts=data.get("instant_alerts", True),
            max_price_alert=data.get("max_price_alert", 75.0)
        )


@dataclass
class UserSearchPreferences:
    """User's search preferences."""
    min_days: int = 2  # Minimum trip duration
    max_days: int = 7  # Maximum trip duration
    direct_only: bool = False  # Only show direct flights

    def to_dict(self) -> dict:
        return {
            "min_days": self.min_days,
            "max_days": self.max_days,
            "direct_only": self.direct_only
        }

    @classmethod
    def from_dict(cls, data: dict) -> "UserSearchPreferences":
        return cls(
            min_days=data.get("min_days", 2),
            max_days=data.get("max_days", 7),
            direct_only=data.get("direct_only", False)
        )


@dataclass
class User:
    """
    User model with embedded preferences.

    MongoDB document structure:
    {
        "_id": ObjectId,
        "email": "user@example.com",
        "password_hash": "bcrypt_hash",
        "airports": { "home": "EIN", "nearby": ["AMS", "BRU"] },
        "notifications": { "daily_digest": true, "instant_alerts": true, "max_price_alert": 75 },
        "search_preferences": { "min_days": 2, "max_days": 7, "direct_only": false },
        "is_active": true,
        "created_at": datetime,
        "updated_at": datetime
    }
    """
    email: str
    password_hash: str = ""
    airports: UserAirports = field(default_factory=UserAirports)
    notifications: UserNotifications = field(default_factory=UserNotifications)
    search_preferences: UserSearchPreferences = field(default_factory=UserSearchPreferences)
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    _id: Optional[ObjectId] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()

    @property
    def id(self) -> Optional[str]:
        """Return string ID."""
        return str(self._id) if self._id else None

    @property
    def all_airports(self) -> list[str]:
        """Return all airports (home + nearby) for searching."""
        airports = [self.airports.home]
        airports.extend(self.airports.nearby)
        return list(set(airports))

    def to_dict(self) -> dict:
        """Convert to dictionary for MongoDB storage."""
        doc = {
            "email": self.email,
            "password_hash": self.password_hash,
            "airports": self.airports.to_dict(),
            "notifications": self.notifications.to_dict(),
            "search_preferences": self.search_preferences.to_dict(),
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        """Create User from MongoDB document."""
        return cls(
            _id=data.get("_id"),
            email=data.get("email", ""),
            password_hash=data.get("password_hash", ""),
            airports=UserAirports.from_dict(data.get("airports", {})),
            notifications=UserNotifications.from_dict(data.get("notifications", {})),
            search_preferences=UserSearchPreferences.from_dict(data.get("search_preferences", {})),
            is_active=data.get("is_active", True),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )

    def to_safe_dict(self) -> dict:
        """Convert to dictionary without sensitive fields (for API responses)."""
        return {
            "id": self.id,
            "email": self.email,
            "airports": self.airports.to_dict(),
            "notifications": self.notifications.to_dict(),
            "search_preferences": self.search_preferences.to_dict(),
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
