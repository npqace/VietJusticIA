from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Source(BaseModel):
    """Schema for RAG source document."""
    document_id: Optional[str] = None  # MongoDB _id for navigation (optional for backward compatibility)
    title: str
    document_number: str
    source_url: str
    page_content_preview: str


class ChatMessage(BaseModel):
    """Schema for a single message in a chat session."""
    message_id: str
    text: str
    sender: str  # 'user' or 'bot'
    sources: Optional[List[Source]] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    """Schema for creating a new chat session."""
    title: Optional[str] = None  # Auto-generated if not provided
    first_message: str  # The user's first message


class ChatSessionUpdate(BaseModel):
    """Schema for updating a chat session (e.g., rename title)."""
    title: str


class AddMessageRequest(BaseModel):
    """Schema for adding a message to an existing session."""
    message: str


class ChatSessionRead(BaseModel):
    """Schema for returning a chat session with messages."""
    session_id: str
    user_id: int
    user_email: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessage] = []

    class Config:
        from_attributes = True
        populate_by_name = True


class ChatSessionListItem(BaseModel):
    """Schema for returning a list of chat sessions (without full messages)."""
    session_id: str
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0  # Number of messages in the session

    class Config:
        from_attributes = True
        populate_by_name = True
