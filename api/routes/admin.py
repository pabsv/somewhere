"""
GET    /api/admin/users    — list all users
GET    /api/admin/schedule — scheduler state per origin (written by scheduler process)
DELETE /api/admin/clear    — wipe all scraped data (flights, price_history, route_stats)
"""

from fastapi import APIRouter

from database.repositories.user_repo import UserRepository
from database.repositories.schedule_repo import ScheduleRepository
from database.connection import get_collection
from database.config import COLLECTION_FLIGHTS, COLLECTION_PRICE_HISTORY, COLLECTION_ROUTE_STATS

router = APIRouter(prefix="/api/admin")


@router.get("/users")
def list_users():
    users = UserRepository().find_all()
    return {
        "users": [u.to_safe_dict() for u in users],
        "total": len(users),
    }


@router.get("/schedule")
def get_schedule():
    """
    Returns the latest scheduler state per origin.
    Written to MongoDB by the scheduler process; read here by the frontend.
    Empty if the scheduler has never run.
    """
    states = ScheduleRepository().get_all()
    return {"states": states}


@router.delete("/clear")
def clear_all_data():
    """Delete all scraped flight data. User accounts and preferences are untouched."""
    flights_result = get_collection(COLLECTION_FLIGHTS).delete_many({})
    history_result = get_collection(COLLECTION_PRICE_HISTORY).delete_many({})
    stats_result = get_collection(COLLECTION_ROUTE_STATS).delete_many({})
    return {
        "deleted": {
            "flights": flights_result.deleted_count,
            "price_history": history_result.deleted_count,
            "route_stats": stats_result.deleted_count,
        }
    }
