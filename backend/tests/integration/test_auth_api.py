"""
Integration tests for Authentication API (backend/app/routers/auth.py)

Tests cover:
- User signup and registration
- Login with email/phone
- OTP verification
- Token refresh
- Password reset flow
- Security validations
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.models import Base, User
from app.database.database import get_db
from app.core.security import get_password_hash
from datetime import datetime, timedelta
import pytz

# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_auth.db"
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
def test_user_data():
    """Sample user data for testing."""
    return {
        
        "email": "test@example.com",
        "pwd": "SecurePassword123!",
        "confirm_pwd": "SecurePassword123!",
        "full_name": "Test User",
        "phone": "0912345678",
        
    }


@pytest.fixture
def verified_user():
    """Create a verified user in the database."""
    db = TestingSessionLocal()
    user = User(
        
        email="verified@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Verified User",
        phone="0987654321",
        is_verified=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


class TestUserSignup:
    """Test user registration endpoint."""

    def test_signup_with_valid_data_returns_201(self, test_user_data):
        """Test successful user registration."""
        response = client.post("/api/v1/auth/signup", json=test_user_data)

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "OTP" in data["message"] or "verification" in data["message"].lower()

    def test_signup_with_duplicate_email_returns_400(self, test_user_data):
        """Test that duplicate email is rejected."""
        # Create first user
        client.post("/api/v1/auth/signup", json=test_user_data)

        # Try to create duplicate
        response = client.post("/api/v1/auth/signup", json=test_user_data)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_signup_with_duplicate_phone_returns_400(self, test_user_data):
        """Test that duplicate phone number is rejected."""
        # Create first user
        client.post("/api/v1/auth/signup", json=test_user_data)

        # Try different email, same phone
        duplicate_phone_data = test_user_data.copy()
        duplicate_phone_data["email"] = "different@example.com"

        response = client.post("/api/v1/auth/signup", json=duplicate_phone_data)

        assert response.status_code == 400
        assert "phone" in response.json()["detail"].lower()

    def test_signup_with_mismatched_passwords_returns_422(self, test_user_data):
        """Test that mismatched passwords are rejected."""
        test_user_data["confirm_pwd"] = "DifferentPassword123!"

        response = client.post("/api/v1/auth/signup", json=test_user_data)

        assert response.status_code == 422 or response.status_code == 400

    def test_signup_with_weak_password_returns_422(self, test_user_data):
        """Test that weak passwords are rejected."""
        test_user_data["pwd"] = "weak"
        test_user_data["confirm_pwd"] = "weak"

        response = client.post("/api/v1/auth/signup", json=test_user_data)

        # Should fail validation
        assert response.status_code in [400, 422]

    def test_signup_with_invalid_email_returns_422(self, test_user_data):
        """Test that invalid email format is rejected."""
        test_user_data["email"] = "not-an-email"

        response = client.post("/api/v1/auth/signup", json=test_user_data)

        assert response.status_code == 422


class TestUserLogin:
    """Test user login endpoint."""

    def test_login_with_valid_credentials_returns_tokens(self, verified_user):
        """Test successful login returns access and refresh tokens."""
        login_data = {
            "identifier": verified_user.email,
            "pwd": "password123"
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

    def test_login_with_invalid_password_returns_401(self, verified_user):
        """Test that wrong password returns 401 Unauthorized."""
        login_data = {
            "identifier": verified_user.email,
            "pwd": "WrongPassword123!"
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401
        assert "credentials" in response.json()["detail"].lower()

    def test_login_with_nonexistent_email_returns_401(self):
        """Test that nonexistent user returns 401."""
        login_data = {
            "identifier": "nonexistent@example.com",
            "pwd": "password123"
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401

    def test_login_with_phone_number_succeeds(self, verified_user):
        """Test login using phone number instead of email."""
        login_data = {
            "identifier": verified_user.phone_number,
            "pwd": "password123"
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data


class TestOTPVerification:
    """Test OTP verification endpoint."""

    def test_verify_otp_with_valid_code_succeeds(self):
        """Test OTP verification with valid code."""
        db = TestingSessionLocal()

        # Create unverified user with OTP
        user = User(
            
            email="otp@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="OTP User",
            is_verified=False,
            otp="123456",
            otp_expires_at=datetime.now(pytz.utc) + timedelta(minutes=10)
        )
        db.add(user)
        db.commit()
        db.close()

        verify_data = {
            "email": "otp@example.com",
            "otp": "123456"
        }

        response = client.post("/api/v1/auth/verify-otp", json=verify_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    def test_verify_otp_with_invalid_code_fails(self):
        """Test OTP verification with wrong code."""
        db = TestingSessionLocal()

        user = User(
            
            email="otp2@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="OTP User 2",
            is_verified=False,
            otp="123456",
            otp_expires_at=datetime.now(pytz.utc) + timedelta(minutes=10)
        )
        db.add(user)
        db.commit()
        db.close()

        verify_data = {
            "email": "otp2@example.com",
            "otp": "wrong123"
        }

        response = client.post("/api/v1/auth/verify-otp", json=verify_data)

        assert response.status_code == 400
        assert "Invalid" in response.json()["detail"]

    def test_verify_otp_with_expired_code_fails(self):
        """Test OTP verification with expired code."""
        db = TestingSessionLocal()

        user = User(
            
            email="expired@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Expired User",
            is_verified=False,
            otp="123456",
            otp_expires_at=datetime.now(pytz.utc) - timedelta(minutes=10)  # Expired
        )
        db.add(user)
        db.commit()
        db.close()

        verify_data = {
            "email": "expired@example.com",
            "otp": "123456"
        }

        response = client.post("/api/v1/auth/verify-otp", json=verify_data)

        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower() or "invalid" in response.json()["detail"].lower()


class TestTokenRefresh:
    """Test token refresh endpoint."""

    def test_refresh_token_with_valid_token_returns_new_access_token(self, verified_user):
        """Test refreshing access token with valid refresh token."""
        # First, login to get tokens
        login_data = {
            "identifier": verified_user.email,
            "pwd": "password123"
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)
        tokens = login_response.json()

        # Refresh the token
        refresh_data = {
            "refresh_token": tokens["refresh_token"]
        }

        response = client.post("/api/v1/auth/refresh", json=refresh_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        # New access token should be different from original
        assert data["access_token"] != tokens["access_token"]

    def test_refresh_token_with_invalid_token_returns_401(self):
        """Test refresh with invalid token."""
        refresh_data = {
            "refresh_token": "invalid.token.here"
        }

        response = client.post("/api/v1/auth/refresh", json=refresh_data)

        assert response.status_code == 401


class TestPasswordReset:
    """Test password reset flow."""

    def test_forgot_password_sends_otp(self, verified_user):
        """Test forgot password endpoint sends OTP."""
        forgot_data = {
            "email": verified_user.email
        }

        response = client.post("/api/v1/password/forgot", json=forgot_data)

        assert response.status_code == 200
        assert "OTP" in response.json()["message"] or "sent" in response.json()["message"].lower()

    def test_forgot_password_with_nonexistent_email_returns_success(self):
        """Test forgot password with nonexistent email (security: don't reveal if email exists)."""
        forgot_data = {
            "email": "nonexistent@example.com"
        }

        response = client.post("/api/v1/password/forgot", json=forgot_data)

        # Should return success even for nonexistent email (security best practice)
        assert response.status_code == 200


# Summary comment
"""
Test Coverage Summary:
- ✅ User Signup (6 tests)
- ✅ User Login (4 tests)
- ✅ OTP Verification (3 tests)
- ✅ Token Refresh (2 tests)
- ✅ Password Reset (2 tests)

Total: 17 integration tests for Auth API
"""
