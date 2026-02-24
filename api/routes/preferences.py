"""
GET  /api/preferences — read the full UserPreferences object
PUT  /api/preferences — save the full UserPreferences object

The frontend sends/receives a flat UserPreferences shape.
Internally this maps to three MongoDB collections:
  - users            → airports, search_preferences, notifications.max_price_alert
  - availability     → date windows (replaced wholesale on save)
  - destination_preferences → destination codes (replaced wholesale on save)
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from database.repositories.user_repo import UserRepository
from database.repositories.availability_repo import AvailabilityRepository
from database.repositories.destination_repo import DestinationRepository
from ..dependencies import get_default_user_id

router = APIRouter(prefix="/api")


# ─── Request / response schemas ───────────────────────────────────────────────

class DateWindow(BaseModel):
    start: str          # YYYY-MM-DD
    end: str            # YYYY-MM-DD
    label: Optional[str] = None


class UserPreferences(BaseModel):
    home_airport: str
    nearby_airports: list[str]
    destinations: list[str]
    availability: list[DateWindow]
    min_days: int
    max_days: int
    max_price: float    # stored as notifications.max_price_alert on the backend
    direct_only: bool


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/preferences")
def get_preferences(user_id: str = Depends(get_default_user_id)):
    user_repo = UserRepository()
    avail_repo = AvailabilityRepository()
    dest_repo = DestinationRepository()

    user = user_repo.find_by_id(user_id)
    availability = avail_repo.find_by_user(user_id)
    destinations = dest_repo.get_destination_codes_for_user(user_id)

    return {
        "home_airport": user.airports.home,
        "nearby_airports": user.airports.nearby,
        "destinations": destinations,
        "availability": [
            {
                "start": w.start_date.strftime("%Y-%m-%d"),
                "end": w.end_date.strftime("%Y-%m-%d"),
                "label": w.label or None,
            }
            for w in availability
        ],
        "min_days": user.search_preferences.min_days,
        "max_days": user.search_preferences.max_days,
        "max_price": user.notifications.max_price_alert,
        "direct_only": user.search_preferences.direct_only,
    }


@router.put("/preferences")
def save_preferences(
    prefs: UserPreferences,
    user_id: str = Depends(get_default_user_id),
):
    user_repo = UserRepository()
    avail_repo = AvailabilityRepository()
    dest_repo = DestinationRepository()

    # Update user document
    user_repo.update_airports(user_id, prefs.home_airport, prefs.nearby_airports)
    user_repo.update_search_preferences(
        user_id,
        min_days=prefs.min_days,
        max_days=prefs.max_days,
        direct_only=prefs.direct_only,
    )
    user_repo.update_notifications(user_id, max_price_alert=prefs.max_price)

    # Replace availability windows (delete all, insert new)
    avail_repo.delete_all_for_user(user_id)
    for w in prefs.availability:
        start = datetime.strptime(w.start, "%Y-%m-%d")
        end = datetime.strptime(w.end, "%Y-%m-%d")
        avail_repo.create(user_id, start, end, w.label or "")

    # Replace destination preferences (delete all, insert new)
    dest_repo.delete_all_for_user(user_id)
    for code in prefs.destinations:
        dest_repo.create(user_id, code.upper())

    return {"status": "ok"}
