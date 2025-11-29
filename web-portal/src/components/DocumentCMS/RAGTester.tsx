import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Divider,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import { SendOutlined, AccessTime } from '@mui/icons-material';
import api from '../../services/api';

interface Source {
  _id?: string; // Backend returns _id (alias from Pydantic)
  document_id?: string; // Expected field name
  title?: string; // Backend returns title (alias from Pydantic)
  document_title?: string; // Expected field name
  chunk_id?: string;
  content?: string;
  relevance_score?: number;
}

interface RAGTesterProps {
  onSourceClick?: (chunkId: string, sources: Source[]) => void;
  onDocumentSelect?: (documentId: string) => void;
}

const RAGTester: React.FC<RAGTesterProps> = ({ onSourceClick, onDocumentSelect }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setSources([]);
    setProcessingTime(null);

    try {
      console.log('Sending RAG test query:', query.trim());
      const res = await api.post('/api/v1/admin/documents/test-query', {
        query: query.trim()
      });

      console.log('RAG test response:', res.data);
      console.log('Response text:', res.data.response);
      console.log('Sources:', res.data.sources);
      console.log('Processing time:', res.data.processing_time_ms);

      setResponse(res.data.response);
      setSources(res.data.sources || []);
      setProcessingTime(res.data.processing_time_ms);

      console.log('State updated successfully');
    } catch (err: any) {
      console.error('RAG test error:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to process query');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const handleSourceClick = (source: Source) => {
    console.log('Source clicked:', source);

    // Get document ID (try both field names)
    const docId = source._id || source.document_id;

    // If we have a document ID, fetch the full document details
    if (onDocumentSelect && docId) {
      console.log('Selecting document:', docId);
      onDocumentSelect(docId);
    }

    // If we have chunk info, highlight chunks (future feature)
    if (onSourceClick && source.chunk_id) {
      onSourceClick(source.chunk_id, sources);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      {/* Header */}
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Test Hệ Thống RAG
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Kiểm tra câu truy vấn với hệ thống RAG (trải nghiệm giống người dùng)
      </Typography>

      {/* Query Input */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Nhập câu hỏi thử nghiệm (ví dụ: Mức học phí mầm non năm 2024 là bao nhiêu?)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
          onKeyDown={handleKeyDown}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.paper',
            }
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Nhấn Ctrl+Enter để gửi
          </Typography>
          <Button
            variant="contained"
            endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendOutlined />}
            onClick={handleSubmit}
            disabled={isLoading || !query.trim()}
            size="large"
          >
            {isLoading ? 'Đang xử lý...' : 'Kiểm Tra Truy Vấn'}
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Response Area */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Đang xử lý truy vấn RAG...
            </Typography>
          </Box>
        )}

        {/* AI Response */}
        {response && !isLoading && (
          <>
            <Card sx={{ mb: 3, backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip label="Phản Hồi AI" color="primary" size="small" />
                  {processingTime !== null && processingTime !== undefined && !isNaN(processingTime) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                      <AccessTime sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {processingTime.toFixed(2)} ms
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.7,
                    color: 'text.primary'
                  }}
                >
                  {String(response || '')}
                </Typography>
              </CardContent>
            </Card>

            {/* Sources */}
            {Array.isArray(sources) && sources.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Tài Liệu Nguồn ({sources.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Danh sách các tài liệu được sử dụng để tạo phản hồi
                </Typography>

                {sources.map((source, index) => {
                  if (!source) return null;
                  return (
                  <Paper
                    key={index}
                    sx={{
                      p: 2,
                      mb: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover',
                        transform: 'translateY(-2px)',
                        boxShadow: 2
                      }
                    }}
                    onClick={() => handleSourceClick(source)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                        {source.title || source.document_title || 'Tài liệu không có tiêu đề'}
                      </Typography>
                      {source.relevance_score !== undefined && source.relevance_score !== null && (
                        <Chip
                          label={`Điểm: ${source.relevance_score.toFixed(2)}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    {source.chunk_id && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        ID Đoạn: {source.chunk_id.substring(0, 16)}...
                      </Typography>
                    )}

                    {source.content && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {source.content}
                      </Typography>
                    )}
                  </Paper>
                );
                })}
              </Box>
            )}

            {sources.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Không có tài liệu nguồn nào được trả về cho truy vấn này.
              </Alert>
            )}
          </>
        )}

        {/* Empty State */}
        {!response && !isLoading && !error && (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <Typography variant="h6" gutterBottom>
              Chưa có kết quả kiểm tra
            </Typography>
            <Typography variant="body2">
              Nhập câu hỏi ở trên và nhấn "Kiểm Tra Truy Vấn" để bắt đầu
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default RAGTester;
