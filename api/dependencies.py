"""
Shared dependencies for the API.

Single-user mode: no auth, one default local user.
All endpoints operate on this user.
"""

from database.repositories.user_repo import UserRepository

DEFAULT_USER_EMAIL = "local@flight-scraper.local"


def ensure_default_user() -> str:
    """
    Create the default local user if it doesn't exist.
    Called once on API startup.
    Returns the user_id.
    """
    repo = UserRepository()
    user = repo.find_by_email(DEFAULT_USER_EMAIL)
    if not user:
        user = repo.create(email=DEFAULT_USER_EMAIL, password="local")
        print(f"[startup] Created default user: {user.id}")
    else:
        print(f"[startup] Default user found: {user.id}")
    return user.id


def get_default_user_id() -> str:
    """
    FastAPI dependency: returns the default user's ID.
    Raises 503 if the user doesn't exist (shouldn't happen after startup).
    """
    from fastapi import HTTPException
    repo = UserRepository()
    user = repo.find_by_email(DEFAULT_USER_EMAIL)
    if not user:
        raise HTTPException(status_code=503, detail="Default user not initialised")
    return user.id
