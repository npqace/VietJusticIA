from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class ConsultationRequestCreate(BaseModel):
    """Schema for creating a new consultation request"""
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name of requester")
    email: EmailStr = Field(..., description="Email address")
    phone: str = Field(..., min_length=10, max_length=20, description="Phone number")
    province: str = Field(..., min_length=1, max_length=100, description="Province/City")
    district: str = Field(..., min_length=1, max_length=100, description="District")
    content: str = Field(..., min_length=10, description="Consultation request content")


class ConsultationRequestUpdate(BaseModel):
    """Schema for updating consultation request (admin only)"""
    status: Optional[str] = Field(None, description="Status: pending, in_progress, completed, cancelled")
    priority: Optional[str] = Field(None, description="Priority: low, medium, high")
    admin_notes: Optional[str] = Field(None, description="Admin notes")
    assigned_lawyer_id: Optional[int] = Field(None, description="Assigned lawyer ID")


class ConsultationRequestRead(BaseModel):
    """Schema for reading consultation request details"""
    id: int
    user_id: Optional[int]
    full_name: str
    email: str
    phone: str
    province: str
    district: str
    content: str
    status: str
    priority: str
    admin_notes: Optional[str]
    assigned_lawyer_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ConsultationRequestListItem(BaseModel):
    """Schema for listing consultation requests (compact view)"""
    id: int
    full_name: str
    email: str
    phone: str
    province: str
    district: str
    status: str
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True
