"""
POST /api/auth/login  — sign in or register (no password)
GET  /api/auth/me     — validate a stored user ID and return user info
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from database.repositories.user_repo import UserRepository

router = APIRouter(prefix="/api/auth")


class LoginRequest(BaseModel):
    email: str
    name: str


@router.post("/login")
def login(body: LoginRequest):
    """
    Find or create a user by email. Returns user_id, name, email.
    No password required — identity is by email only for now.
    """
    email = body.email.strip().lower()
    name = body.name.strip()

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    user = UserRepository().find_or_create(email=email, name=name)
    return {"user_id": user.id, "name": user.name, "email": user.email}


@router.get("/me")
def me(x_user_id: str = Header(None)):
    """
    Validate a stored user ID. Returns user info or 401.
    Called on app load to verify the stored session is still valid.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing X-User-ID header")

    user = UserRepository().find_by_id(x_user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"user_id": user.id, "name": user.name, "email": user.email}
