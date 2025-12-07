# Backend Testing Guide

## Quick Start

### 1. Install Test Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `pytest` - Test framework
- `pytest-asyncio` - Async test support
- `pytest-cov` - Coverage reporting
- `pytest-mock` - Mocking utilities

### 2. Run Tests

**Windows:**
```bash
cd backend
run_tests.bat
```

**Linux/Mac:**
```bash
cd backend
chmod +x run_tests.sh
./run_tests.sh
```

**Or use pytest directly:**
```bash
cd backend
pytest
```

### 3. View Coverage Report

After running tests, open `backend/htmlcov/index.html` in your browser to see detailed coverage.

## Test Structure

```
backend/
├── tests/
│   ├── unit/                    # Fast unit tests
│   │   ├── test_security.py     # Password hashing, JWT tokens
│   │   ├── test_response_cache.py
│   │   └── test_rate_limiter.py
│   ├── integration/             # Database integration tests
│   │   └── test_user_repository.py
│   ├── conftest.py              # Shared fixtures
│   └── README.md                # Detailed test docs
├── pytest.ini                   # Pytest configuration
├── run_tests.sh                 # Test runner (Linux/Mac)
└── run_tests.bat                # Test runner (Windows)
```

## What's Already Tested

✅ **Security Module** (`app/core/security.py`)
- Password hashing and verification
- JWT token creation and validation
- Access token and refresh token logic

✅ **User Repository** (`app/repository/user_repository.py`)
- User creation (with duplicate checks)
- User retrieval (by email, phone, ID)
- User authentication
- OTP verification
- User listing

✅ **Response Cache** (`app/utils/response_cache.py`)
- LRU cache functionality
- TTL expiration
- Cache statistics
- Query normalization

✅ **Rate Limiter** (`app/utils/rate_limiter.py`)
- Token bucket algorithm
- RPM/RPD limits
- Burst allowance

## Next Steps: What to Test Next

### High Priority (Critical Paths)

1. **Auth Service** (`app/services/auth.py`)
   - Login flow
   - Signup flow
   - Password reset flow
   - OTP verification

2. **API Endpoints** (`app/routers/`)
   - POST `/api/v1/auth/signup`
   - POST `/api/v1/auth/login`
   - POST `/api/v1/auth/verify-otp`
   - GET `/api/v1/users/me`

3. **Email Service** (`app/services/email_service.py`)
   - OTP email sending (mocked)
   - Email template rendering

### Medium Priority

4. **RAG Service** (`app/services/ai_service.py`)
   - Mock AI responses
   - Cache integration
   - Rate limiting integration

5. **Other Repositories**
   - `lawyer_repository.py`
   - `service_request_repository.py`
   - `consultation_repository.py`

## Coverage Goals

- **Current**: ~30-40% (with existing tests)
- **Target**: 70% minimum
- **Critical Modules**: 90%+
  - `app/core/security.py` ✅ (100%)
  - `app/repository/user_repository.py` ✅ (80%+)
  - `app/services/auth.py` ⏳ (0% - needs tests)

## Running Specific Tests

```bash
# Run only unit tests (fast)
pytest -m unit

# Run only integration tests
pytest -m integration

# Run only auth-related tests
pytest -m auth

# Run specific test file
pytest tests/unit/test_security.py

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=html
```

## Writing New Tests

### Example: Testing Auth Service

Create `backend/tests/integration/test_auth_service.py`:

```python
import pytest
from app.services.auth import AuthService

@pytest.mark.integration
@pytest.mark.auth
class TestAuthService:
    def test_forgot_password_sends_email(self, db_session, test_user, mock_brevo_email_service):
        """Forgot password should send email."""
        auth_service = AuthService(db_session)
        result = auth_service.forgot_password(test_user.email)
        
        assert result is True
        mock_brevo_email_service.assert_called_once()
```

## Troubleshooting

### Import Errors
- Make sure you're in the `backend/` directory
- Check that `app/` is in Python path

### Database Errors
- Tests use SQLite in-memory database (no setup needed)
- If you see connection errors, check `conftest.py`

### Coverage Not Showing
- Run: `pytest --cov=app --cov-report=html`
- Open `htmlcov/index.html` in browser

## CI/CD Integration

To run tests in CI/CD:

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    cd backend
    pip install -r requirements.txt
    pytest --cov=app --cov-report=xml
```

## Best Practices

1. ✅ **Test naming**: `test_<function>_<condition>_<expected_result>`
2. ✅ **AAA pattern**: Arrange-Act-Assert
3. ✅ **Use fixtures**: Don't duplicate setup code
4. ✅ **Mock external services**: Email, AI, etc.
5. ✅ **Isolation**: Each test should be independent
6. ✅ **Fast tests**: Unit tests should be <100ms each

## Need Help?

- See `backend/tests/README.md` for detailed documentation
- Check existing tests for examples
- Review pytest documentation: https://docs.pytest.org/

