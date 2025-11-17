# Backend Test Suite

Comprehensive test suite for VietJusticIA backend with pytest.

## Test Organization

```
tests/
├── unit/              # Fast unit tests (no database)
│   ├── test_security.py
│   ├── test_response_cache.py
│   └── test_rate_limiter.py
├── integration/       # Integration tests (require database)
│   └── test_user_repository.py
└── conftest.py        # Shared fixtures and configuration
```

## Running Tests

### Run All Tests
```bash
cd backend
pytest
```

### Run Specific Test Categories
```bash
# Unit tests only (fast)
pytest -m unit

# Integration tests only
pytest -m integration

# Tests by marker
pytest -m auth          # Authentication tests
pytest -m repository    # Repository tests
pytest -m service       # Service tests
pytest -m utils         # Utility tests
```

### Run Specific Test File
```bash
pytest tests/unit/test_security.py
```

### Run Specific Test Function
```bash
pytest tests/unit/test_security.py::TestPasswordHashing::test_hash_password_creates_different_hash_each_time
```

### Run with Coverage Report
```bash
pytest --cov=app --cov-report=html
# Open htmlcov/index.html in browser
```

### Run with Verbose Output
```bash
pytest -v
```

### Run Tests in Parallel (faster)
```bash
pip install pytest-xdist
pytest -n auto
```

## Test Markers

Tests are organized using pytest markers:

- `@pytest.mark.unit` - Fast unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.auth` - Authentication tests
- `@pytest.mark.repository` - Repository layer tests
- `@pytest.mark.service` - Service layer tests
- `@pytest.mark.utils` - Utility function tests
- `@pytest.mark.slow` - Slow tests (>1 second)

## Coverage Goals

- **Minimum**: 70% overall coverage
- **Target**: 80%+ for critical paths (auth, security, repositories)
- **Critical Modules**: Must have >90% coverage
  - `app/core/security.py`
  - `app/repository/user_repository.py`
  - `app/services/auth.py`

## Writing New Tests

### Unit Test Example
```python
import pytest
from app.core.security import verify_password, get_password_hash

@pytest.mark.unit
@pytest.mark.auth
class TestPasswordHashing:
    def test_verify_password_with_correct_password_returns_true(self):
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True
```

### Integration Test Example
```python
import pytest
from app.repository import user_repository

@pytest.mark.integration
@pytest.mark.repository
class TestUserRepository:
    def test_create_user_with_valid_data_succeeds(self, db_session, sample_user_data):
        user = user_repository.create_user(db_session, sample_user_data)
        assert user is not None
        assert user.email == sample_user_data["email"]
```

## Test Fixtures

Common fixtures available in `conftest.py`:

- `test_db` - In-memory SQLite database
- `db_session` - Database session with auto-rollback
- `client` - FastAPI test client
- `test_user` - Default test user
- `create_test_user` - Factory to create test users
- `auth_headers` - Authentication headers for test user
- `mock_email_service` - Mock email service
- `sample_user_data` - Sample user data dict

## Continuous Integration

Tests should pass before merging:
- All unit tests must pass
- All integration tests must pass
- Coverage must be ≥70%
- No linting errors

## Troubleshooting

### Database Connection Issues
- Tests use SQLite in-memory database (no setup needed)
- If you see connection errors, check `conftest.py` fixtures

### Import Errors
- Ensure you're running from `backend/` directory
- Check that `app/` is in Python path

### Slow Tests
- Use `pytest -m "not slow"` to skip slow tests during development
- Use `pytest -n auto` for parallel execution

## Best Practices

1. **Test Naming**: Use descriptive names: `test_<function>_<condition>_<expected_result>`
2. **AAA Pattern**: Arrange-Act-Assert structure
3. **Isolation**: Each test should be independent
4. **Fixtures**: Use fixtures for common setup
5. **Mocks**: Mock external services (email, AI, etc.)
6. **Coverage**: Aim for high coverage on critical paths

