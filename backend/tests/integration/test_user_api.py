"""
Integration tests for User API (backend/app/routers/users.py)

Tests cover:
- User profile retrieval
- Profile updates
- Avatar upload/delete
- Password change
- Contact information update with OTP
- Account deactivation and deletion
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.models import Base, User
from app.database.database import get_db
from app.core.security import get_password_hash, create_access_token
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import pytz
import io

# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_user.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """Create fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user():
    """Create a test user."""
    db = TestingSessionLocal()
    user = User(
        
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Test User",
        phone="0912345678",
        is_verified=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers."""
    access_token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}


class TestUserProfileRetrieval:
    """Test retrieving user profile."""

    def test_get_current_user_profile_succeeds(self, auth_headers, test_user):
        """Test getting current user's profile."""
        response = client.get("/api/v1/users/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name
        assert "hashed_password" not in data  # Password should not be exposed

    def test_get_profile_without_auth_returns_401(self):
        """Test that unauthenticated request is rejected."""
        response = client.get("/api/v1/users/me")

        assert response.status_code == 401


class TestUserProfileUpdate:
    """Test updating user profile."""

    def test_update_user_profile_succeeds(self, auth_headers):
        """Test updating user profile information."""
        update_data = {
            "full_name": "Updated Name",
            
        }

        response = client.patch("/api/v1/users/me", json=update_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"

    def test_update_profile_with_empty_data_returns_200(self, auth_headers):
        """Test updating with empty data (should return current profile)."""
        response = client.patch("/api/v1/users/me", json={}, headers=auth_headers)

        assert response.status_code == 200

    def test_update_profile_without_auth_returns_401(self):
        """Test that unauthenticated update is rejected."""
        update_data = {"full_name": "Hacker"}

        response = client.patch("/api/v1/users/me", json=update_data)

        assert response.status_code == 401


class TestAvatarManagement:
    """Test avatar upload and deletion."""

    def test_upload_avatar_succeeds(self, auth_headers):
        """Test uploading a user avatar."""
        # Create a fake image file
        fake_image = io.BytesIO(b"fake image content")
        files = {"file": ("avatar.jpg", fake_image, "image/jpeg")}

        with patch('app.routers.users.save_avatar', return_value="/avatars/test_avatar.jpg"):
            response = client.post("/api/v1/users/me/avatar", files=files, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "avatar_url" in data
        assert data["avatar_url"] is not None

    def test_upload_avatar_replaces_old_avatar(self, auth_headers, test_user):
        """Test that uploading new avatar deletes old one."""
        # Set existing avatar
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == test_user.id).first()
        user.avatar_url = "/avatars/old_avatar.jpg"
        db.commit()
        db.close()

        fake_image = io.BytesIO(b"new avatar content")
        files = {"file": ("new_avatar.jpg", fake_image, "image/jpeg")}

        with patch('app.routers.users.delete_avatar') as mock_delete:
            with patch('app.routers.users.save_avatar', return_value="/avatars/new_avatar.jpg"):
                response = client.post("/api/v1/users/me/avatar", files=files, headers=auth_headers)

        # Verify old avatar was deleted
        mock_delete.assert_called_once_with("/avatars/old_avatar.jpg")
        assert response.status_code == 200

    def test_delete_avatar_succeeds(self, auth_headers, test_user):
        """Test deleting user avatar."""
        # Set avatar first
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == test_user.id).first()
        user.avatar_url = "/avatars/avatar.jpg"
        db.commit()
        db.close()

        with patch('app.routers.users.delete_avatar'):
            response = client.delete("/api/v1/users/me/avatar", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["avatar_url"] is None

    def test_delete_nonexistent_avatar_returns_404(self, auth_headers):
        """Test deleting avatar when user has none."""
        response = client.delete("/api/v1/users/me/avatar", headers=auth_headers)

        assert response.status_code == 404
        assert "No avatar to delete" in response.json()["detail"]


class TestPasswordChange:
    """Test password change functionality."""

    def test_change_password_with_correct_current_password_succeeds(self, auth_headers, test_user):
        """Test changing password with correct current password."""
        change_data = {
            "current_password": "password123",
            "new_password": "NewSecurePassword456!",
            "confirm_new_password": "NewSecurePassword456!"
        }

        response = client.post("/api/v1/users/me/change-password", json=change_data, headers=auth_headers)

        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()

    def test_change_password_with_incorrect_current_password_returns_400(self, auth_headers):
        """Test that incorrect current password is rejected."""
        change_data = {
            "current_password": "wrong_password",
            "new_password": "NewPassword123!",
            "confirm_new_password": "NewPassword123!"
        }

        response = client.post("/api/v1/users/me/change-password", json=change_data, headers=auth_headers)

        assert response.status_code == 400
        assert "incorrect" in response.json()["detail"].lower()

    def test_change_password_with_mismatched_passwords_returns_400(self, auth_headers):
        """Test that mismatched new passwords are rejected."""
        change_data = {
            "current_password": "password123",
            "new_password": "NewPassword123!",
            "confirm_new_password": "DifferentPassword456!"
        }

        response = client.post("/api/v1/users/me/change-password", json=change_data, headers=auth_headers)

        assert response.status_code == 400
        assert "do not match" in response.json()["detail"].lower()


class TestContactUpdate:
    """Test email and phone number update with OTP verification."""

    def test_update_email_sends_otp(self, auth_headers):
        """Test that updating email sends OTP."""
        update_data = {"email": "newemail@example.com"}

        with patch('app.routers.users.send_verification_otp') as mock_send_otp:
            response = client.post("/api/v1/users/me/update-contact", json=update_data, headers=auth_headers)

        assert response.status_code == 200
        assert "OTP" in response.json()["message"]
        mock_send_otp.assert_called_once()

    def test_update_phone_sends_otp(self, auth_headers):
        """Test that updating phone number sends OTP."""
        update_data = {"phone": "0987654321"}

        with patch('app.routers.users.send_verification_otp') as mock_send_otp:
            response = client.post("/api/v1/users/me/update-contact", json=update_data, headers=auth_headers)

        assert response.status_code == 200
        mock_send_otp.assert_called_once()

    def test_update_contact_with_duplicate_email_returns_400(self, auth_headers):
        """Test that duplicate email is rejected."""
        # Create another user with existing email
        db = TestingSessionLocal()
        existing_user = User(
            
            email="existing@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Existing User",
            is_verified=True,
            is_active=True
        )
        db.add(existing_user)
        db.commit()
        db.close()

        update_data = {"email": "existing@example.com"}

        response = client.post("/api/v1/users/me/update-contact", json=update_data, headers=auth_headers)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_verify_contact_update_with_valid_otp_succeeds(self, auth_headers, test_user):
        """Test verifying contact update with valid OTP."""
        # Set up user with pending email change and OTP
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == test_user.id).first()
        user.new_email = "newemail@example.com"
        user.otp = "123456"
        user.otp_expires_at = datetime.now(pytz.utc) + timedelta(minutes=10)
        db.commit()
        db.close()

        verify_data = {
            "email": "newemail@example.com",
            "otp": "123456"
        }

        response = client.post("/api/v1/users/me/verify-contact-update", json=verify_data, headers=auth_headers)

        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()
        # Should return new access token since email changed
        assert "access_token" in response.json()


class TestAccountDeletion:
    """Test account deactivation and permanent deletion."""

    def test_deactivate_user_account_succeeds(self, auth_headers, test_user):
        """Test deactivating user account."""
        response = client.delete("/api/v1/users/me", headers=auth_headers)

        assert response.status_code == 204

        # Verify user is deactivated
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == test_user.id).first()
        assert user.is_active is False
        db.close()

    def test_deactivate_already_inactive_account_returns_400(self, auth_headers, test_user):
        """Test that deactivating already inactive account fails."""
        # Deactivate first
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == test_user.id).first()
        user.is_active = False
        db.commit()
        db.close()

        response = client.delete("/api/v1/users/me", headers=auth_headers)

        assert response.status_code == 400
        assert "already inactive" in response.json()["detail"].lower()

    def test_permanently_delete_user_account_succeeds(self, auth_headers, test_user):
        """Test permanently deleting user account."""
        response = client.delete("/api/v1/users/me/permanent", headers=auth_headers)

        assert response.status_code == 204

        # Verify user is deleted
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == test_user.id).first()
        assert user is None
        db.close()


# Summary comment
"""
Test Coverage Summary:
- ✅ User Profile Retrieval (2 tests)
- ✅ Profile Updates (3 tests)
- ✅ Avatar Management (4 tests)
- ✅ Password Change (3 tests)
- ✅ Contact Update (4 tests)
- ✅ Account Deletion (3 tests)

Total: 19 integration tests for User API
"""
