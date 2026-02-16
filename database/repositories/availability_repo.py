"""
Availability repository with CRUD and date range queries.
"""

from datetime import datetime
from typing import Optional
from bson import ObjectId

from ..connection import get_collection
from ..config import COLLECTION_AVAILABILITY
from ..models.availability import Availability


class AvailabilityRepository:
    """Repository for Availability CRUD operations."""

    def __init__(self):
        self.collection = get_collection(COLLECTION_AVAILABILITY)

    # Create
    def create(
        self,
        user_id: str,
        start_date: datetime,
        end_date: datetime,
        label: str = ""
    ) -> Availability:
        """
        Create a new availability window.

        Args:
            user_id: User's ID
            start_date: Start of availability
            end_date: End of availability
            label: Optional label (e.g., "Spring Break")

        Returns:
            Created Availability object
        """
        availability = Availability(
            user_id=ObjectId(user_id),
            start_date=start_date,
            end_date=end_date,
            label=label,
        )

        result = self.collection.insert_one(availability.to_dict())
        availability._id = result.inserted_id

        return availability

    def create_many(
        self,
        user_id: str,
        date_ranges: list[tuple[datetime, datetime, str]]
    ) -> list[Availability]:
        """
        Create multiple availability windows at once.

        Args:
            user_id: User's ID
            date_ranges: List of (start_date, end_date, label) tuples

        Returns:
            List of created Availability objects
        """
        availabilities = []
        for start, end, label in date_ranges:
            avail = self.create(user_id, start, end, label)
            availabilities.append(avail)
        return availabilities

    # Read
    def find_by_id(self, availability_id: str) -> Optional[Availability]:
        """Find an availability by ID."""
        try:
            doc = self.collection.find_one({"_id": ObjectId(availability_id)})
            return Availability.from_dict(doc) if doc else None
        except Exception:
            return None

    def find_by_user(self, user_id: str, active_only: bool = True) -> list[Availability]:
        """
        Find all availability windows for a user.

        Args:
            user_id: User's ID
            active_only: Only return active windows

        Returns:
            List of Availability objects sorted by start_date
        """
        query = {"user_id": ObjectId(user_id)}
        if active_only:
            query["is_active"] = True

        docs = self.collection.find(query).sort("start_date", 1)
        return [Availability.from_dict(doc) for doc in docs]

    def find_active_in_range(
        self,
        user_id: str,
        range_start: datetime,
        range_end: datetime
    ) -> list[Availability]:
        """
        Find active availability windows that overlap with a given date range.

        Args:
            user_id: User's ID
            range_start: Start of range to check
            range_end: End of range to check

        Returns:
            List of overlapping Availability objects
        """
        query = {
            "user_id": ObjectId(user_id),
            "is_active": True,
            # Window overlaps with range if: window_start <= range_end AND window_end >= range_start
            "start_date": {"$lte": range_end},
            "end_date": {"$gte": range_start},
        }

        docs = self.collection.find(query).sort("start_date", 1)
        return [Availability.from_dict(doc) for doc in docs]

    def find_future_windows(self, user_id: str) -> list[Availability]:
        """Find all future availability windows for a user."""
        now = datetime.utcnow()
        query = {
            "user_id": ObjectId(user_id),
            "is_active": True,
            "end_date": {"$gte": now},
        }

        docs = self.collection.find(query).sort("start_date", 1)
        return [Availability.from_dict(doc) for doc in docs]

    def find_all_active_future(self) -> list[Availability]:
        """
        Find all active future availability windows across all users.
        Useful for bulk scraping.
        """
        now = datetime.utcnow()
        query = {
            "is_active": True,
            "end_date": {"$gte": now},
        }

        docs = self.collection.find(query).sort([("user_id", 1), ("start_date", 1)])
        return [Availability.from_dict(doc) for doc in docs]

    # Update
    def update(self, availability: Availability) -> bool:
        """Update an existing availability window."""
        if not availability._id:
            return False

        availability.updated_at = datetime.utcnow()
        result = self.collection.update_one(
            {"_id": availability._id},
            {"$set": availability.to_dict()}
        )
        return result.modified_count > 0

    def update_dates(
        self,
        availability_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> bool:
        """Update the dates of an availability window."""
        result = self.collection.update_one(
            {"_id": ObjectId(availability_id)},
            {
                "$set": {
                    "start_date": start_date,
                    "end_date": end_date,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    def deactivate(self, availability_id: str) -> bool:
        """Deactivate an availability window."""
        result = self.collection.update_one(
            {"_id": ObjectId(availability_id)},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    def activate(self, availability_id: str) -> bool:
        """Activate an availability window."""
        result = self.collection.update_one(
            {"_id": ObjectId(availability_id)},
            {
                "$set": {
                    "is_active": True,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    # Delete
    def delete(self, availability_id: str) -> bool:
        """Delete an availability window (hard delete)."""
        result = self.collection.delete_one({"_id": ObjectId(availability_id)})
        return result.deleted_count > 0

    def delete_all_for_user(self, user_id: str) -> int:
        """Delete all availability windows for a user. Returns count deleted."""
        result = self.collection.delete_many({"user_id": ObjectId(user_id)})
        return result.deleted_count

    # Utility
    def count_by_user(self, user_id: str, active_only: bool = True) -> int:
        """Count availability windows for a user."""
        query = {"user_id": ObjectId(user_id)}
        if active_only:
            query["is_active"] = True
        return self.collection.count_documents(query)
