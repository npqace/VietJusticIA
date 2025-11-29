from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

# Schemas for listing requests for the user
# These are simplified for list view

class ServiceRequestItem(BaseModel):
    id: int
    title: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConsultationRequestItem(BaseModel):
    id: int
    content: str = Field(..., max_length=100) # Truncate content for list view
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HelpRequestItem(BaseModel):
    id: int
    subject: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MyRequestsResponse(BaseModel):
    service_requests: List[ServiceRequestItem]
    consultation_requests: List[ConsultationRequestItem]
    help_requests: List[HelpRequestItem]
