"""
Integration tests for Service Request API (backend/app/routers/service_requests.py)

Tests cover:
- Service request detail retrieval with authorization
- Service request status updates by lawyers
- Service request deletion by admins
- Role-based access control
- Automatic conversation creation on acceptance
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.models import Base, User, Lawyer, ServiceRequest
from app.database.database import get_db
from app.core.security import get_password_hash, create_access_token
from unittest.mock import patch

# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_service_request.db"
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
    """Create a regular test user."""
    db = TestingSessionLocal()
    user = User(
        
        email="user@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Test User",
        phone="0912345678",
        role=User.Role.USER,
        is_verified=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def other_user():
    """Create another user for testing access control."""
    db = TestingSessionLocal()
    user = User(
        
        email="other@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Other User",
        phone="0999999999",
        role=User.Role.USER,
        is_verified=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def test_lawyer_user():
    """Create a lawyer user."""
    db = TestingSessionLocal()
    user = User(
        
        email="lawyer@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Lawyer User",
        phone="0987654321",
        role=User.Role.LAWYER,
        is_verified=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def test_lawyer(test_lawyer_user):
    """Create a lawyer profile."""
    db = TestingSessionLocal()
    lawyer = Lawyer(
        user_id=test_lawyer_user.id,
        specialization="Family Law",
        bio="Experienced attorney",
        city="Ho Chi Minh City",
        province="Ho Chi Minh",
        years_of_experience=10,
        bar_license_number="BAR123456",
        verification_status=Lawyer.VerificationStatus.APPROVED,
        is_available=True
    )
    db.add(lawyer)
    db.commit()
    db.refresh(lawyer)
    db.close()
    return lawyer


@pytest.fixture
def admin_user():
    """Create an admin user."""
    db = TestingSessionLocal()
    user = User(
        
        email="admin@example.com",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin User",
        role=User.Role.ADMIN,
        is_verified=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def user_auth_headers(test_user):
    """Create authentication headers for regular user."""
    access_token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def other_user_auth_headers(other_user):
    """Create authentication headers for other user."""
    access_token = create_access_token(data={"sub": other_user.email})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def lawyer_auth_headers(test_lawyer_user):
    """Create authentication headers for lawyer."""
    access_token = create_access_token(data={"sub": test_lawyer_user.email})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def admin_auth_headers(admin_user):
    """Create authentication headers for admin."""
    access_token = create_access_token(data={"sub": admin_user.email})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def test_service_request(test_user, test_lawyer):
    """Create a test service request."""
    db = TestingSessionLocal()
    request = ServiceRequest(
        user_id=test_user.id,
        lawyer_id=test_lawyer.id,
        title="Test Legal Request",
        description="I need legal assistance with a family matter",
        status=ServiceRequest.RequestStatus.PENDING
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    db.close()
    return request


class TestServiceRequestDetailRetrieval:
    """Test service request detail retrieval with authorization."""

    def test_user_can_view_own_request(self, test_service_request, user_auth_headers):
        """Test that user can view their own service request."""
        response = client.get(
            f"/api/v1/service-requests/{test_service_request.id}",
            headers=user_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_service_request.id
        assert data["title"] == "Test Legal Request"
        assert "user_full_name" in data
        assert "lawyer_full_name" in data

    def test_user_cannot_view_other_user_request(self, test_service_request, other_user_auth_headers):
        """Test that user cannot view another user's request."""
        response = client.get(
            f"/api/v1/service-requests/{test_service_request.id}",
            headers=other_user_auth_headers
        )

        assert response.status_code == 403
        assert "your own" in response.json()["detail"].lower()

    def test_lawyer_can_view_assigned_request(self, test_service_request, lawyer_auth_headers):
        """Test that lawyer can view requests assigned to them."""
        response = client.get(
            f"/api/v1/service-requests/{test_service_request.id}",
            headers=lawyer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_service_request.id

    def test_admin_can_view_any_request(self, test_service_request, admin_auth_headers):
        """Test that admin can view any service request."""
        response = client.get(
            f"/api/v1/service-requests/{test_service_request.id}",
            headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_service_request.id

    def test_get_nonexistent_request_returns_404(self, user_auth_headers):
        """Test getting non-existent service request."""
        response = client.get("/api/v1/service-requests/99999", headers=user_auth_headers)

        assert response.status_code == 404

    def test_unauthenticated_request_returns_401(self, test_service_request):
        """Test that unauthenticated access is rejected."""
        response = client.get(f"/api/v1/service-requests/{test_service_request.id}")

        assert response.status_code == 401


class TestServiceRequestStatusUpdate:
    """Test service request status updates by lawyers."""

    def test_lawyer_can_accept_request(self, test_service_request, lawyer_auth_headers):
        """Test that lawyer can accept a service request."""
        update_data = {
            "status": "ACCEPTED",
            "lawyer_response": "I accept this case and will help you."
        }

        with patch('app.routers.service_requests.conversation_repository.get_conversation_by_service_request_id', return_value=None):
            with patch('app.routers.service_requests.conversation_repository.create_conversation', return_value={"_id": "conv123"}):
                response = client.patch(
                    f"/api/v1/service-requests/{test_service_request.id}",
                    json=update_data,
                    headers=lawyer_auth_headers
                )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ACCEPTED"
        assert data["lawyer_response"] == "I accept this case and will help you."

    def test_lawyer_can_reject_request(self, test_service_request, lawyer_auth_headers):
        """Test that lawyer can reject a service request."""
        update_data = {
            "status": "REJECTED",
            "rejected_reason": "Unable to take this case due to conflict of interest."
        }

        response = client.patch(
            f"/api/v1/service-requests/{test_service_request.id}",
            json=update_data,
            headers=lawyer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "REJECTED"
        assert data["rejected_reason"] == "Unable to take this case due to conflict of interest."

    def test_lawyer_can_complete_request(self, test_service_request, lawyer_auth_headers):
        """Test that lawyer can mark request as completed."""
        # First accept the request
        db = TestingSessionLocal()
        request = db.query(ServiceRequest).filter(ServiceRequest.id == test_service_request.id).first()
        request.status = ServiceRequest.RequestStatus.ACCEPTED
        db.commit()
        db.close()

        update_data = {"status": "COMPLETED"}

        response = client.patch(
            f"/api/v1/service-requests/{test_service_request.id}",
            json=update_data,
            headers=lawyer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "COMPLETED"

    def test_non_lawyer_cannot_update_request(self, test_service_request, user_auth_headers):
        """Test that non-lawyer user cannot update request status."""
        update_data = {"status": "ACCEPTED"}

        response = client.patch(
            f"/api/v1/service-requests/{test_service_request.id}",
            json=update_data,
            headers=user_auth_headers
        )

        assert response.status_code == 403
        assert "only lawyers" in response.json()["detail"].lower()

    def test_lawyer_cannot_update_other_lawyer_request(self, test_service_request, test_user):
        """Test that lawyer cannot update requests not assigned to them."""
        # Create another lawyer
        db = TestingSessionLocal()
        other_lawyer_user = User(
            
            email="other_lawyer@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Other Lawyer",
            role=User.Role.LAWYER,
            is_verified=True,
            is_active=True
        )
        db.add(other_lawyer_user)
        db.commit()
        db.refresh(other_lawyer_user)

        other_lawyer = Lawyer(
            user_id=other_lawyer_user.id,
            specialization="Criminal Law",
            bio="Criminal defense",
            city="Hanoi",
            province="Hanoi",
            years_of_experience=5,
            bar_license_number="BAR789012",
            verification_status=Lawyer.VerificationStatus.APPROVED,
            is_available=True
        )
        db.add(other_lawyer)
        db.commit()
        db.close()

        # Create headers for other lawyer
        other_lawyer_token = create_access_token(data={"sub": "other_lawyer@example.com"})
        other_lawyer_headers = {"Authorization": f"Bearer {other_lawyer_token}"}

        update_data = {"status": "ACCEPTED"}

        response = client.patch(
            f"/api/v1/service-requests/{test_service_request.id}",
            json=update_data,
            headers=other_lawyer_headers
        )

        assert response.status_code == 403
        assert "assigned to you" in response.json()["detail"].lower()

    def test_accepting_request_creates_conversation(self, test_service_request, lawyer_auth_headers):
        """Test that accepting a request auto-creates a conversation."""
        update_data = {"status": "ACCEPTED"}

        with patch('app.routers.service_requests.conversation_repository.get_conversation_by_service_request_id', return_value=None):
            with patch('app.routers.service_requests.conversation_repository.create_conversation', return_value={"_id": "conv123"}) as mock_create:
                response = client.patch(
                    f"/api/v1/service-requests/{test_service_request.id}",
                    json=update_data,
                    headers=lawyer_auth_headers
                )

        assert response.status_code == 200
        # Verify conversation creation was attempted
        mock_create.assert_called_once()


class TestServiceRequestDeletion:
    """Test service request deletion by admins."""

    def test_admin_can_delete_pending_request(self, test_service_request, admin_auth_headers):
        """Test that admin can delete pending service requests."""
        response = client.delete(
            f"/api/v1/service-requests/{test_service_request.id}",
            headers=admin_auth_headers
        )

        assert response.status_code == 204

        # Verify request is deleted
        db = TestingSessionLocal()
        request = db.query(ServiceRequest).filter(ServiceRequest.id == test_service_request.id).first()
        assert request is None
        db.close()

    def test_admin_can_delete_rejected_request(self, test_service_request, admin_auth_headers):
        """Test that admin can delete rejected requests."""
        # Set request to rejected
        db = TestingSessionLocal()
        request = db.query(ServiceRequest).filter(ServiceRequest.id == test_service_request.id).first()
        request.status = ServiceRequest.RequestStatus.REJECTED
        db.commit()
        db.close()

        response = client.delete(
            f"/api/v1/service-requests/{test_service_request.id}",
            headers=admin_auth_headers
        )

        assert response.status_code == 204

    def test_admin_cannot_delete_accepted_request(self, test_service_request, admin_auth_headers):
        """Test that admin cannot delete accepted requests."""
        # Set request to accepted
        db = TestingSessionLocal()
        request = db.query(ServiceRequest).filter(ServiceRequest.id == test_service_request.id).first()
        request.status = ServiceRequest.RequestStatus.ACCEPTED
        db.commit()
        db.close()

        response = client.delete(
            f"/api/v1/service-requests/{test_service_request.id}",
            headers=admin_auth_headers
        )

        assert response.status_code == 400
        assert "cannot delete" in response.json()["detail"].lower()

    def test_non_admin_cannot_delete_request(self, test_service_request, user_auth_headers):
        """Test that non-admin users cannot delete requests."""
        response = client.delete(
            f"/api/v1/service-requests/{test_service_request.id}",
            headers=user_auth_headers
        )

        assert response.status_code == 403
        assert "only admins" in response.json()["detail"].lower()

    def test_delete_nonexistent_request_returns_404(self, admin_auth_headers):
        """Test deleting non-existent request."""
        response = client.delete("/api/v1/service-requests/99999", headers=admin_auth_headers)

        assert response.status_code == 404


# Summary comment
"""
Test Coverage Summary:
- ✅ Service Request Detail Retrieval (6 tests)
- ✅ Status Updates by Lawyers (6 tests)
- ✅ Service Request Deletion (5 tests)

Total: 17 integration tests for Service Request API
"""
