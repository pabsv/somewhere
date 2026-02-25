"""
GET /api/deals — return flights matching the default user's preferences.

Uses UserMatcher which filters against:
  - user's availability windows
  - user's destination preferences
  - user's airports (home + nearby)
  - user's max_price (stored as notifications.max_price_alert)
  - user's trip length (auto-derived from each availability window, 70% rule)
  - user's direct_only flag
"""

from fastapi import APIRouter, Depends
from database.services.user_matcher import UserMatcher
from ..dependencies import get_current_user_id

router = APIRouter(prefix="/api")


@router.get("/deals")
def get_deals(user_id: str = Depends(get_current_user_id)):
    matcher = UserMatcher()
    flights = matcher.find_flights_for_user(user_id, max_results=200)
    return {"deals": [f.to_api_dict() for f in flights]}
