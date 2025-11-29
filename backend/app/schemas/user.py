from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
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

    model_config = ConfigDict(from_attributes=True)

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

class LawyerProfileData(BaseModel):
    """Schema for lawyer profile data when creating lawyer account."""
    specialization: str
    bar_license_number: str
    years_of_experience: int = 0
    city: Optional[str] = None
    province: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None
    languages: str = "Vietnamese"

class AdminCreateUser(BaseModel):
    """Schema for admin creating a new user account."""
    full_name: str
    email: EmailStr
    phone: str
    role: str  # 'lawyer' or 'admin' only
    lawyer_profile: Optional[LawyerProfileData] = None  # Required if role is 'lawyer'

class AdminCreateUserResponse(BaseModel):
    """Response schema after creating user - includes generated password."""
    user: UserProfile
    generated_password: str  # Return password only once for admin to give to user
