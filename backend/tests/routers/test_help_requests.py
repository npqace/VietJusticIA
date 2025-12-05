import pytest
from fastapi import status
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from app.database.models import User, HelpRequest
from app.core.rbac import verify_admin
from app.services.auth import get_current_user, get_current_user_optional
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import sys

# Mock MongoClient before importing anything that uses it
with patch("pymongo.MongoClient"):
    # Mock rag_service before importing app
    with patch("app.services.ai_service.rag_service") as mock_rag:
        mock_rag.initialize_service = Mock()
        from app.main import app

client = TestClient(app)

# Test data
MOCK_USER = User(id=1, email="user@example.com", role=User.Role.USER)
MOCK_ADMIN = User(id=2, email="admin@example.com", role=User.Role.ADMIN)

MOCK_HELP_REQUEST = HelpRequest(
    id=1,
    user_id=1,
    subject="Test Request",
    content="Help me",
    full_name="Test User",
    email="user@example.com",
    status=HelpRequest.HelpStatus.PENDING,
    created_at=datetime.now(),
    updated_at=None
)

# --- Fixtures ---

from app.database.database import get_db

# --- Fixtures ---

@pytest.fixture
def mock_repo():
    with patch("app.routers.help_requests.help_request_repository") as mock:
        yield mock

@pytest.fixture
def mock_email_service():
    with patch("app.routers.help_requests.send_help_request_notification") as mock:
        yield mock

# --- Tests ---

def test_create_help_request_success(mock_repo, mock_email_service):
    """Test creating a help request successfully."""
    app.dependency_overrides[get_current_user_optional] = lambda: MOCK_USER
    mock_repo.create_help_request.return_value = MOCK_HELP_REQUEST
    
    payload = {
        "subject": "Test Request",
        "content": "Help me please, this is urgent",
        "full_name": "Test User",
        "email": "user@example.com"
    }
    response = client.post("/api/v1/help-requests", json=payload)
    
    app.dependency_overrides = {} # Clean up
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["id"] == 1
    mock_email_service.assert_called_once()

def test_create_help_request_db_error_rollback(mock_repo):
    """Test database rollback on creation error."""
    app.dependency_overrides[get_current_user_optional] = lambda: MOCK_USER
    mock_session = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_session
    
    # Simulate DB error
    mock_repo.create_help_request.side_effect = SQLAlchemyError("DB Error")
    
    payload = {
        "subject": "Test Request",
        "content": "Help me please, this is urgent",
        "full_name": "Test User",
        "email": "user@example.com"
    }
    response = client.post("/api/v1/help-requests", json=payload)
    
    app.dependency_overrides = {} # Clean up
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    mock_session.rollback.assert_called_once()

def test_get_help_requests_admin(mock_repo):
    """Test admin getting all help requests."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_ADMIN
    mock_repo.get_help_requests.return_value = [MOCK_HELP_REQUEST]
    
    response = client.get("/api/v1/help-requests")
    
    app.dependency_overrides = {} # Clean up
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()) == 1
    # Verify admin logic called (no user_id filter)
    args = mock_repo.get_help_requests.call_args[1]
    assert "user_id" not in args or args["user_id"] is None

def test_get_help_requests_user(mock_repo):
    """Test user getting own help requests."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_USER
    mock_repo.get_help_requests.return_value = [MOCK_HELP_REQUEST]
    
    response = client.get("/api/v1/help-requests")
    
    app.dependency_overrides = {} # Clean up
    assert response.status_code == status.HTTP_200_OK
    # Verify user logic called (user_id filter)
    args = mock_repo.get_help_requests.call_args[1]
    assert args["user_id"] == 1

def test_delete_help_request_admin_success(mock_repo):
    """Test admin deleting a pending request."""
    app.dependency_overrides[verify_admin] = lambda: MOCK_ADMIN
    mock_repo.get_help_request_by_id.return_value = MOCK_HELP_REQUEST
    mock_repo.delete_help_request.return_value = True
    
    response = client.delete("/api/v1/help-requests/1")
    
    app.dependency_overrides = {} # Clean up
    assert response.status_code == status.HTTP_204_NO_CONTENT
    mock_repo.delete_help_request.assert_called_once()

def test_delete_help_request_invalid_status(mock_repo):
    """Test deleting a request with invalid status (e.g. IN_PROGRESS)."""
    app.dependency_overrides[verify_admin] = lambda: MOCK_ADMIN
    in_progress_request = HelpRequest(
        id=1, status=HelpRequest.HelpStatus.IN_PROGRESS, user_id=1
    )
    mock_repo.get_help_request_by_id.return_value = in_progress_request
    
    response = client.delete("/api/v1/help-requests/1")
    
    app.dependency_overrides = {} # Clean up
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Cannot delete" in response.json()["detail"]

def test_delete_help_request_db_error_rollback(mock_repo):
    """Test database rollback on delete error."""
    app.dependency_overrides[verify_admin] = lambda: MOCK_ADMIN
    mock_session = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_session
    
    mock_repo.get_help_request_by_id.return_value = MOCK_HELP_REQUEST
    mock_repo.delete_help_request.side_effect = SQLAlchemyError("DB Error")
    
    response = client.delete("/api/v1/help-requests/1")
    
    app.dependency_overrides = {} # Clean up
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    mock_session.rollback.assert_called_once()
