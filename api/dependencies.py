"""
Shared dependencies for the API.

Multi-user mode: identity is established via the X-User-ID header,
which the frontend sets from the value stored in localStorage after login.
"""

from fastapi import Header, HTTPException
from database.repositories.user_repo import UserRepository


def get_current_user_id(x_user_id: str = Header(None)) -> str:
    """
    FastAPI dependency: reads user ID from the X-User-ID request header.
    Returns 401 if the header is missing or the user doesn't exist.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing X-User-ID header")
    user = UserRepository().find_by_id(x_user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    return x_user_id
