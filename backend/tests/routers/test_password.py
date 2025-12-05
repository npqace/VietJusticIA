import pytest
from fastapi import status
from fastapi.testclient import TestClient
from app.middleware.rate_limit_auth import rate_limit_store
from app.main import app
from unittest.mock import patch
import os

# --- Fixtures ---

@pytest.fixture
def client(override_get_db):
    """
    Local client fixture with raise_server_exceptions=False.
    This ensures we receive 429 responses instead of exceptions.
    """
    return TestClient(app, raise_server_exceptions=False)

@pytest.fixture(autouse=True)
def clear_rate_limits():
    """
    Automatically clear rate limit store before and after each test.
    """
    rate_limit_store.requests.clear()
    yield
    rate_limit_store.requests.clear()

# --- Rate Limiting Tests ---

@pytest.mark.asyncio
async def test_forgot_password_rate_limit(client):
    """
    Test that rate limiting works for forgot-password endpoint.
    Limit is 3 attempts per 60 minutes.
    """
    endpoint = "/api/v1/password/forgot-password"
    payload = {"email": "test@example.com"}
    
    # Temporarily enable rate limiting by changing environment
    with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
        # Attempt 1: Should succeed
        response = client.post(endpoint, json=payload)
        assert response.status_code == status.HTTP_200_OK
        
        # Attempt 2: Should succeed
        response = client.post(endpoint, json=payload)
        assert response.status_code == status.HTTP_200_OK
        
        # Attempt 3: Should succeed
        response = client.post(endpoint, json=payload)
        assert response.status_code == status.HTTP_200_OK
        
        # Attempt 4: Should fail (Rate limit exceeded)
        response = client.post(endpoint, json=payload)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Too many requests" in response.json()["detail"]["error"]

@pytest.mark.asyncio
async def test_verify_otp_rate_limit(client):
    """
    Test that rate limiting works for verify-reset-otp endpoint.
    Limit is 5 attempts per 15 minutes.
    """
    endpoint = "/api/v1/password/verify-reset-otp"
    payload = {"email": "test@example.com", "otp": "123456"}
    
    with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
        # 5 allowed attempts
        for _ in range(5):
            response = client.post(endpoint, json=payload)
            # It might return 400 or 404 depending on logic, but NOT 429 yet
            assert response.status_code != status.HTTP_429_TOO_MANY_REQUESTS
            
        # 6th attempt: Should fail with 429
        response = client.post(endpoint, json=payload)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

@pytest.mark.asyncio
async def test_reset_password_rate_limit(client):
    """
    Test that rate limiting works for reset-password endpoint.
    Limit is 3 attempts per 15 minutes.
    """
    endpoint = "/api/v1/password/reset-password"
    payload = {"token": "fake-token", "new_password": "StrongPassword1!"}
    
    with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
        # 3 allowed attempts
        for _ in range(3):
            response = client.post(endpoint, json=payload)
            assert response.status_code != status.HTTP_429_TOO_MANY_REQUESTS
            
        # 4th attempt: Should fail with 429
        response = client.post(endpoint, json=payload)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


# --- Password Validation Tests ---

def test_reset_password_validation_weak(client):
    """
    Test that weak passwords are rejected during password reset.
    Validation happens at schema level, so it returns 422.
    """
    endpoint = "/api/v1/password/reset-password"
    token = "some-valid-token"
    
    # We need to manually clear limits here if the fixture doesn't work as expected,
    # but autouse should handle it.
    
    weak_passwords = [
        "short",                # Too short
        "nouppercase1!",        # No uppercase
        "NOLOWERCASE1!",        # No lowercase
        "NoNumber!",            # No number
        "NoSpecialChar1",       # No special char
    ]
    
    for pwd in weak_passwords:
        payload = {"token": token, "new_password": pwd}
        response = client.post(endpoint, json=payload)
        
        # If rate limit hits, it's a test failure (means limit wasn't cleared or we sent too many)
        assert response.status_code != status.HTTP_429_TOO_MANY_REQUESTS, "Rate limit hit during validation test"
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Clear limit after each request to prevent blocking subsequent checks
        # Since we share the same IP in tests
        rate_limit_store.requests.clear()

def test_reset_password_validation_strong(client):
    """
    Test that a strong password passes validation.
    The endpoint might fail with 400 (Invalid token) but NOT 422.
    """
    endpoint = "/api/v1/password/reset-password"
    token = "invalid-token-but-valid-request"
    strong_password = "StrongPassword1!"
    
    payload = {"token": token, "new_password": strong_password}
    response = client.post(endpoint, json=payload)
    
    assert response.status_code != status.HTTP_429_TOO_MANY_REQUESTS
    # Should NOT be 422 (Validation Error)
    assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
    # Should be 400 (Invalid token)
    assert response.status_code == status.HTTP_400_BAD_REQUEST