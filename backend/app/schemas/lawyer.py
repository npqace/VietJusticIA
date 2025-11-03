from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class LawyerBase(BaseModel):
    """Base schema for Lawyer with common fields."""
    specialization: str
    bio: Optional[str] = None
    years_of_experience: int = 0
    bar_license_number: str
    city: Optional[str] = None
    province: Optional[str] = None
    consultation_fee: Optional[Decimal] = None
    languages: str = "Vietnamese"


class LawyerCreate(LawyerBase):
    """Schema for creating a new lawyer profile."""
    user_id: int


class LawyerUpdate(BaseModel):
    """Schema for updating lawyer profile (optional fields)."""
    specialization: Optional[str] = None
    bio: Optional[str] = None
    years_of_experience: Optional[int] = None
    city: Optional[str] = None
    province: Optional[str] = None
    consultation_fee: Optional[Decimal] = None
    languages: Optional[str] = None
    is_available: Optional[bool] = None


class LawyerInList(BaseModel):
    """Schema for lawyer in list view (summary)."""
    id: int
    full_name: str
    avatar_url: Optional[str] = None
    specialization: str
    city: Optional[str] = None
    province: Optional[str] = None
    rating: Decimal
    total_reviews: int
    consultation_fee: Optional[Decimal] = None
    is_available: bool
    years_of_experience: int

    class Config:
        from_attributes = True


class LawyerDetail(LawyerInList):
    """Schema for detailed lawyer profile."""
    bio: Optional[str] = None
    bar_license_number: str
    languages: str
    verification_status: str
    email: str
    phone: str
    created_at: datetime

    class Config:
        from_attributes = True


class ServiceRequestCreate(BaseModel):
    """Schema for creating a service request."""
    lawyer_id: int
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)


class ServiceRequestUpdate(BaseModel):
    """Schema for lawyer to update request status."""
    status: str  # accepted, rejected, in_progress, completed
    lawyer_response: Optional[str] = None
    rejected_reason: Optional[str] = None


class ServiceRequestRead(BaseModel):
    """Schema for reading service request details."""
    id: int
    user_id: int
    lawyer_id: int
    title: str
    description: str
    status: str
    lawyer_response: Optional[str] = None
    rejected_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Related data
    user_name: Optional[str] = None
    lawyer_name: Optional[str] = None

    class Config:
        from_attributes = True


class ServiceRequestListItem(BaseModel):
    """Schema for service request in list view."""
    id: int
    lawyer_id: int
    lawyer_name: str
    lawyer_avatar: Optional[str] = None
    title: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
