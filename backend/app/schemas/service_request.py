
from pydantic import BaseModel, Field

from typing import Optional

from datetime import datetime

import enum



class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"



class ServiceRequestCreate(BaseModel):

    """Schema for creating a service request."""

    lawyer_id: int

    title: str = Field(..., min_length=5, max_length=255)

    description: str = Field(..., min_length=10)



class ServiceRequestUpdate(BaseModel):

    status: Optional[RequestStatus] = None

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



class ServiceRequestOut(BaseModel):

    id: int

    user_id: int

    lawyer_id: int

    title: str

    description: str

    status: RequestStatus

    lawyer_response: Optional[str] = None

    rejected_reason: Optional[str] = None

    created_at: datetime

    updated_at: Optional[datetime] = None



    class Config:

        orm_mode = True

