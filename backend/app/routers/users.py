
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional

# --- App-specific imports ---
from app.services.auth import get_current_user
from app.database.models import User

router = APIRouter()

# --- Pydantic Schemas for User Data ---

class UserRead(BaseModel):
    """Schema for returning user profile data."""
    id: int
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    is_active: bool
    is_verified: bool
    role: str

    class Config:
        from_attributes = True # Used to be orm_mode

# --- User Profile Endpoints ---

@router.get("/users/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Fetches the profile of the currently authenticated user.
    """
    # The get_current_user dependency already handles fetching the user.
    # If the code reaches here, the user is authenticated and `current_user` is their User model instance.
    return current_user
