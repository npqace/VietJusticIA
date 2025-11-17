from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class ConversationMessage(BaseModel):
    """Schema for a single message in a conversation."""
    message_id: str
    sender_id: int
    sender_type: str  # 'user' or 'lawyer'
    text: str
    timestamp: datetime
    read_by_user: bool = False
    read_by_lawyer: bool = False

    model_config = ConfigDict(from_attributes=True)


class SendMessageRequest(BaseModel):
    """Schema for sending a new message."""
    text: str = Field(..., min_length=1, max_length=5000)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "Hello, I need help with my case."
            }
        }
    )


class ConversationCreate(BaseModel):
    """
    Schema for creating a conversation.
    This is typically done automatically when a lawyer accepts a service request.
    """
    service_request_id: int


class ConversationRead(BaseModel):
    """Schema for returning a full conversation with all messages."""
    conversation_id: str
    service_request_id: int
    user_id: int
    lawyer_id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    messages: List[ConversationMessage] = []

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ConversationListItem(BaseModel):
    """
    Schema for returning a list of conversations (without full messages).
    Shows conversation summary with last message preview.
    """
    conversation_id: str
    service_request_id: int
    user_id: int
    lawyer_id: int
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    unread_count: int = 0
    messages: List[ConversationMessage] = []  # Last message only

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MarkAsReadRequest(BaseModel):
    """
    Schema for marking messages as read.
    No body needed - we know who's reading from the auth token.
    """
    pass


class ConversationWithDetails(BaseModel):
    """
    Extended conversation schema that includes related service request details.
    Used in mobile/web views to show context.
    """
    conversation_id: str
    service_request_id: int
    user_id: int
    lawyer_id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    messages: List[ConversationMessage] = []
    
    # Related service request info (optional, populated from PostgreSQL)
    service_request_title: Optional[str] = None
    service_request_status: Optional[str] = None
    user_full_name: Optional[str] = None
    lawyer_full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


