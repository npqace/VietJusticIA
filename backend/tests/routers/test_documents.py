import pytest
from fastapi import status
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from app.main import app

client = TestClient(app)

# Test data
MOCK_DOCUMENT = {
    "_id": "doc123",
    "title": "Luật An toàn thực phẩm",
    "document_number": "55/2010/QH12",
    "document_type": "Luật",
    "category": "Y tế, An toàn thực phẩm",
    "issuer": "Quốc hội",
    "issue_date": "2010-06-17",
    "status": "Còn hiệu lực",
    "full_text": "Full text content here",
}

MOCK_DOCUMENTS_LIST = [
    MOCK_DOCUMENT,
    {
        "_id": "doc456",
        "title": "Nghị định về an toàn giao thông",
        "document_type": "Nghị định",
        "status": "Hết hiệu lực",
    }
]


# --- GET /documents Tests ---

@patch("app.routers.documents.collection")
def test_get_documents_no_filters(mock_collection):
    """Test GET /documents with no filters returns paginated results."""
    # Mock MongoDB responses
    mock_collection.count_documents.return_value = 2
    mock_collection.find.return_value.skip.return_value.limit.return_value = iter(MOCK_DOCUMENTS_LIST)
    
    response = client.get("/api/v1/documents")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total_docs"] == 2
    assert data["current_page"] == 1
    assert data["page_size"] == 20
    assert len(data["documents"]) == 2
    
    # Verify MongoDB was called correctly
    mock_collection.count_documents.assert_called_once()
    mock_collection.find.assert_called_once()


@patch("app.routers.documents.collection")
def test_get_documents_with_search(mock_collection):
    """Test GET /documents with search term."""
    mock_collection.count_documents.return_value = 1
    mock_collection.find.return_value.skip.return_value.limit.return_value = iter([MOCK_DOCUMENT])
    
    response = client.get("/api/v1/documents?search=thực phẩm")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total_docs"] == 1
    
    # Verify search query was built correctly
    query_arg = mock_collection.find.call_args[0][0]
    assert "title" in query_arg
    assert "$regex" in query_arg["title"]


@patch("app.routers.documents.collection")
def test_get_documents_with_status_filter(mock_collection):
    """Test GET /documents with status filter."""
    mock_collection.count_documents.return_value = 1
    mock_collection.find.return_value.skip.return_value.limit.return_value = iter([MOCK_DOCUMENT])
    
    response = client.get("/api/v1/documents?status=Còn hiệu lực")
    
    assert response.status_code == status.HTTP_200_OK
    
    # Verify status filter was applied (not "Tất cả")
    query_arg = mock_collection.find.call_args[0][0]
    assert "status" in query_arg


@patch("app.routers.documents.collection")
def test_get_documents_with_all_filter_bypass(mock_collection):
    """Test GET /documents with 'Tất cả' bypasses filter."""
    mock_collection.count_documents.return_value = 2
    mock_collection.find.return_value.skip.return_value.limit.return_value = iter(MOCK_DOCUMENTS_LIST)
    
    response = client.get("/api/v1/documents?status=Tất cả")
    
    assert response.status_code == status.HTTP_200_OK
    
    # Verify "Tất cả" filter was NOT applied
    query_arg = mock_collection.find.call_args[0][0]
    assert "status" not in query_arg


@patch("app.routers.documents.collection")
def test_get_documents_with_date_range(mock_collection):
    """Test GET /documents with valid date range."""
    mock_collection.count_documents.return_value = 1
    mock_collection.find.return_value.skip.return_value.limit.return_value = iter([MOCK_DOCUMENT])
    
    response = client.get("/api/v1/documents?start_date=01/01/2010&end_date=31/12/2020")
    
    assert response.status_code == status.HTTP_200_OK
    
    # Verify date range query was built correctly
    query_arg = mock_collection.find.call_args[0][0]
    assert "issue_date" in query_arg
    assert "$gte" in query_arg["issue_date"]
    assert "$lte" in query_arg["issue_date"]


@patch("app.routers.documents.collection")
def test_get_documents_with_invalid_date_format(mock_collection):
    """Test GET /documents with invalid date format (currently silently ignored)."""
    mock_collection.count_documents.return_value = 1
    mock_collection.find.return_value.skip.return_value.limit.return_value = iter([MOCK_DOCUMENT])
    
    # Invalid date format should be silently ignored (current behavior)
    response = client.get("/api/v1/documents?start_date=2010-01-01")  # Wrong format
    
    assert response.status_code == status.HTTP_200_OK
    
    # Verify date filter was NOT applied (invalid format ignored)
    query_arg = mock_collection.find.call_args[0][0]
    assert "issue_date" not in query_arg


