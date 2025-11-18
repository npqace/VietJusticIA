from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime


class HelpRequestCreate(BaseModel):
    """Schema for creating a new help request"""
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name of requester")
    email: EmailStr = Field(..., description="Email address")
    subject: str = Field(..., min_length=3, max_length=255, description="Request subject")
    content: str = Field(..., min_length=10, description="Help request content")


class HelpRequestUpdate(BaseModel):
    """Schema for updating help request (admin only)"""
    status: Optional[str] = Field(None, description="Status: pending, in_progress, resolved, closed")
    admin_notes: Optional[str] = Field(None, description="Admin notes")


class HelpRequestRead(BaseModel):
    """Schema for reading help request details"""
    id: int
    user_id: Optional[int]
    full_name: str
    email: str
    subject: str
    content: str
    status: str
    admin_notes: Optional[str]
    admin_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class HelpRequestListItem(BaseModel):
    """Schema for listing help requests (compact view)"""
    id: int
    full_name: str
    email: str
    subject: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
