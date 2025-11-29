"""
Integration tests for Lawyer API (backend/app/routers/lawyers.py)

Tests cover:
- Lawyer listing with filters
- Lawyer detail retrieval
- Service request creation and management
- Admin lawyer approval/rejection
- Authorization and access control
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.models import Base, User, Lawyer, ServiceRequest
from app.database.database import get_db
from app.core.security import get_password_hash, create_access_token

# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_lawyer.db"
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
def approved_lawyer(test_lawyer_user):
    """Create an approved lawyer profile."""
    db = TestingSessionLocal()
    lawyer = Lawyer(
        user_id=test_lawyer_user.id,
        specialization="Family Law",
        bio="Experienced family law attorney",
        city="Ho Chi Minh City",
        province="Ho Chi Minh",
        years_of_experience=10,
        bar_license_number="BAR123456",
        consultation_fee=500000,
        is_available=True,
        verification_status=Lawyer.VerificationStatus.APPROVED,
        rating=4.5,
        total_reviews=20,
        languages="Vietnamese, English"
    )
    db.add(lawyer)
    db.commit()
    db.refresh(lawyer)
    db.close()
    return lawyer


@pytest.fixture
def pending_lawyer(test_lawyer_user):
    """Create a pending lawyer profile."""
    db = TestingSessionLocal()

    # Create a different user for pending lawyer
    pending_user = User(
        
        email="pending@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Pending Lawyer",
        phone="0999999999",
        role=User.Role.LAWYER,
        is_verified=True,
        is_active=True
    )
    db.add(pending_user)
    db.commit()
    db.refresh(pending_user)

    lawyer = Lawyer(
        user_id=pending_user.id,
        specialization="Criminal Law",
        bio="Criminal defense attorney",
        city="Hanoi",
        province="Hanoi",
        years_of_experience=5,
        bar_license_number="BAR789012",
        consultation_fee=400000,
        is_available=True,
        verification_status=Lawyer.VerificationStatus.PENDING
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
def lawyer_auth_headers(test_lawyer_user):
    """Create authentication headers for lawyer."""
    access_token = create_access_token(data={"sub": test_lawyer_user.email})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def admin_auth_headers(admin_user):
    """Create authentication headers for admin."""
    access_token = create_access_token(data={"sub": admin_user.email})
    return {"Authorization": f"Bearer {access_token}"}


class TestLawyerListing:
    """Test lawyer listing and filtering."""

    def test_get_lawyers_returns_approved_lawyers_only(self, approved_lawyer, pending_lawyer):
        """Test that public endpoint only returns approved lawyers."""
        response = client.get("/api/v1/lawyers")

        assert response.status_code == 200
        lawyers = response.json()
        assert isinstance(lawyers, list)
        assert len(lawyers) == 1  # Only approved lawyer
        assert lawyers[0]["specialization"] == "Family Law"

    def test_get_lawyers_with_specialization_filter(self, approved_lawyer):
        """Test filtering lawyers by specialization."""
        response = client.get("/api/v1/lawyers?specialization=Family Law")

        assert response.status_code == 200
        lawyers = response.json()
        assert len(lawyers) >= 1
        assert all(lawyer["specialization"] == "Family Law" for lawyer in lawyers)

    def test_get_lawyers_with_city_filter(self, approved_lawyer):
        """Test filtering lawyers by city."""
        response = client.get("/api/v1/lawyers?city=Ho Chi Minh City")

        assert response.status_code == 200
        lawyers = response.json()
        assert len(lawyers) >= 1
        assert all(lawyer["city"] == "Ho Chi Minh City" for lawyer in lawyers)

    def test_get_lawyers_with_min_rating_filter(self, approved_lawyer):
        """Test filtering lawyers by minimum rating."""
        response = client.get("/api/v1/lawyers?min_rating=4.0")

        assert response.status_code == 200
        lawyers = response.json()
        assert all(lawyer["rating"] >= 4.0 for lawyer in lawyers)

    def test_get_lawyers_with_pagination(self, approved_lawyer):
        """Test lawyer listing pagination."""
        response = client.get("/api/v1/lawyers?skip=0&limit=10")

        assert response.status_code == 200
        lawyers = response.json()
        assert len(lawyers) <= 10

    def test_admin_can_see_all_lawyers(self, approved_lawyer, pending_lawyer, admin_auth_headers):
        """Test that admin can see all lawyers including pending."""
        response = client.get("/api/v1/lawyers", headers=admin_auth_headers)

        assert response.status_code == 200
        lawyers = response.json()
        assert len(lawyers) >= 2  # Both approved and pending

    def test_get_filter_options_returns_available_filters(self, approved_lawyer):
        """Test getting available filter options."""
        response = client.get("/api/v1/lawyers/filters/options")

        assert response.status_code == 200
        options = response.json()
        assert "specializations" in options
        assert "cities" in options
        assert isinstance(options["specializations"], list)


class TestLawyerDetail:
    """Test lawyer detail retrieval."""

    def test_get_lawyer_detail_succeeds(self, approved_lawyer):
        """Test getting detailed lawyer information."""
        response = client.get(f"/api/v1/lawyers/{approved_lawyer.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == approved_lawyer.id
        assert data["specialization"] == "Family Law"
        assert "full_name" in data
        assert "bio" in data

    def test_get_pending_lawyer_detail_returns_404(self, pending_lawyer):
        """Test that pending lawyer details are not accessible."""
        response = client.get(f"/api/v1/lawyers/{pending_lawyer.id}")

        assert response.status_code == 404
        assert "not available" in response.json()["detail"].lower()

    def test_get_nonexistent_lawyer_returns_404(self):
        """Test that nonexistent lawyer returns 404."""
        response = client.get("/api/v1/lawyers/99999")

        assert response.status_code == 404


class TestServiceRequestCreation:
    """Test service request creation."""

    def test_create_service_request_succeeds(self, approved_lawyer, user_auth_headers):
        """Test creating a service request to a lawyer."""
        request_data = {
            "lawyer_id": approved_lawyer.id,
            "title": "Need legal consultation",
            "description": "I need help with a family law matter"
        }

        response = client.post("/api/v1/lawyers/requests", json=request_data, headers=user_auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["lawyer_id"] == approved_lawyer.id
        assert data["title"] == "Need legal consultation"
        assert data["status"] == "PENDING"

    def test_create_request_to_nonexistent_lawyer_returns_404(self, user_auth_headers):
        """Test creating request to non-existent lawyer."""
        request_data = {
            "lawyer_id": 99999,
            "title": "Test request",
            "description": "Test description"
        }

        response = client.post("/api/v1/lawyers/requests", json=request_data, headers=user_auth_headers)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_create_request_to_unavailable_lawyer_returns_400(self, approved_lawyer, user_auth_headers):
        """Test creating request to unavailable lawyer."""
        # Make lawyer unavailable
        db = TestingSessionLocal()
        lawyer = db.query(Lawyer).filter(Lawyer.id == approved_lawyer.id).first()
        lawyer.is_available = False
        db.commit()
        db.close()

        request_data = {
            "lawyer_id": approved_lawyer.id,
            "title": "Test request",
            "description": "Test description"
        }

        response = client.post("/api/v1/lawyers/requests", json=request_data, headers=user_auth_headers)

        assert response.status_code == 400
        assert "not currently accepting" in response.json()["detail"].lower()

    def test_create_request_without_auth_returns_401(self, approved_lawyer):
        """Test that unauthenticated request creation is rejected."""
        request_data = {
            "lawyer_id": approved_lawyer.id,
            "title": "Test request",
            "description": "Test description"
        }

        response = client.post("/api/v1/lawyers/requests", json=request_data)

        assert response.status_code == 401


class TestServiceRequestManagement:
    """Test service request management."""

    def test_get_my_service_requests_as_user(self, approved_lawyer, user_auth_headers, test_user):
        """Test getting service requests as a user."""
        # Create a service request first
        db = TestingSessionLocal()
        request = ServiceRequest(
            user_id=test_user.id,
            lawyer_id=approved_lawyer.id,
            title="Test Request",
            description="Test Description",
            status=ServiceRequest.RequestStatus.PENDING
        )
        db.add(request)
        db.commit()
        db.close()

        response = client.get("/api/v1/lawyers/requests/my-requests", headers=user_auth_headers)

        assert response.status_code == 200
        requests = response.json()
        assert isinstance(requests, list)
        assert len(requests) >= 1
        assert requests[0]["title"] == "Test Request"

    def test_get_my_service_requests_as_lawyer(self, approved_lawyer, lawyer_auth_headers, test_user):
        """Test getting service requests as a lawyer."""
        # Create a service request to this lawyer
        db = TestingSessionLocal()
        request = ServiceRequest(
            user_id=test_user.id,
            lawyer_id=approved_lawyer.id,
            title="Request for Lawyer",
            description="Test Description",
            status=ServiceRequest.RequestStatus.PENDING
        )
        db.add(request)
        db.commit()
        db.close()

        response = client.get("/api/v1/lawyers/requests/my-requests", headers=lawyer_auth_headers)

        assert response.status_code == 200
        requests = response.json()
        assert isinstance(requests, list)
        # Should see requests assigned to this lawyer

    def test_get_service_request_detail_succeeds(self, approved_lawyer, user_auth_headers, test_user):
        """Test getting service request details."""
        # Create a service request
        db = TestingSessionLocal()
        request = ServiceRequest(
            user_id=test_user.id,
            lawyer_id=approved_lawyer.id,
            title="Detail Test",
            description="Test Description",
            status=ServiceRequest.RequestStatus.PENDING
        )
        db.add(request)
        db.commit()
        db.refresh(request)
        request_id = request.id
        db.close()

        response = client.get(f"/api/v1/lawyers/requests/{request_id}", headers=user_auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == request_id
        assert data["title"] == "Detail Test"

    def test_cancel_service_request_succeeds(self, approved_lawyer, user_auth_headers, test_user):
        """Test canceling a pending service request."""
        # Create a pending request
        db = TestingSessionLocal()
        request = ServiceRequest(
            user_id=test_user.id,
            lawyer_id=approved_lawyer.id,
            title="Cancel Test",
            description="Test Description",
            status=ServiceRequest.RequestStatus.PENDING
        )
        db.add(request)
        db.commit()
        db.refresh(request)
        request_id = request.id
        db.close()

        response = client.delete(f"/api/v1/lawyers/requests/{request_id}", headers=user_auth_headers)

        assert response.status_code == 204


class TestAdminLawyerManagement:
    """Test admin lawyer approval/rejection."""

    def test_admin_approve_lawyer_succeeds(self, pending_lawyer, admin_auth_headers):
        """Test admin approving a pending lawyer."""
        response = client.patch(f"/api/v1/lawyers/{pending_lawyer.id}/approve", headers=admin_auth_headers)

        assert response.status_code == 200
        assert "approved" in response.json()["message"].lower()

        # Verify lawyer is approved
        db = TestingSessionLocal()
        lawyer = db.query(Lawyer).filter(Lawyer.id == pending_lawyer.id).first()
        assert lawyer.verification_status == Lawyer.VerificationStatus.APPROVED
        db.close()

    def test_admin_reject_lawyer_succeeds(self, pending_lawyer, admin_auth_headers):
        """Test admin rejecting a pending lawyer."""
        response = client.patch(f"/api/v1/lawyers/{pending_lawyer.id}/reject", headers=admin_auth_headers)

        assert response.status_code == 200
        assert "rejected" in response.json()["message"].lower()

        # Verify lawyer is rejected
        db = TestingSessionLocal()
        lawyer = db.query(Lawyer).filter(Lawyer.id == pending_lawyer.id).first()
        assert lawyer.verification_status == Lawyer.VerificationStatus.REJECTED
        db.close()

    def test_non_admin_cannot_approve_lawyer(self, pending_lawyer, user_auth_headers):
        """Test that non-admin cannot approve lawyers."""
        response = client.patch(f"/api/v1/lawyers/{pending_lawyer.id}/approve", headers=user_auth_headers)

        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()

    def test_approve_nonexistent_lawyer_returns_404(self, admin_auth_headers):
        """Test approving non-existent lawyer."""
        response = client.patch("/api/v1/lawyers/99999/approve", headers=admin_auth_headers)

        assert response.status_code == 404


# Summary comment
"""
Test Coverage Summary:
- ✅ Lawyer Listing (7 tests)
- ✅ Lawyer Detail (3 tests)
- ✅ Service Request Creation (4 tests)
- ✅ Service Request Management (4 tests)
- ✅ Admin Lawyer Management (4 tests)

Total: 22 integration tests for Lawyer API
"""
