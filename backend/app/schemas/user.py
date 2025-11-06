from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

class UserProfile(BaseModel):
    """Schema for returning user profile data."""
    id: int
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    is_active: bool
    is_verified: bool
    role: str
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator('role', mode='before')
    @classmethod
    def convert_role_enum(cls, v):
        """Convert Role enum to string."""
        if hasattr(v, 'value'):
            return v.value
        return v

    class Config:
        from_attributes = True # Used to be orm_mode

class UserUpdateProfile(BaseModel):
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

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str
