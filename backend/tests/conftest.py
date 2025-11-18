"""
Pytest configuration and shared fixtures.

This file is automatically loaded by pytest and provides fixtures
available to all test files.
"""

import pytest
import os
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

# Set test environment variables BEFORE importing app modules
# This prevents database connection attempts during import
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only-do-not-use-in-production"
os.environ["REFRESH_SECRET_KEY"] = "test-refresh-secret-key-for-testing-only"
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"  # Use SQLite for tests

# Mock psycopg2 to prevent PostgreSQL connection attempts during import
# The database.py module tries to connect at import time, so we need to mock it first
import psycopg2
original_connect = psycopg2.connect

def mock_psycopg2_connect(*args, **kwargs):
    """Mock psycopg2.connect to prevent actual database connections during tests."""
    class MockConnection:
        def set_isolation_level(self, level):
            pass
        def cursor(self):
            return MockCursor()
        def close(self):
            pass
    
    class MockCursor:
        def execute(self, query):
            pass
        def fetchone(self):
            return None
        def close(self):
            pass
    
    return MockConnection()

# Replace psycopg2.connect with mock before importing app modules
psycopg2.connect = mock_psycopg2_connect

from app.database.database import Base, get_db
from app.main import app
from app.database.models import User


# --- Database Fixtures ---

@pytest.fixture(scope="function")
def test_db():
    """
    Create a test database in memory (SQLite) for each test.
    
    This provides isolation between tests - each test gets a fresh database.
    """
    # Use SQLite in-memory database for fast tests
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session factory
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create session
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(test_db):
    """
    Provide a database session for tests.
    
    Automatically rolls back after each test.
    """
    yield test_db
    test_db.rollback()


@pytest.fixture(scope="function")
def override_get_db(db_session):
    """
    Override the get_db dependency to use test database.
    """
    def _get_db():
        try:
            yield db_session
        finally:
            pass  # Don't close test session here
    
    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.clear()


# --- Test Client Fixture ---

@pytest.fixture(scope="function")
def client(override_get_db):
    """
    FastAPI test client for making HTTP requests.
    
    Automatically uses test database via override_get_db.
    """
    return TestClient(app)


# --- User Fixtures ---

@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "full_name": "Test User",
        "email": "test@example.com",
        "phone": "0123456789",
        "password": "TestPassword123!",
    }


@pytest.fixture
def create_test_user(db_session, sample_user_data):
    """
    Factory fixture to create test users.
    
    Usage:
        user = create_test_user(email="custom@example.com")
    """
    def _create_user(**kwargs):
        from app.core.security import get_password_hash
        from app.database.models import User
        
        user_data = {
            **sample_user_data,
            **kwargs
        }
        
        from app.database.models import User as UserModel
        
        # Convert role string to enum if needed
        role_value = kwargs.get("role", "user")
        if isinstance(role_value, str):
            # Map string to enum
            role_map = {
                "user": UserModel.Role.USER,
                "admin": UserModel.Role.ADMIN,
                "lawyer": UserModel.Role.LAWYER,
            }
            role_enum = role_map.get(role_value.lower(), UserModel.Role.USER)
        else:
            role_enum = role_value
        
        user = UserModel(
            full_name=user_data["full_name"],
            email=user_data["email"],
            phone=user_data["phone"],
            hashed_password=get_password_hash(user_data["password"]),
            is_verified=kwargs.get("is_verified", True),
            is_active=kwargs.get("is_active", True),
            role=role_enum,
        )
        
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    return _create_user


@pytest.fixture
def test_user(create_test_user):
    """A default test user."""
    return create_test_user()


# --- Authentication Fixtures ---

@pytest.fixture
def auth_headers(client, test_user):
    """
    Get authentication headers for a test user.
    
    Returns headers dict with Authorization token.
    """
    from app.core.security import create_access_token
    
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_user(create_test_user):
    """Create an admin user for testing."""
    return create_test_user(
        email="admin@example.com",
        role="admin",
        is_verified=True,
    )


@pytest.fixture
def lawyer_user(create_test_user):
    """Create a lawyer user for testing."""
    return create_test_user(
        email="lawyer@example.com",
        role="lawyer",
        is_verified=True,
    )


# --- Mock Fixtures ---

@pytest.fixture
def mock_email_service():
    """Mock email service to avoid sending real emails during tests."""
    with patch("app.services.email_service.send_otp_email") as mock:
        mock.return_value = True
        yield mock


@pytest.fixture
def mock_brevo_email_service():
    """Mock Brevo email service."""
    with patch("app.services.brevo_email_service.send_password_reset_otp") as mock:
        mock.return_value = True
        yield mock


@pytest.fixture
def mock_rag_service():
    """Mock RAG service to avoid initializing AI models in tests."""
    with patch("app.services.ai_service.rag_service") as mock:
        mock.is_initialized = True
        mock.invoke_chain = Mock(return_value={
            "response": "Test AI response",
            "sources": []
        })
        yield mock


# --- Utility Fixtures ---

@pytest.fixture(autouse=True)
def reset_environment():
    """
    Reset environment variables before each test.
    
    This ensures tests don't interfere with each other.
    """
    original_env = os.environ.copy()
    yield
    os.environ.clear()
    os.environ.update(original_env)

