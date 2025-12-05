
import pytest
from datetime import timedelta, timezone
from jose import jwt
from app.core import security
import os
from unittest.mock import patch

# Mock environment variables
@pytest.fixture(autouse=True)
def mock_env_vars():
    with patch.dict(os.environ, {
        "SECRET_KEY": "test_secret_key",
        "REFRESH_SECRET_KEY": "test_refresh_secret_key",
        "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
        "REFRESH_TOKEN_EXPIRE_MINUTES": "10080"
    }):
        yield

def test_password_hashing():
    password = "securepassword"
    hashed = security.get_password_hash(password)
    assert hashed != password
    assert security.verify_password(password, hashed)
    assert not security.verify_password("wrongpassword", hashed)

def test_password_validation_empty():
    assert not security.verify_password("", "hash")
    assert not security.verify_password("pass", "")
    
    with pytest.raises(ValueError):
        security.get_password_hash("")

def test_access_token_creation_and_verification():
    data = {"sub": "user@example.com"}
    token = security.create_access_token(data)
    payload = security.verify_token(token)
    assert payload is not None
    assert payload["sub"] == "user@example.com"
    assert "exp" in payload

def test_refresh_token_creation_and_verification():
    data = {"sub": "user@example.com"}
    token = security.create_refresh_token(data)
    payload = security.verify_refresh_token(token)
    assert payload is not None
    assert payload["sub"] == "user@example.com"
    assert payload["type"] == "refresh"
    assert "exp" in payload

def test_invalid_token():
    assert security.verify_token("invalid.token.here") is None
    assert security.verify_refresh_token("invalid.token.here") is None

def test_token_expiration():
    # Create a token that expired 1 minute ago
    data = {"sub": "user@example.com"}
    expires = timedelta(minutes=-1)
    token = security.create_access_token(data, expires_delta=expires)
    
    # Verify it fails
    assert security.verify_token(token) is None

def test_refresh_token_type_check():
    # Create an access token (type not 'refresh') using refresh secret
    # This simulates a token signed correctly but with wrong type
    to_encode = {"sub": "user@example.com", "type": "access"}
    encoded_jwt = jwt.encode(to_encode, security.REFRESH_SECRET_KEY, algorithm=security.ALGORITHM)
    
    assert security.verify_refresh_token(encoded_jwt) is None
