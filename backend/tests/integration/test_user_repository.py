"""
Integration tests for user repository.

These tests require a database connection.
"""

import pytest
from fastapi import HTTPException
from app.repository import user_repository
from app.model.userModel import SignUpModel
from app.core.security import verify_password


@pytest.mark.integration
@pytest.mark.repository
class TestUserRepository:
    """Tests for user repository CRUD operations."""

    def test_create_user_with_valid_data_succeeds(self, db_session, sample_user_data):
        """Creating user with valid data should succeed."""
        signup_data = SignUpModel(
            full_name=sample_user_data["full_name"],
            email=sample_user_data["email"],
            phone=sample_user_data["phone"],
            pwd=sample_user_data["password"],
            confirm_pwd=sample_user_data["password"],  # Add confirm_pwd field
        )
        
        user = user_repository.create_user(db_session, signup_data)
        
        assert user is not None
        assert user.id is not None
        assert user.email == sample_user_data["email"]
        assert user.phone == sample_user_data["phone"]
        assert user.full_name == sample_user_data["full_name"]
        assert verify_password(sample_user_data["password"], user.hashed_password)
        assert user.is_verified is False  # New users start unverified
        assert user.is_active is True

    def test_create_user_with_duplicate_email_raises_exception(self, db_session, sample_user_data):
        """Creating user with duplicate email should raise HTTPException."""
        signup_data = SignUpModel(
            full_name=sample_user_data["full_name"],
            email=sample_user_data["email"],
            phone=sample_user_data["phone"],
            pwd=sample_user_data["password"],
            confirm_pwd=sample_user_data["password"],  # Add confirm_pwd field
        )
        
        # Create first user
        user_repository.create_user(db_session, signup_data)
        
        # Try to create duplicate
        with pytest.raises(ValueError) as exc_info:
            user_repository.create_user(db_session, signup_data)
        
        assert "Email already registered" in str(exc_info.value)

    def test_create_user_with_duplicate_phone_raises_exception(self, db_session, sample_user_data):
        """Creating user with duplicate phone should raise HTTPException."""
        signup_data1 = SignUpModel(
            full_name="User One",
            email="user1@example.com",
            phone=sample_user_data["phone"],
            pwd=sample_user_data["password"],
            confirm_pwd=sample_user_data["password"],  # Add confirm_pwd field
        )
        
        signup_data2 = SignUpModel(
            full_name="User Two",
            email="user2@example.com",
            phone=sample_user_data["phone"],  # Same phone
            pwd=sample_user_data["password"],
            confirm_pwd=sample_user_data["password"],  # Add confirm_pwd field
        )
        
        # Create first user
        user_repository.create_user(db_session, signup_data1)
        
        # Try to create duplicate phone
        with pytest.raises(ValueError) as exc_info:
            user_repository.create_user(db_session, signup_data2)
        
        assert "Phone number already registered" in str(exc_info.value)

    def test_get_user_by_email_with_existing_user_returns_user(self, db_session, create_test_user):
        """Getting user by email should return user if exists."""
        user = create_test_user(email="test@example.com")
        
        found_user = user_repository.get_user_by_email(db_session, "test@example.com")
        
        assert found_user is not None
        assert found_user.id == user.id
        assert found_user.email == "test@example.com"

    def test_get_user_by_email_with_nonexistent_user_returns_none(self, db_session):
        """Getting user by email should return None if not exists."""
        found_user = user_repository.get_user_by_email(db_session, "nonexistent@example.com")
        
        assert found_user is None

    def test_get_user_by_phone_with_existing_user_returns_user(self, db_session, create_test_user):
        """Getting user by phone should return user if exists."""
        user = create_test_user(phone="0123456789")
        
        found_user = user_repository.get_user_by_phone(db_session, "0123456789")
        
        assert found_user is not None
        assert found_user.id == user.id
        assert found_user.phone == "0123456789"

    def test_get_user_by_phone_with_nonexistent_user_returns_none(self, db_session):
        """Getting user by phone should return None if not exists."""
        found_user = user_repository.get_user_by_phone(db_session, "9999999999")
        
        assert found_user is None

    def test_get_user_by_id_with_existing_user_returns_user(self, db_session, create_test_user):
        """Getting user by ID should return user if exists."""
        user = create_test_user()
        
        found_user = user_repository.get_user_by_id(db_session, user.id)
        
        assert found_user is not None
        assert found_user.id == user.id

    def test_get_user_by_id_with_nonexistent_user_returns_none(self, db_session):
        """Getting user by ID should return None if not exists."""
        found_user = user_repository.get_user_by_id(db_session, 99999)
        
        assert found_user is None

    def test_authenticate_user_with_valid_credentials_returns_user(self, db_session, create_test_user):
        """Authenticating with valid credentials should return user."""
        user = create_test_user(
            email="test@example.com",
            password="TestPassword123!",
        )
        
        authenticated = user_repository.authenticate_user(
            db_session,
            "test@example.com",
            "TestPassword123!",
        )
        
        assert authenticated is not None
        assert authenticated.id == user.id

    def test_authenticate_user_with_invalid_password_returns_none(self, db_session, create_test_user):
        """Authenticating with invalid password should return None."""
        create_test_user(
            email="test@example.com",
            password="CorrectPassword123!",
        )
        
        authenticated = user_repository.authenticate_user(
            db_session,
            "test@example.com",
            "WrongPassword123!",
        )
        
        assert authenticated is None

    def test_authenticate_user_with_nonexistent_email_returns_none(self, db_session):
        """Authenticating with nonexistent email should return None."""
        authenticated = user_repository.authenticate_user(
            db_session,
            "nonexistent@example.com",
            "SomePassword123!",
        )
        
        assert authenticated is None

    def test_authenticate_user_with_phone_identifier_works(self, db_session, create_test_user):
        """Authenticating with phone number should work."""
        user = create_test_user(
            phone="0123456789",
            password="TestPassword123!",
        )
        
        authenticated = user_repository.authenticate_user(
            db_session,
            "0123456789",  # Phone instead of email
            "TestPassword123!",
        )
        
        assert authenticated is not None
        assert authenticated.id == user.id

    def test_authenticate_user_reactivates_inactive_account(self, db_session, create_test_user):
        """Authenticating with inactive account should reactivate it."""
        user = create_test_user(
            email="test@example.com",
            password="TestPassword123!",
            is_active=False,
        )
        
        assert user.is_active is False
        
        authenticated = user_repository.authenticate_user(
            db_session,
            "test@example.com",
            "TestPassword123!",
        )
        
        assert authenticated is not None
        assert authenticated.is_active is True

    def test_verify_otp_with_valid_otp_returns_true(self, db_session, create_test_user):
        """Verifying valid OTP should return True."""
        from datetime import datetime, timedelta, timezone
        
        user = create_test_user()
        user.otp = "123456"
        user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db_session.commit()
        db_session.refresh(user)  # Refresh to ensure datetime is properly stored
        
        success, _ = user_repository.verify_otp(db_session, user, "123456")
        
        assert success is True

    def test_verify_otp_with_invalid_otp_returns_false(self, db_session, create_test_user):
        """Verifying invalid OTP should return False."""
        from datetime import datetime, timedelta
        import pytz
        
        user = create_test_user()
        user.otp = "123456"
        user.otp_expires_at = datetime.now(pytz.utc) + timedelta(minutes=10)
        db_session.commit()
        
        success, _ = user_repository.verify_otp(db_session, user, "999999")
        
        assert success is False

    def test_verify_otp_with_expired_otp_returns_false(self, db_session, create_test_user):
        """Verifying expired OTP should return False."""
        from datetime import datetime, timedelta, timezone
        
        user = create_test_user()
        user.otp = "123456"
        user.otp_expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)  # Expired
        db_session.commit()
        db_session.refresh(user)  # Refresh to ensure datetime is properly stored
        
        success, _ = user_repository.verify_otp(db_session, user, "123456")
        
        assert success is False

    def test_verify_otp_without_otp_returns_false(self, db_session, create_test_user):
        """Verifying OTP when user has no OTP should return False."""
        user = create_test_user()
        user.otp = None
        user.otp_expires_at = None
        db_session.commit()
        
        success, _ = user_repository.verify_otp(db_session, user, "123456")
        
        assert success is False

    def test_get_all_users_returns_all_users(self, db_session, create_test_user):
        """Getting all users should return all users."""
        # Use unique phone numbers to avoid UNIQUE constraint violation
        user1 = create_test_user(email="user1@example.com", phone="0123456789")
        user2 = create_test_user(email="user2@example.com", phone="0123456790")
        user3 = create_test_user(email="user3@example.com", phone="0123456791")
        
        all_users = user_repository.get_all_users(db_session)
        
        assert len(all_users) >= 3
        user_ids = [u.id for u in all_users]
        assert user1.id in user_ids
        assert user2.id in user_ids
        assert user3.id in user_ids

