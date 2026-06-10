"""
User matcher service - match flights to user availability and preferences.

Trip duration is derived automatically from each availability window using the
70% rule:  min_days = max(2, round(window_length * 0.7)),  max_days = window_length

This means a 7-day window yields 5–7 day trips, a 4-day window yields 3–4 day
trips, etc.  Users no longer need to set min/max days manually.
"""

import logging
from datetime import datetime
from typing import Optional
from bson import ObjectId

from ..models.user import User
from ..models.flight import FlightModel
from ..repositories.user_repo import UserRepository
from ..repositories.availability_repo import AvailabilityRepository
from ..repositories.destination_repo import DestinationRepository
from ..repositories.flight_repo import FlightRepository

logger = logging.getLogger(__name__)


def _window_trip_range(window_length_days: int) -> tuple[int, int]:
    """
    Derive the appropriate min/max trip duration for an availability window.

    Rule: min = max(2, round(N × 0.7)),  max = N

    Examples:
        3 days  →  min 2,  max 3
        4 days  →  min 3,  max 4
        5 days  →  min 4,  max 5
        7 days  →  min 5,  max 7
       10 days  →  min 7,  max 10
       14 days  →  min 10, max 14
    """
    min_days = max(2, round(window_length_days * 0.7))
    max_days = window_length_days
    return min_days, max_days


