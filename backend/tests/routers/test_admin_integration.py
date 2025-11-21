
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.database.models import User
from app.core.security import create_access_token

def test_admin_update_user_status(
    client: TestClient, 
    create_test_user, 
    test_user: User,
    db_session: Session
):
    """Test admin updating user status."""
    # Create admin with unique phone
    admin_user = create_test_user(
        email="admin_unique@example.com", 
        phone="0999999999",
        role="admin"
    )
    
    token = create_access_token(data={"sub": admin_user.email})
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Deactivate user (using query params, body is optional but header required)
    response = client.patch(
        f"/api/v1/admin/users/{test_user.id}/status?is_active=false",
        headers=headers
    )
    assert response.status_code == 200
    
    db_session.refresh(test_user)
    assert test_user.is_active is False
    
    # Reactivate user
    response = client.patch(
        f"/api/v1/admin/users/{test_user.id}/status?is_active=true",
        headers=headers
    )
    assert response.status_code == 200
    
    db_session.refresh(test_user)
    assert test_user.is_active is True

def test_admin_self_deactivation(
    client: TestClient, 
    create_test_user
):
    """Test admin cannot deactivate themselves."""
    admin_user = create_test_user(
        email="admin_self@example.com", 
        phone="0888888888",
        role="admin"
    )
    
    token = create_access_token(data={"sub": admin_user.email})
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = client.patch(
        f"/api/v1/admin/users/{admin_user.id}/status?is_active=false",
        headers=headers
    )
    assert response.status_code == 400
    assert "Cannot deactivate your own account" in response.json()["detail"]
