
import pytest
from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from app.services.audit_service import audit_service
from app.database.models import SystemLog

class FakeClient:
    def __init__(self, host):
        self.host = host

class FakeRequest:
    def __init__(self, headers=None, client=None):
        self.headers = headers or {}
        self.client = client

def test_log_action_success():
    """Test successful audit log creation."""
    mock_db = MagicMock(spec=Session)
    
    # Use a fake request object instead of MagicMock
    fake_request = FakeRequest(
        headers={}, 
        client=FakeClient(host="127.0.0.1")
    )
    
    admin_id = 1
    action = "TEST_ACTION"
    target_type = "TEST_TARGET"
    target_id = "123"
    details = "Test details"
    
    # Call service
    log_entry = audit_service.log_action(
        db=mock_db,
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        request=fake_request
    )
    
    # Verify DB interactions
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()
    
    # Verify log entry attributes
    assert log_entry is not None
    assert log_entry.admin_id == admin_id
    assert log_entry.action == action
    assert log_entry.ip_address == "127.0.0.1"

def test_log_action_x_forwarded_for():
    """Test IP extraction from X-Forwarded-For header."""
    mock_db = MagicMock(spec=Session)
    
    fake_request = FakeRequest(
        headers={"X-Forwarded-For": "10.0.0.1, 192.168.1.1"},
        client=None
    )
    
    log_entry = audit_service.log_action(
        db=mock_db,
        admin_id=1,
        action="TEST",
        target_type="TEST",
        request=fake_request
    )
    
    assert log_entry.ip_address == "10.0.0.1"

def test_log_action_failure_handling():
    """Test that database errors are caught and don't crash the app."""
    mock_db = MagicMock(spec=Session)
    mock_db.commit.side_effect = Exception("Database error")
    
    log_entry = audit_service.log_action(
        db=mock_db,
        admin_id=1,
        action="TEST",
        target_type="TEST"
    )
    
    assert log_entry is None