@patch("app.routers.documents.collection")
def test_get_documents_pagination(mock_collection):
    """Test GET /documents pagination."""
    mock_collection.count_documents.return_value = 100
    mock_collection.find.return_value.skip.return_value.limit.return_value = iter(MOCK_DOCUMENTS_LIST)
    
    response = client.get("/api/v1/documents?page=2&page_size=10")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["current_page"] == 2
    assert data["page_size"] == 10
    assert data["total_pages"] == 10  # 100 docs / 10 per page
    
    # Verify skip calculation is correct: (page - 1) * page_size = (2 - 1) * 10 = 10
    mock_collection.find.return_value.skip.assert_called_with(10)


@patch("app.routers.documents.collection")
def test_get_documents_empty_results(mock_collection):
    """Test GET /documents with no results."""
    mock_collection.count_documents.return_value = 0
    
    response = client.get("/api/v1/documents?search=nonexistent")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total_docs"] == 0
    assert data["total_pages"] == 0
    assert len(data["documents"]) == 0


@patch("app.routers.documents.collection")
def test_get_documents_database_error(mock_collection):
    """Test GET /documents handles database errors."""
    mock_collection.count_documents.side_effect = Exception("Database connection failed")
    
    response = client.get("/api/v1/documents")
    
    # Current implementation returns 500 with str(e) - testing current behavior
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    # Note: After refactoring, this should return generic message


# --- GET /documents/filters/options Tests ---

@patch("app.routers.documents.collection")
def test_get_filter_options_success(mock_collection):
    """Test GET /documents/filters/options returns normalized data."""
    mock_collection.distinct.side_effect = [
        ["Còn hiệu lực đến: 01/01/2025", "Hết hiệu lực"],  # statuses
        ["Luật", "Nghị định", "Thông tư"],  # document_types
        ["Y tế, An toàn thực phẩm", "Giao thông"],  # categories (comma-separated)
        ["Quốc hội, Chính phủ", "Bộ Y tế"],  # issuers (comma-separated)
    ]
    
    response = client.get("/api/v1/documents/filters/options")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Verify statuses are normalized (extracted "Còn hiệu lực" / "Hết hiệu lực")
    assert "statuses" in data
    assert "Còn hiệu lực" in data["statuses"]
    assert "Hết hiệu lực" in data["statuses"]
    
    # Verify comma-separated categories are split
    assert "categories" in data
    assert "Y tế" in data["categories"]
    assert "An toàn thực phẩm" in data["categories"]
    
    # Verify comma-separated issuers are split
    assert "issuers" in data
    assert "Quốc hội" in data["issuers"]
    assert "Chính phủ" in data["issuers"]


@patch("app.routers.documents.collection")
def test_get_filter_options_database_error(mock_collection):
    """Test GET /documents/filters/options handles database errors."""
    mock_collection.distinct.side_effect = Exception("Database error")
    
    response = client.get("/api/v1/documents/filters/options")
    
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


# --- GET /documents/{document_id} Tests ---

@patch("app.routers.documents.collection")
def test_get_document_by_id_success(mock_collection):
    """Test GET /documents/{id} returns document."""
    mock_collection.find_one.return_value = MOCK_DOCUMENT
    
    response = client.get("/api/v1/documents/doc123")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == "doc123"
    assert data["title"] == "Luật An toàn thực phẩm"
    
    # Verify find_one was called with correct ID
    mock_collection.find_one.assert_called_once_with({"_id": "doc123"})


@patch("app.routers.documents.collection")
def test_get_document_by_id_not_found(mock_collection):
    """Test GET /documents/{id} returns 404 for non-existent document."""
    mock_collection.find_one.return_value = None
    
    response = client.get("/api/v1/documents/nonexistent")
    
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()


@patch("app.routers.documents.collection")
def test_get_document_by_id_database_error(mock_collection):
    """Test GET /documents/{id} handles database errors."""
    mock_collection.find_one.side_effect = Exception("Database error")
    
    response = client.get("/api/v1/documents/doc123")
    
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
