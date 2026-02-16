"""
Destination preference repository with user and reverse lookups.
"""

from datetime import datetime
from typing import Optional
from bson import ObjectId

from ..connection import get_collection
from ..config import COLLECTION_DESTINATIONS
from ..models.destination import DestinationPreference


class DestinationRepository:
    """Repository for DestinationPreference CRUD operations."""

    def __init__(self):
        self.collection = get_collection(COLLECTION_DESTINATIONS)

    # Create
    def create(
        self,
        user_id: str,
        destination_code: str,
        destination_name: str = "",
        priority: int = 2,
        max_price: Optional[float] = None
    ) -> DestinationPreference:
        """
        Create a new destination preference.

        Args:
            user_id: User's ID
            destination_code: Airport code (e.g., "BCN")
            destination_name: Optional full name
            priority: 1 = high, 2 = medium, 3 = low
            max_price: Max price for this destination (None = use user default)

        Returns:
            Created DestinationPreference object
        """
        # Check if user already has this destination
        existing = self.find_by_user_and_destination(user_id, destination_code)
        if existing:
            # Reactivate and update if exists
            existing.is_active = True
            existing.priority = priority
            existing.max_price = max_price
            existing.destination_name = destination_name or existing.destination_name
            self.update(existing)
            return existing

        destination = DestinationPreference(
            user_id=ObjectId(user_id),
            destination_code=destination_code.upper(),
            destination_name=destination_name,
            priority=priority,
            max_price=max_price,
        )

        result = self.collection.insert_one(destination.to_dict())
        destination._id = result.inserted_id

        return destination

    def create_many(
        self,
        user_id: str,
        destinations: list[tuple[str, int, Optional[float]]]
    ) -> list[DestinationPreference]:
        """
        Create multiple destination preferences at once.

        Args:
            user_id: User's ID
            destinations: List of (code, priority, max_price) tuples

        Returns:
            List of created DestinationPreference objects
        """
        prefs = []
        for code, priority, max_price in destinations:
            pref = self.create(user_id, code, "", priority, max_price)
            prefs.append(pref)
        return prefs

    # Read
    def find_by_id(self, pref_id: str) -> Optional[DestinationPreference]:
        """Find a destination preference by ID."""
        try:
            doc = self.collection.find_one({"_id": ObjectId(pref_id)})
            return DestinationPreference.from_dict(doc) if doc else None
        except Exception:
            return None

    def find_by_user(self, user_id: str, active_only: bool = True) -> list[DestinationPreference]:
        """
        Find all destination preferences for a user.

        Args:
            user_id: User's ID
            active_only: Only return active preferences

        Returns:
            List of DestinationPreference objects sorted by priority
        """
        query = {"user_id": ObjectId(user_id)}
        if active_only:
            query["is_active"] = True

        docs = self.collection.find(query).sort("priority", 1)
        return [DestinationPreference.from_dict(doc) for doc in docs]

    def find_by_user_and_destination(
        self,
        user_id: str,
        destination_code: str
    ) -> Optional[DestinationPreference]:
        """Find a specific destination preference for a user."""
        doc = self.collection.find_one({
            "user_id": ObjectId(user_id),
            "destination_code": destination_code.upper()
        })
        return DestinationPreference.from_dict(doc) if doc else None

    def find_users_wanting_destination(
        self,
        destination_code: str,
        active_only: bool = True
    ) -> list[ObjectId]:
        """
        Find all user IDs who want a specific destination.
        Useful for reverse lookup when a deal is found.

        Args:
            destination_code: Airport code (e.g., "BCN")
            active_only: Only return active preferences

        Returns:
            List of user ObjectIds
        """
        query = {"destination_code": destination_code.upper()}
        if active_only:
            query["is_active"] = True

        docs = self.collection.find(query, {"user_id": 1})
        return list(set(doc["user_id"] for doc in docs))

    def find_high_priority_destinations(self, user_id: str) -> list[DestinationPreference]:
        """Find high priority (priority=1) destinations for a user."""
        docs = self.collection.find({
            "user_id": ObjectId(user_id),
            "is_active": True,
            "priority": 1
        })
        return [DestinationPreference.from_dict(doc) for doc in docs]

    def get_destination_codes_for_user(self, user_id: str) -> list[str]:
        """Get just the destination codes for a user (for scraper)."""
        docs = self.collection.find(
            {"user_id": ObjectId(user_id), "is_active": True},
            {"destination_code": 1}
        )
        return [doc["destination_code"] for doc in docs]

    def get_all_active_destination_codes(self) -> list[str]:
        """Get all unique destination codes across all users."""
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$destination_code"}},
            {"$sort": {"_id": 1}}
        ]
        result = self.collection.aggregate(pipeline)
        return [doc["_id"] for doc in result]

    # Update
    def update(self, pref: DestinationPreference) -> bool:
        """Update an existing destination preference."""
        if not pref._id:
            return False

        pref.updated_at = datetime.utcnow()
        result = self.collection.update_one(
            {"_id": pref._id},
            {"$set": pref.to_dict()}
        )
        return result.modified_count > 0

    def update_priority(self, pref_id: str, priority: int) -> bool:
        """Update the priority of a destination preference."""
        result = self.collection.update_one(
            {"_id": ObjectId(pref_id)},
            {
                "$set": {
                    "priority": priority,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    def update_max_price(self, pref_id: str, max_price: Optional[float]) -> bool:
        """Update the max price for a destination preference."""
        result = self.collection.update_one(
            {"_id": ObjectId(pref_id)},
            {
                "$set": {
                    "max_price": max_price,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    def deactivate(self, pref_id: str) -> bool:
        """Deactivate a destination preference."""
        result = self.collection.update_one(
            {"_id": ObjectId(pref_id)},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    def activate(self, pref_id: str) -> bool:
        """Activate a destination preference."""
        result = self.collection.update_one(
            {"_id": ObjectId(pref_id)},
            {
                "$set": {
                    "is_active": True,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    # Delete
    def delete(self, pref_id: str) -> bool:
        """Delete a destination preference (hard delete)."""
        result = self.collection.delete_one({"_id": ObjectId(pref_id)})
        return result.deleted_count > 0

    def delete_all_for_user(self, user_id: str) -> int:
        """Delete all destination preferences for a user. Returns count deleted."""
        result = self.collection.delete_many({"user_id": ObjectId(user_id)})
        return result.deleted_count

    # Stats
    def count_by_user(self, user_id: str, active_only: bool = True) -> int:
        """Count destination preferences for a user."""
        query = {"user_id": ObjectId(user_id)}
        if active_only:
            query["is_active"] = True
        return self.collection.count_documents(query)

    def get_popular_destinations(self, limit: int = 10) -> list[tuple[str, int]]:
        """
        Get most popular destinations across all users.

        Returns:
            List of (destination_code, user_count) tuples
        """
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$destination_code", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        result = self.collection.aggregate(pipeline)
        return [(doc["_id"], doc["count"]) for doc in result]
