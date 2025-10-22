from pydantic import BaseModel, EmailStr
from typing import Optional

class UserRead(BaseModel):
    """Schema for returning user profile data."""
    id: int
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    is_active: bool
    is_verified: bool
    role: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True # Used to be orm_mode

class UserUpdate(BaseModel):
    """Schema for updating user profile data."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class UpdateContactRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class VerifyUpdateContactRequest(BaseModel):
    otp: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
