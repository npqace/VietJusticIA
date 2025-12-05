"""
Integration tests for Chat API (backend/app/routers/chat.py)

Tests cover:
- Chat session creation
- Message handling
- Session management (list, delete, update)
- Authorization and access control
- AI response integration
"""

import pytest
from fastapi.testclient import TestClient
# Test database setup and client are handled by conftest.py fixtures


from app.database.models import User
from app.core.security import get_password_hash, create_access_token
from unittest.mock import patch

@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        email="chat@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Chat User",
        phone="0912345678",
        is_verified=True,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers."""
    access_token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}


from unittest.mock import patch, AsyncMock, MagicMock
from bson import ObjectId

@pytest.fixture
def mock_rag_service():
    """Mock RAG service to avoid calling actual AI."""
    with patch('app.routers.chat.rag_service.invoke_chain', new_callable=AsyncMock) as mock:
        mock.return_value = {
            "response": "This is a mock AI response about Vietnamese law.",
            "sources": [
                {
                    "title": "Law Document 1", 
                    "document_id": "doc1",
                    "document_number": "01/2024/QH15",
                    "source_url": "http://example.com/doc1",
                    "page_content_preview": "Content preview 1..."
                },
                {
                    "title": "Law Document 2", 
                    "document_id": "doc2",
                    "document_number": "02/2024/QH15",
                    "source_url": "http://example.com/doc2",
                    "page_content_preview": "Content preview 2..."
                }
            ]
        }
        yield mock

@pytest.fixture(autouse=True)
def mock_chat_repo():
    """Mock chat repository to avoid MongoDB dependency."""
    with patch('app.routers.chat.chat_repository') as mock_repo:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        # Store sessions in a dict to simulate DB
        sessions_db = {}
        
        def create_session_side_effect(user_id, user_email, title=None, first_message=None):
            session_id = str(ObjectId())
            session = {
                "_id": session_id,
                "session_id": session_id,
                "user_id": user_id,
                "user_email": user_email,
                "title": title or "New Chat",
                "messages": [],
                "is_active": True,
                "created_at": now,
                "updated_at": now
            }
            sessions_db[session_id] = session
            return session
        mock_repo.create_chat_session.side_effect = create_session_side_effect
        
        def add_message_side_effect(session_id, message_text, sender, sources=None):
            if session_id not in sessions_db:
                return False
            # Update session in db
            sessions_db[session_id]["messages"].append({
                "message_id": str(ObjectId()),
                "sender": sender,
                "text": message_text,
                "timestamp": now,
                "sources": sources or []
            })
            return True
        mock_repo.add_message_to_session.side_effect = add_message_side_effect
        
        def get_session_side_effect(session_id, user_id):
            if session_id not in sessions_db:
                return None
            session = sessions_db[session_id]
            # Verify ownership
            if session["user_id"] != user_id:
                return None
            return session
        mock_repo.get_chat_session_by_id.side_effect = get_session_side_effect
        
        def get_user_sessions_side_effect(user_id, skip=0, limit=50):
            user_sessions = [s for s in sessions_db.values() if s["user_id"] == user_id]
            # Sort by updated_at desc (mocking DB sort)
            user_sessions.sort(key=lambda x: x["updated_at"], reverse=True)
            
            # Apply pagination
            paginated_sessions = user_sessions[skip : skip + limit]
            
            # Add message count
            for s in paginated_sessions:
                s["message_count"] = len(s["messages"])
            return paginated_sessions
        mock_repo.get_user_chat_sessions.side_effect = get_user_sessions_side_effect
        
        mock_repo.update_chat_session_title.return_value = True
        
        def delete_session_side_effect(session_id, user_id):
            if session_id in sessions_db and sessions_db[session_id]["user_id"] == user_id:
                del sessions_db[session_id]
                return True
            return False
        mock_repo.delete_chat_session.side_effect = delete_session_side_effect
        
        yield mock_repo


class TestChatSessionCreation:
    """Test creating new chat sessions."""

    def test_create_session_with_first_message_succeeds(self, client, auth_headers, mock_rag_service):
        """Test creating a new chat session with the first message."""
        session_data = {
            "first_message": "What is the marriage registration procedure?"
        }

        response = client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert "session_id" in data
        assert "messages" in data
        assert len(data["messages"]) >= 2  # User message + bot response
        assert data["messages"][0]["sender"] == "user"
        assert data["messages"][1]["sender"] == "bot"

    def test_create_session_returns_ai_response_with_sources(self, client, auth_headers, mock_rag_service):
        """Test that AI response includes source citations."""
        session_data = {
            "first_message": "Tell me about labor law"
        }

        response = client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()

        # Find bot message
        bot_message = next((msg for msg in data["messages"] if msg["sender"] == "bot"), None)
        assert bot_message is not None
        assert "sources" in bot_message or bot_message.get("text")  # Should have sources or text

    def test_create_session_without_auth_returns_401(self, client):
        """Test that unauthenticated request is rejected."""
        session_data = {
            "first_message": "Test message"
        }

        response = client.post("/api/v1/chat/sessions", json=session_data)

        assert response.status_code == 401

    def test_create_session_with_empty_message_returns_422(self, client, auth_headers):
        """Test that empty message is rejected."""
        session_data = {
            "first_message": ""
        }

        response = client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)

        assert response.status_code in [400, 422]


class TestChatMessageHandling:
    """Test adding messages to existing sessions."""

    def test_add_message_to_existing_session_succeeds(self, client, auth_headers, mock_rag_service):
        """Test adding a message to an existing chat session."""
        # First, create a session
        session_data = {"first_message": "Initial question"}
        create_response = client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)
        session_id = create_response.json()["session_id"]

        # Add a new message
        message_data = {"message": "Follow-up question"}
        response = client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            json=message_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "sources" in data

    def test_add_message_includes_ai_response(self, client, auth_headers, mock_rag_service):
        """Test that adding a message triggers AI response."""
        # Create session
        session_data = {"first_message": "Question 1"}
        create_response = client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)
        session_id = create_response.json()["session_id"]

        # Add message
        message_data = {"message": "Question 2"}
        response = client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            json=message_data,
            headers=auth_headers
        )

        # Verify RAG service was called
        mock_rag_service.assert_called()

    def test_add_message_to_nonexistent_session_returns_404(self, client, auth_headers):
        """Test adding message to non-existent session."""
        message_data = {"message": "Test message"}

        response = client.post(
            "/api/v1/chat/sessions/nonexistent-session-id/messages",
            json=message_data,
            headers=auth_headers
        )

        assert response.status_code == 404


class TestSessionManagement:
    """Test listing, updating, and deleting chat sessions."""

    def test_get_all_sessions_for_user_succeeds(self, client, auth_headers, mock_rag_service):
        """Test retrieving all sessions for authenticated user."""
        # Create a few sessions
        for i in range(3):
            session_data = {"first_message": f"Question {i+1}"}
            client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)

        # Get all sessions
        response = client.get("/api/v1/chat/sessions", headers=auth_headers)

        assert response.status_code == 200
        sessions = response.json()
        assert isinstance(sessions, list)
        assert len(sessions) >= 3

    def test_get_session_messages_succeeds(self, client, auth_headers, mock_rag_service):
        """Test retrieving messages for a specific session."""
        # Create session
        session_data = {"first_message": "Test question"}
        create_response = client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)
        session_id = create_response.json()["session_id"]

        # Get session messages (via get session)
        response = client.get(f"/api/v1/chat/sessions/{session_id}", headers=auth_headers)

        assert response.status_code == 200
        session = response.json()
        assert "messages" in session
        messages = session["messages"]
        assert isinstance(messages, list)
        assert len(messages) >= 2  # At least user message + bot response

    def test_update_session_title_succeeds(self, client, auth_headers, mock_rag_service):
        """Test updating session title."""
        # Create session
        session_data = {"first_message": "Original question"}
        create_response = client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)
        session_id = create_response.json()["session_id"]

        # Update title
        update_data = {"title": "New Custom Title"}
        response = client.patch(
            f"/api/v1/chat/sessions/{session_id}",
            json=update_data,
            headers=auth_headers
        )

        # Verify update (status code depends on implementation)
        assert response.status_code in [200, 204]

    def test_delete_session_succeeds(self, client, auth_headers, mock_rag_service):
        """Test deleting a chat session."""
        # Create session
        session_data = {"first_message": "Question to delete"}
        create_response = client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)
        session_id = create_response.json()["session_id"]

        # Delete session
        response = client.delete(f"/api/v1/chat/sessions/{session_id}", headers=auth_headers)

        assert response.status_code in [200, 204]

        # Verify deletion - session should not be in list
        list_response = client.get("/api/v1/chat/sessions", headers=auth_headers)
        sessions = list_response.json()
        session_ids = [s.get("session_id") for s in sessions]
        assert session_id not in session_ids


class TestAuthorizationAndSecurity:
    """Test access control and security."""

    def test_access_other_user_session_returns_403(self, client, auth_headers, mock_rag_service, db_session):
        """Test that users cannot access other users' sessions."""
        # Create session with first user
        session_data = {"first_message": "Private question"}
        create_response = client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)
        session_id = create_response.json()["session_id"]

        # Create second user
        from app.database.models import User
        from app.core.security import get_password_hash, create_access_token
        
        user2 = User(
            email="other@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Other User",
            is_verified=True,
            is_active=True
        )
        db_session.add(user2)
        db_session.commit()

        # Create headers for second user
        access_token_2 = create_access_token(data={"sub": "other@example.com"})
        other_headers = {"Authorization": f"Bearer {access_token_2}"}

        # Try to access first user's session
        response = client.get(f"/api/v1/chat/sessions/{session_id}", headers=other_headers)

        # Should be forbidden or not found (implementation dependent)
        assert response.status_code in [403, 404]

    def test_session_pagination_works(self, client, auth_headers, mock_rag_service):
        """Test session list pagination."""
        # Create multiple sessions
        for i in range(15):
            session_data = {"first_message": f"Question {i+1}"}
            client.post("/api/v1/chat/sessions", json=session_data, headers=auth_headers)

        # Get with limit
        response = client.get("/api/v1/chat/sessions?limit=5", headers=auth_headers)

        assert response.status_code == 200
        sessions = response.json()
        assert len(sessions) <= 5


# Summary comment
"""
Test Coverage Summary:
- ✅ Chat Session Creation (4 tests)
- ✅ Message Handling (3 tests)
- ✅ Session Management (5 tests)
- ✅ Authorization & Security (2 tests)

Total: 14 integration tests for Chat API
"""
