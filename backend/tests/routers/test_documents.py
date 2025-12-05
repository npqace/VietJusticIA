import pytest
from fastapi import status as http_status
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock

# Mock MongoClient before importing anything that uses it
with patch("pymongo.MongoClient"):
    # Mock rag_service before importing app
    with patch("app.services.ai_service.rag_service") as mock_rag:
        mock_rag.initialize_service = Mock()
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

@patch("app.routers.documents.document_repository")
def test_get_documents_no_filters(mock_repo):
    """Test GET /documents with no filters returns paginated results."""
    # Mock repository response: (documents_list, total_docs, total_pages)
    mock_repo.find_documents.return_value = (MOCK_DOCUMENTS_LIST, 2, 1)
    
    response = client.get("/api/v1/documents")
    
    assert response.status_code == http_status.HTTP_200_OK
    data = response.json()
    assert data["total_docs"] == 2
    assert data["current_page"] == 1
    assert data["page_size"] == 20
    assert len(data["documents"]) == 2
    
    # Verify repository was called correctly
    mock_repo.find_documents.assert_called_once()


@patch("app.routers.documents.document_repository")
def test_get_documents_with_search(mock_repo):
    """Test GET /documents with search term."""
    mock_repo.find_documents.return_value = ([MOCK_DOCUMENT], 1, 1)
    
    response = client.get("/api/v1/documents?search=thực phẩm")
    
    assert response.status_code == http_status.HTTP_200_OK
    data = response.json()
    assert data["total_docs"] == 1
    
    # Verify search arg was passed
    args = mock_repo.find_documents.call_args[1]
    assert args["search"] == "thực phẩm"


@patch("app.routers.documents.document_repository")
def test_get_documents_with_status_filter(mock_repo):
    """Test GET /documents with status filter."""
    mock_repo.find_documents.return_value = ([MOCK_DOCUMENT], 1, 1)
    
    response = client.get("/api/v1/documents?status=Còn hiệu lực")
    
    assert response.status_code == http_status.HTTP_200_OK
    
    # Verify status filter was passed
    args = mock_repo.find_documents.call_args[1]
    assert args["status"] == "Còn hiệu lực"


@patch("app.routers.documents.document_repository")
def test_get_documents_with_all_filter_bypass(mock_repo):
    """Test GET /documents with 'Tất cả' bypasses filter."""
    mock_repo.find_documents.return_value = (MOCK_DOCUMENTS_LIST, 2, 1)
    
    response = client.get("/api/v1/documents?status=Tất cả")
    
    assert response.status_code == http_status.HTTP_200_OK
    
    # Verify status passed as "Tất cả" (repository handles the logic)
    args = mock_repo.find_documents.call_args[1]
    assert args["status"] == "Tất cả"


@patch("app.routers.documents.document_repository")
def test_get_documents_with_date_range(mock_repo):
    """Test GET /documents with valid date range."""
    mock_repo.find_documents.return_value = ([MOCK_DOCUMENT], 1, 1)
    
    response = client.get("/api/v1/documents?start_date=01/01/2010&end_date=31/12/2020")
    
    assert response.status_code == http_status.HTTP_200_OK
    
    # Verify date args passed
    args = mock_repo.find_documents.call_args[1]
    assert args["start_date"] == "01/01/2010"
    assert args["end_date"] == "31/12/2020"


@patch("app.routers.documents.document_repository")
def test_get_documents_pagination(mock_repo):
    """Test GET /documents pagination."""
    mock_repo.find_documents.return_value = (MOCK_DOCUMENTS_LIST, 100, 10)
    
    response = client.get("/api/v1/documents?page=2&page_size=10")
    
    assert response.status_code == http_status.HTTP_200_OK
    data = response.json()
    assert data["current_page"] == 2
    assert data["page_size"] == 10
    assert data["total_pages"] == 10
    
    # Verify pagination args
    args = mock_repo.find_documents.call_args[1]
    assert args["page"] == 2
    assert args["page_size"] == 10


@patch("app.routers.documents.document_repository")
def test_get_documents_database_error(mock_repo):
    """Test GET /documents handles database errors."""
    from pymongo.errors import PyMongoError
    mock_repo.find_documents.side_effect = PyMongoError("Database connection failed")
    
    response = client.get("/api/v1/documents")
    
    print(f"DEBUG: http_status type: {type(http_status)}")
    print(f"DEBUG: http_status: {http_status}")
    assert response.status_code == http_status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "Failed to retrieve documents" in response.json()["detail"]


# --- GET /documents/filters/options Tests ---

@patch("app.routers.documents.document_repository")
def test_get_filter_options_success(mock_repo):
    """Test GET /documents/filters/options returns data."""
    mock_options = {
        "statuses": ["Còn hiệu lực", "Hết hiệu lực"],
        "document_types": ["Luật", "Nghị định"],
        "categories": ["Y tế", "An toàn thực phẩm"],
        "issuers": ["Quốc hội", "Chính phủ"]
    }
    mock_repo.get_filter_options.return_value = mock_options
    
    response = client.get("/api/v1/documents/filters/options")
    
    assert response.status_code == http_status.HTTP_200_OK
    data = response.json()
    assert data == mock_options


@patch("app.routers.documents.document_repository")
def test_get_filter_options_database_error(mock_repo):
    """Test GET /documents/filters/options handles database errors."""
    from pymongo.errors import PyMongoError
    mock_repo.get_filter_options.side_effect = PyMongoError("Database error")
    
    response = client.get("/api/v1/documents/filters/options")
    
    assert response.status_code == http_status.HTTP_500_INTERNAL_SERVER_ERROR


# --- GET /documents/{document_id} Tests ---

@patch("app.routers.documents.document_repository")
def test_get_document_by_id_success(mock_repo):
    """Test GET /documents/{id} returns document."""
    mock_repo.get_document_by_id.return_value = MOCK_DOCUMENT
    
    response = client.get("/api/v1/documents/doc123")
    
    assert response.status_code == http_status.HTTP_200_OK
    data = response.json()
    assert data["id"] == "doc123"
    assert data["title"] == "Luật An toàn thực phẩm"
    
    mock_repo.get_document_by_id.assert_called_once()
    args = mock_repo.get_document_by_id.call_args
    assert args[0][1] == "doc123"  # 2nd arg is document_id


@patch("app.routers.documents.document_repository")
def test_get_document_by_id_not_found(mock_repo):
    """Test GET /documents/{id} returns 404 for non-existent document."""
    mock_repo.get_document_by_id.return_value = None
    
    response = client.get("/api/v1/documents/nonexistent")
    
    assert response.status_code == http_status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()


@patch("app.routers.documents.document_repository")
def test_get_document_by_id_database_error(mock_repo):
    """Test GET /documents/{id} handles database errors."""
    from pymongo.errors import PyMongoError
    mock_repo.get_document_by_id.side_effect = PyMongoError("Database error")
    
    response = client.get("/api/v1/documents/doc123")
    
    assert response.status_code == http_status.HTTP_500_INTERNAL_SERVER_ERROR
