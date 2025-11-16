import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Grid,
  Paper,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  LogoutOutlined,
  PersonOutline,
  SearchOutlined,
  UploadFileOutlined,
  DeleteOutlined,
  CheckCircleOutline,
  ErrorOutline,
  HourglassEmpty,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DocumentUploadPanel from '../components/DocumentCMS/DocumentUploadPanel';
import DocumentList from '../components/DocumentCMS/DocumentList';
import DocumentDetails from '../components/DocumentCMS/DocumentDetails';

export interface DocumentListItem {
  _id: string;
  title: string;
  document_number?: string;
  category?: string;
  status: string;
  indexing_status: {
    mongodb: string;
    qdrant: string;
    bm25: string;
    last_indexed_at?: string;
  };
  chunk_count: number;
  upload_date: string;
  uploaded_by: number;
}

export interface DocumentDetail extends DocumentListItem {
  document_type?: string;
  issuer?: string;
  signatory?: string;
  gazette_number?: string;
  issue_date?: string;
  effective_date?: string;
  publish_date?: string;
  full_text?: string;
  html_content?: string;
  ascii_diagram?: string;
  related_documents?: Array<{
    doc_id: string;
    title: string;
    issue_date?: string;
    status?: string;
  }>;
  usage_analytics?: {
    query_count: number;
    query_count_this_week: number;
    avg_relevance_score?: number;
    times_retrieved: number;
    chunks_used: number;
    last_accessed_at?: string;
  };
  file_metadata?: {
    original_folder: string;
    uploaded_by: number;
    uploaded_at: string;
    processing_time_seconds?: number;
    diagram_generation_time_seconds?: number;
  };
}

const AdminDocumentCMS: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dynamic filter options
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchDocuments();
  }, [page, categoryFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/api/v1/documents/filters/options');
      const { categories, statuses } = response.data;
      setCategoryOptions(categories || []);
      setStatusOptions(statuses || []);
    } catch (err: any) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: any = {
        page,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      };

      if (searchQuery) params.search = searchQuery;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/api/v1/admin/documents', { params });

      setDocuments(response.data.documents);
      setTotalPages(response.data.pagination.pages);
      setTotalCount(response.data.pagination.total);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocumentDetails = async (documentId: string) => {
    try {
      const response = await api.get(`/api/v1/admin/documents/${documentId}`);
      console.log('Document details response:', response.data);
      setSelectedDocument(response.data);
    } catch (err: any) {
      console.error('Failed to fetch document details:', err);
      setError('Failed to load document details.');
    }
  };

  const handleDocumentSelect = (doc: DocumentListItem) => {
    fetchDocumentDetails(doc._id);
  };

  const handleDocumentUploaded = () => {
    // Refresh document list after upload
    fetchDocuments();
  };

  const handleDocumentDeleted = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/v1/admin/documents/${documentId}`);

      // Refresh list and clear selection
      fetchDocuments();
      if (selectedDocument?._id === documentId) {
        setSelectedDocument(null);
      }

      alert('Document deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackToDashboard = () => {
    navigate('/admin/dashboard');
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VietJusticIA - Quản Lý Văn Bản
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button color="inherit" onClick={handleBackToDashboard}>
              Về Trang Chủ
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonOutline />
              <Typography>{user?.full_name}</Typography>
            </Box>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutOutlined />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Content - 3 Column Layout */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
        {/* Left Column: Upload + Document List */}
        <Box sx={{ width: '33.33%', height: '100%', overflow: 'auto', borderRight: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box sx={{ p: 2 }}>
              {/* Upload Panel */}
              <DocumentUploadPanel onUploadSuccess={handleDocumentUploaded} />

              {/* Filters */}
              <Box sx={{ mt: 3, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Tìm kiếm văn bản..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlined />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Lĩnh vực</InputLabel>
                  <Select
                    value={categoryFilter}
                    label="Lĩnh vực"
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="">Tất cả lĩnh vực</MenuItem>
                    {categoryOptions.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Tình trạng</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Tình trạng"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">Tất cả tình trạng</MenuItem>
                    {statusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Document List */}
              {isLoading && <CircularProgress />}

              <DocumentList
                documents={documents}
                selectedDocument={selectedDocument}
                totalCount={totalCount}
                onDocumentSelect={handleDocumentSelect}
                onDocumentDelete={handleDocumentDeleted}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                  <Button
                    size="small"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Trước
                  </Button>
                  <Typography sx={{ alignSelf: 'center' }}>
                    Trang {page} / {totalPages}
                  </Typography>
                  <Button
                    size="small"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Sau
                  </Button>
                </Box>
              )}
            </Box>
        </Box>

        {/* Middle Column: RAG Testing Interface (Placeholder for Phase 3) */}
        <Box sx={{ width: '33.33%', height: '100%', overflow: 'auto', borderRight: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Giao Diện Kiểm Tra RAG
              </Typography>
              <Alert severity="info">
                Giao diện kiểm tra RAG sẽ được triển khai trong Giai đoạn 3.
              </Alert>
          </Box>
        </Box>

        {/* Right Column: Document Details */}
        <Box sx={{ width: '33.33%', height: '100%', overflow: 'auto', flexShrink: 0 }}>
          <Box sx={{ p: 2 }}>
              {selectedDocument ? (
                <DocumentDetails document={selectedDocument} />
              ) : (
                <Box sx={{ textAlign: 'center', mt: 8 }}>
                  <Typography variant="h6" color="textSecondary">
                    Chọn văn bản để xem chi tiết
                  </Typography>
                </Box>
              )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDocumentCMS;
