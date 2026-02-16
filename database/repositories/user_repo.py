"""
User repository with CRUD operations and password hashing.
"""

from datetime import datetime
from typing import Optional
from bson import ObjectId
import bcrypt

from ..connection import get_collection
from ..config import COLLECTION_USERS
from ..models.user import User


class UserRepository:
    """Repository for User CRUD operations."""

    def __init__(self):
        self.collection = get_collection(COLLECTION_USERS)

    # Password hashing
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify a password against its hash."""
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8")
        )

    # Create
    def create(self, email: str, password: str, **kwargs) -> User:
        """
        Create a new user.

        Args:
            email: User's email address
            password: Plain text password (will be hashed)
            **kwargs: Additional user fields (airports, notifications, etc.)

        Returns:
            Created User object

        Raises:
            ValueError: If email already exists
        """
        # Check if email exists
        if self.find_by_email(email):
            raise ValueError(f"User with email {email} already exists")

        # Create user with hashed password
        user = User(
            email=email.lower().strip(),
            password_hash=self.hash_password(password),
            **kwargs
        )

        # Insert into database
        result = self.collection.insert_one(user.to_dict())
        user._id = result.inserted_id

        return user

    # Read
    def find_by_id(self, user_id: str) -> Optional[User]:
        """Find a user by ID."""
        try:
            doc = self.collection.find_one({"_id": ObjectId(user_id)})
            return User.from_dict(doc) if doc else None
        except Exception:
            return None

    def find_by_email(self, email: str) -> Optional[User]:
        """Find a user by email."""
        doc = self.collection.find_one({"email": email.lower().strip()})
        return User.from_dict(doc) if doc else None

    def find_all_active(self) -> list[User]:
        """Find all active users."""
        docs = self.collection.find({"is_active": True})
        return [User.from_dict(doc) for doc in docs]

    def find_users_wanting_destination(self, destination_code: str) -> list[User]:
        """
        Find all users who have a specific destination in their preferences.
        Note: This requires joining with destination_preferences collection.
        For efficiency, this is handled in the service layer.
        """
        # This is a placeholder - actual implementation uses DestinationRepository
        raise NotImplementedError("Use DestinationRepository.find_users_wanting_destination()")

    # Update
    def update(self, user: User) -> bool:
        """
        Update an existing user.

        Args:
            user: User object with updated fields

        Returns:
            True if update was successful
        """
        if not user._id:
            return False

        user.updated_at = datetime.utcnow()
        result = self.collection.update_one(
            {"_id": user._id},
            {"$set": user.to_dict()}
        )
        return result.modified_count > 0

    def update_password(self, user_id: str, new_password: str) -> bool:
        """Update a user's password."""
        result = self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "password_hash": self.hash_password(new_password),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    def update_airports(self, user_id: str, home: str, nearby: list[str]) -> bool:
        """Update a user's airport preferences."""
        result = self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "airports.home": home,
                    "airports.nearby": nearby,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    def update_notifications(self, user_id: str, **kwargs) -> bool:
        """Update a user's notification preferences."""
        updates = {f"notifications.{k}": v for k, v in kwargs.items()}
        updates["updated_at"] = datetime.utcnow()

        result = self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": updates}
        )
        return result.modified_count > 0

    def update_search_preferences(self, user_id: str, **kwargs) -> bool:
        """Update a user's search preferences."""
        updates = {f"search_preferences.{k}": v for k, v in kwargs.items()}
        updates["updated_at"] = datetime.utcnow()

        result = self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": updates}
        )
        return result.modified_count > 0

    # Delete
    def delete(self, user_id: str) -> bool:
        """Delete a user (hard delete)."""
        result = self.collection.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0

    def deactivate(self, user_id: str) -> bool:
        """Soft delete - deactivate a user."""
        result = self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    # Authentication
    def authenticate(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user by email and password.

        Args:
            email: User's email
            password: Plain text password

        Returns:
            User object if authentication successful, None otherwise
        """
        user = self.find_by_email(email)
        if not user:
            return None

        if not user.is_active:
            return None

        if self.verify_password(password, user.password_hash):
            return user

        return None

    # Stats
    def count_active(self) -> int:
        """Count active users."""
        return self.collection.count_documents({"is_active": True})

    def count_total(self) -> int:
        """Count all users."""
        return self.collection.count_documents({})