class UserMatcher:
    """
    Service for matching flights to user preferences.

    Usage:
        matcher = UserMatcher()

        # Get all matching flights for a user
        flights = matcher.find_flights_for_user(user_id)

        # Get users interested in a specific flight
        users = matcher.find_users_for_flight(flight)
    """

    def __init__(self):
        self.user_repo = UserRepository()
        self.availability_repo = AvailabilityRepository()
        self.destination_repo = DestinationRepository()
        self.flight_repo = FlightRepository()

    def find_flights_for_user(
        self,
        user_id: str,
        deals_only: bool = False,
        max_results: int = 50
    ) -> list[FlightModel]:
        """
        Find flights matching a user's availability and preferences.

        Args:
            user_id: User's ID
            deals_only: Deprecated no-op — deal scoring moved to the frontend
            max_results: Maximum number of results

        Returns:
            List of matching FlightModel objects sorted by price
        """
        # Get user
        user = self.user_repo.find_by_id(user_id)
        if not user:
            logger.warning(f"User {user_id} not found")
            return []

        # Get user's active availability windows
        availabilities = self.availability_repo.find_future_windows(user_id)
        if not availabilities:
            logger.debug(f"No availability windows for user {user_id}")
            return []

        # Get user's destination preferences
        destinations = self.destination_repo.get_destination_codes_for_user(user_id)
        if not destinations:
            logger.debug(f"No destination preferences for user {user_id}")
            return []

        # Get user's airports (home + nearby)
        origins = user.all_airports

        prefs = user.search_preferences
        max_price = user.notifications.max_price_alert

        logger.debug(f"Searching for user {user_id}: {len(origins)} origins, "
                    f"{len(destinations)} destinations, {len(availabilities)} windows")

        matching_flights = []

        # Search for each availability window
        for avail in availabilities:
            start_str = avail.start_date.strftime("%Y-%m-%d")
            end_str = avail.end_date.strftime("%Y-%m-%d")

            # Derive trip duration range from window length (70% rule)
            window_length = (avail.end_date - avail.start_date).days + 1
            min_days, max_days = _window_trip_range(window_length)

            logger.debug(f"Window {start_str}–{end_str} ({window_length}d): "
                        f"trips {min_days}–{max_days} days")

            # Get flights in this date range
            for origin in origins:
                for dest in destinations:
                    flights = self.flight_repo.find_by_date_range(
                        start_date=start_str,
                        end_date=end_str,
                        origin=origin,
                        destination=dest,
                        limit=20
                    )

                    for flight in flights:
                        # Apply user preferences
                        if flight.price > max_price:
                            continue
                        if prefs.direct_only and not flight.is_direct:
                            continue
                        if flight.duration_days < min_days:
                            continue
                        if flight.duration_days > max_days:
                            continue

                        # Check if flight dates fall within availability
                        try:
                            out_date = datetime.strptime(flight.outbound_date, "%d.%m.%Y")
                            ret_date = datetime.strptime(flight.return_date, "%d.%m.%Y")
                        except ValueError:
                            try:
                                out_date = datetime.strptime(flight.outbound_date, "%Y-%m-%d")
                                ret_date = datetime.strptime(flight.return_date, "%Y-%m-%d")
                            except ValueError:
                                continue

                        if avail.contains_date(out_date) and avail.contains_date(ret_date):
                            matching_flights.append(flight)

        # Deduplicate by flight_key
        seen = set()
        unique_flights = []
        for f in matching_flights:
            if f.flight_key not in seen:
                seen.add(f.flight_key)
                unique_flights.append(f)

        # Sort by price (asc) — deal scoring lives in the frontend now
        unique_flights.sort(key=lambda f: f.price)

        return unique_flights[:max_results]

    def find_deals_for_user(self, user_id: str, max_results: int = 20) -> list[FlightModel]:
        """Find cheapest matching flights (deal scoring moved to frontend)."""
        return self.find_flights_for_user(user_id, max_results=max_results)

    def find_users_for_flight(self, flight: FlightModel) -> list[User]:
        """
        Find users who might be interested in a specific flight.

        Useful for sending notifications when a good deal is found.

        Args:
            flight: FlightModel to match

        Returns:
            List of User objects who match this flight
        """
        matching_users = []

        # Parse flight dates
        try:
            out_date = datetime.strptime(flight.outbound_date, "%d.%m.%Y")
            ret_date = datetime.strptime(flight.return_date, "%d.%m.%Y")
        except ValueError:
            try:
                out_date = datetime.strptime(flight.outbound_date, "%Y-%m-%d")
                ret_date = datetime.strptime(flight.return_date, "%Y-%m-%d")
            except ValueError:
                logger.warning(f"Could not parse dates for flight {flight.flight_key}")
                return []

        # Find users who want this destination
        user_ids = self.destination_repo.find_users_wanting_destination(flight.destination)

        for user_id in user_ids:
            user = self.user_repo.find_by_id(str(user_id))
            if not user or not user.is_active:
                continue

            # Check if flight origin is in user's airports
            if flight.origin not in user.all_airports:
                continue

            # Check price preference
            if flight.price > user.notifications.max_price_alert:
                continue

            # Check direct-only preference
            if user.search_preferences.direct_only and not flight.is_direct:
                continue

            # Check availability windows — and validate trip duration against
            # each window's derived range (70% rule)
            availabilities = self.availability_repo.find_active_in_range(
                str(user_id), out_date, ret_date
            )
            if not availabilities:
                continue

            duration_ok = False
            for avail in availabilities:
                window_length = (avail.end_date - avail.start_date).days + 1
                min_days, max_days = _window_trip_range(window_length)
                if min_days <= flight.duration_days <= max_days:
                    duration_ok = True
                    break
            if not duration_ok:
                continue

            # User matches!
            matching_users.append(user)

        logger.debug(f"Found {len(matching_users)} users interested in "
                    f"{flight.origin}->{flight.destination}")

        return matching_users

    def find_users_for_notification(
        self,
        flight: FlightModel,
        require_deal: bool = True
    ) -> list[User]:
        """
        Find users who should be notified about a flight.

        Args:
            flight: FlightModel to notify about
            require_deal: Deprecated no-op — deal scoring moved to the frontend

        Returns:
            List of User objects to notify
        """
        users = self.find_users_for_flight(flight)

        # Filter by notification preferences
        notify_users = []
        for user in users:
            if user.notifications.instant_alerts:
                notify_users.append(user)

        return notify_users

    def get_user_summary(self, user_id: str) -> dict:
        """
        Get a summary of a user's matches.

        Returns:
            Dict with counts and top matches
        """
        user = self.user_repo.find_by_id(user_id)
        if not user:
            return {"error": "User not found"}

        all_flights = self.find_flights_for_user(user_id, max_results=100)

        # Group by destination
        by_destination = {}
        for f in all_flights:
            dest = f.destination
            if dest not in by_destination:
                by_destination[dest] = {"count": 0, "min_price": float("inf")}
            by_destination[dest]["count"] += 1
            by_destination[dest]["min_price"] = min(by_destination[dest]["min_price"], f.price)

        return {
            "user_id": user_id,
            "total_matches": len(all_flights),
            "destinations": by_destination,
            "cheapest_flight": all_flights[0].to_api_dict() if all_flights else None
        }

    def get_all_users_summary(self) -> list[dict]:
        """Get match summaries for all active users."""
        users = self.user_repo.find_all_active()
        summaries = []

        for user in users:
            flights = self.find_flights_for_user(user.id, max_results=20)

            summaries.append({
                "user_id": user.id,
                "email": user.email,
                "total_matches": len(flights),
            })

        return summaries
