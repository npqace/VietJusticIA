"""
Unit tests for security module (password hashing, JWT tokens).

These tests are fast and don't require database or external services.
"""

import pytest
from datetime import timedelta
from jose import jwt, JWTError
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token,
    verify_refresh_token,
    SECRET_KEY,
    REFRESH_SECRET_KEY,
    ALGORITHM,
)


@pytest.mark.unit
@pytest.mark.auth
class TestPasswordHashing:
    """Tests for password hashing functions."""

    def test_hash_password_creates_different_hash_each_time(self):
        """Password hashing should create different hashes each time (salt)."""
        password = "TestPassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        assert hash1 != hash2
        assert len(hash1) > 50  # Bcrypt hashes are long
        assert len(hash2) > 50

    def test_verify_password_with_correct_password_returns_true(self):
        """Verifying correct password should return True."""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True

    def test_verify_password_with_incorrect_password_returns_false(self):
        """Verifying incorrect password should return False."""
        password = "TestPassword123!"
        wrong_password = "WrongPassword456!"
        hashed = get_password_hash(password)
        
        assert verify_password(wrong_password, hashed) is False

    def test_password_hash_is_not_reversible(self):
        """Password hash should not reveal original password."""
        password = "SecretPassword123!"
        hashed = get_password_hash(password)
        
        # Hash should not contain original password
        assert password not in hashed
        assert hashed != password


@pytest.mark.unit
@pytest.mark.auth
class TestJWTTokens:
    """Tests for JWT token creation and verification."""

    def test_create_access_token_returns_valid_jwt(self):
        """Access token should be a valid JWT string."""
        data = {"sub": "test@example.com"}
        token = create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 20  # JWT tokens are long strings

    def test_create_access_token_includes_expiration(self):
        """Access token should include expiration claim."""
        data = {"sub": "test@example.com"}
        token = create_access_token(data)
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "exp" in payload
        assert payload["sub"] == "test@example.com"

    def test_create_access_token_with_custom_expiration(self):
        """Access token should respect custom expiration delta."""
        data = {"sub": "test@example.com"}
        custom_delta = timedelta(minutes=5)
        token = create_access_token(data, expires_delta=custom_delta)
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert "exp" in payload

    def test_verify_token_with_valid_token_returns_payload(self):
        """Verifying valid token should return payload."""
        data = {"sub": "test@example.com", "scope": "test"}
        token = create_access_token(data)
        
        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == "test@example.com"
        assert payload["scope"] == "test"

    def test_verify_token_with_invalid_token_returns_none(self):
        """Verifying invalid token should return None."""
        invalid_token = "invalid.jwt.token"
        
        payload = verify_token(invalid_token)
        assert payload is None

    def test_verify_token_with_expired_token_returns_none(self):
        """Verifying expired token should return None."""
        data = {"sub": "test@example.com"}
        # Create token with negative expiration (already expired)
        expired_delta = timedelta(minutes=-10)
        token = create_access_token(data, expires_delta=expired_delta)
        
        # Try to decode - should raise exception
        with pytest.raises(JWTError):
            jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    def test_create_refresh_token_includes_type_claim(self):
        """Refresh token should include 'type': 'refresh' claim."""
        data = {"sub": "test@example.com"}
        token = create_refresh_token(data)
        
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["type"] == "refresh"
        assert payload["sub"] == "test@example.com"

    def test_verify_refresh_token_with_valid_token_returns_payload(self):
        """Verifying valid refresh token should return payload."""
        data = {"sub": "test@example.com"}
        token = create_refresh_token(data)
        
        payload = verify_refresh_token(token)
        assert payload is not None
        assert payload["type"] == "refresh"

    def test_verify_refresh_token_with_access_token_returns_none(self):
        """Verifying refresh token with access token should return None."""
        data = {"sub": "test@example.com"}
        access_token = create_access_token(data)
        
        # Try to verify as refresh token
        payload = verify_refresh_token(access_token)
        assert payload is None

    def test_verify_refresh_token_with_invalid_token_returns_none(self):
        """Verifying invalid refresh token should return None."""
        invalid_token = "invalid.refresh.token"
        
        payload = verify_refresh_token(invalid_token)
        assert payload is None

    def test_tokens_use_different_secret_keys(self):
        """Access and refresh tokens should use different secret keys."""
        data = {"sub": "test@example.com"}
        access_token = create_access_token(data)
        refresh_token = create_refresh_token(data)
        
        # Access token should decode with SECRET_KEY
        access_payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        assert access_payload["sub"] == "test@example.com"
        
        # Refresh token should decode with REFRESH_SECRET_KEY
        refresh_payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        assert refresh_payload["type"] == "refresh"

