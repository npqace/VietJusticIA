import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  DescriptionOutlined,
  ViewModuleOutlined,
  BarChartOutlined,
  CheckCircleOutline,
  ErrorOutline,
  HourglassEmpty,
  ExpandMore,
} from '@mui/icons-material';
import type { DocumentDetail } from '../../pages/AdminDocumentCMS';
import api from '../../services/api';

interface DocumentDetailsProps {
  document: DocumentDetail;
  sourceChunkIds?: string[]; // Chunk IDs to highlight from RAG testing
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface ChunkInfo {
  chunk_id: string;
  vector_id: string;
  content: string;
  character_count: number;
  indexed_in_qdrant: boolean;
  indexed_in_bm25: boolean;
  parent_document_id: string;
  metadata: {
    title: string;
    document_number: string;
    category: string;
  };
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleOutline fontSize="small" sx={{ color: 'success.main', mr: 0.5 }} />;
    case 'processing':
      return <HourglassEmpty fontSize="small" sx={{ color: 'warning.main', mr: 0.5 }} />;
    case 'failed':
      return <ErrorOutline fontSize="small" sx={{ color: 'error.main', mr: 0.5 }} />;
    default:
      return null;
  }
};

const DocumentDetails: React.FC<DocumentDetailsProps> = ({ document, sourceChunkIds = [] }) => {
  const [tabValue, setTabValue] = useState(0);
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunksError, setChunksError] = useState<string | null>(null);
  const [displayedChunksCount, setDisplayedChunksCount] = useState(5);

  // Reset chunks when document changes
  useEffect(() => {
    setChunks([]);
    setChunksError(null);
    setDisplayedChunksCount(5);

    // If user is on Chunks tab (index 1), auto-fetch chunks for new document
    if (tabValue === 1) {
      fetchChunks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document._id]); // Trigger when document ID changes

  // Scroll to first highlighted chunk when source chunks change
  useEffect(() => {
    if (sourceChunkIds.length > 0 && tabValue === 1 && chunks.length > 0) {
      // Find the first source chunk ID
      const firstSourceId = sourceChunkIds[0];

      // Wait a bit for DOM to render
      setTimeout(() => {
        const element = window.document.getElementById(`chunk-${firstSourceId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          console.log('Scrolled to highlighted chunk:', firstSourceId);
        } else {
          console.log('Chunk element not found for ID:', firstSourceId);
        }
      }, 300);
    }
  }, [sourceChunkIds, tabValue, chunks]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // Fetch chunks when Chunks tab is selected (index 1)
    if (newValue === 1 && chunks.length === 0 && !isLoadingChunks) {
      fetchChunks();
    }
  };

  const fetchChunks = async () => {
    setIsLoadingChunks(true);
    setChunksError(null);

    try {
      const response = await api.get(`/api/v1/admin/documents/${document._id}/chunks`);
      setChunks(response.data.chunks);
    } catch (err: any) {
      console.error('Failed to fetch chunks:', err);
      setChunksError('Không thể tải danh sách đoạn văn. Vui lòng thử lại.');
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const handleLoadMore = () => {
    setDisplayedChunksCount(prev => Math.min(prev + 5, chunks.length));
  };

  // Add error boundary check
  if (!document) {
    return (
      <Box>
        <Alert severity="error">Không có dữ liệu văn bản</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Chi Tiết Văn Bản
      </Typography>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab icon={<DescriptionOutlined />} label="Thông tin" />
        <Tab icon={<ViewModuleOutlined />} label="Đoạn văn" />
        <Tab icon={<BarChartOutlined />} label="Thống kê" />
      </Tabs>

      <Divider sx={{ mb: 2 }} />

      {/* Tab 1: Metadata */}
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            Thông Tin Văn Bản
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Tiêu đề:
            </Typography>
            <Typography variant="body1" gutterBottom>
              {document.title}
            </Typography>

            {document.document_number && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Số hiệu:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.document_number}
                </Typography>
              </>
            )}

            {document.document_type && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Loại văn bản:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.document_type}
                </Typography>
              </>
            )}

            {document.category && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Lĩnh vực:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                  {document.category.split(',').map((cat, index) => (
                    <Chip key={index} label={cat.trim()} size="small" />
                  ))}
                </Box>
              </>
            )}

            {document.issuer && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Cơ quan ban hành:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.issuer}
                </Typography>
              </>
            )}

            {document.signatory && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Người ký:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.signatory}
                </Typography>
              </>
            )}

            {document.gazette_number && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Số công báo:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.gazette_number}
                </Typography>
              </>
            )}

            {document.issue_date && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Ngày ban hành:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.issue_date}
                </Typography>
              </>
            )}

            {document.effective_date && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Ngày hiệu lực:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.effective_date}
                </Typography>
              </>
            )}

            {document.publish_date && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Ngày công bố:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {document.publish_date}
                </Typography>
              </>
            )}

            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Tình trạng:
            </Typography>
            <Chip
              label={document.status}
              size="small"
              color={document.status?.includes('Còn hiệu lực') ? 'success' : 'default'}
              sx={{ mt: 0.5 }}
            />

            {document.related_documents && document.related_documents.length > 0 && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  Văn bản liên quan: ({document.related_documents.length})
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {document.related_documents.slice(0, 3).map((related, index) => (
                    <Typography key={index} variant="caption" component="div">
                      • {related.title}
                    </Typography>
                  ))}
                  {document.related_documents.length > 3 && (
                    <Typography variant="caption" color="textSecondary">
                      ... và {document.related_documents.length - 3} văn bản khác
                    </Typography>
                  )}
                </Box>
              </>
            )}
          </Box>
        </Paper>

        {/* ASCII Diagram */}
        {document.ascii_diagram && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              🤖 Sơ Đồ ASCII
            </Typography>
            <Box
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                whiteSpace: 'pre',
                overflowX: 'auto',
                bgcolor: 'grey.100',
                p: 2,
                borderRadius: 1,
              }}
            >
              {document.ascii_diagram}
            </Box>
          </Paper>
        )}
      </TabPanel>

      {/* Tab 2: Chunks */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            🧩 Đoạn Văn Bản
          </Typography>

          {/* Summary */}
          <Box sx={{ mb: 2, bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
              • Tổng số đoạn: <strong>{chunks.length || document.chunk_count}</strong>
            </Typography>
            {chunks.length > 0 && (
              <>
                <Typography variant="body2" color="textSecondary">
                  • Kích thước trung bình: <strong>{Math.round(chunks.reduce((sum, c) => sum + c.character_count, 0) / chunks.length)} ký tự</strong>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  • Tổng số ký tự: <strong>{chunks.reduce((sum, c) => sum + c.character_count, 0).toLocaleString()}</strong>
                </Typography>
              </>
            )}
          </Box>

          {/* Loading State */}
          {isLoadingChunks && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Error State */}
          {chunksError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {chunksError}
              <Button size="small" onClick={fetchChunks} sx={{ ml: 2 }}>
                Thử lại
              </Button>
            </Alert>
          )}

          {/* Chunks List */}
          {!isLoadingChunks && chunks.length > 0 && (
            <Box>
              {chunks.slice(0, displayedChunksCount).map((chunk, index) => {
                // Check if this chunk is highlighted from RAG testing
                const isHighlighted = sourceChunkIds.includes(chunk.chunk_id);

                return (
                  <Accordion
                    key={chunk.chunk_id}
                    id={`chunk-${chunk.chunk_id}`}
                    sx={{
                      mb: 1,
                      border: isHighlighted ? '2px solid' : '1px solid',
                      borderColor: isHighlighted ? 'primary.main' : 'divider',
                      backgroundColor: isHighlighted ? 'primary.light' : 'background.paper',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: isHighlighted ? 3 : 1
                      }
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            Đoạn {index + 1} / {chunks.length}
                          </Typography>
                          {isHighlighted && (
                            <Chip
                              label="Nguồn RAG"
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {chunk.indexed_in_qdrant && (
                            <Chip label="Qdrant" size="small" color="success" variant="outlined" />
                          )}
                          {chunk.indexed_in_bm25 && (
                            <Chip label="BM25" size="small" color="primary" variant="outlined" />
                          )}
                          <Chip label={`${chunk.character_count} ký tự`} size="small" variant="outlined" />
                        </Box>
                      </Box>
                    </AccordionSummary>
                  <AccordionDetails>
                    {/* Vector ID */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="textSecondary">
                        Vector ID:
                      </Typography>
                      <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                        {chunk.vector_id}
                      </Typography>
                    </Box>

                    {/* Content Preview */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="textSecondary">
                        Nội dung:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50' }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                          {chunk.content}
                        </Typography>
                      </Paper>
                    </Box>

                    {/* Indexing Status */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Typography variant="caption" color="textSecondary">
                        Trạng thái lập chỉ mục:
                      </Typography>
                      <Box>
                        <Chip
                          label={chunk.indexed_in_qdrant ? '✓ Qdrant' : '✗ Qdrant'}
                          size="small"
                          color={chunk.indexed_in_qdrant ? 'success' : 'default'}
                          sx={{ mr: 0.5 }}
                        />
                        <Chip
                          label={chunk.indexed_in_bm25 ? '✓ BM25' : '✗ BM25'}
                          size="small"
                          color={chunk.indexed_in_bm25 ? 'success' : 'default'}
                        />
                      </Box>
                    </Box>

                  </AccordionDetails>
                </Accordion>
              );
              })}

              {/* Load More Button */}
              {displayedChunksCount < chunks.length && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button variant="outlined" onClick={handleLoadMore}>
                    Tải thêm ({chunks.length - displayedChunksCount} đoạn còn lại)
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Empty State */}
          {!isLoadingChunks && chunks.length === 0 && !chunksError && (
            <Alert severity="info">
              Không có đoạn văn nào. Văn bản có thể chưa được lập chỉ mục.
            </Alert>
          )}
        </Paper>
      </TabPanel>

      {/* Tab 3: Stats */}
      <TabPanel value={tabValue} index={2}>
        {/* Indexing Status */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            Trạng Thái Lập Chỉ Mục
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getStatusIcon(document.indexing_status.mongodb)}
              <Typography variant="body2">
                MongoDB: <strong>{document.indexing_status.mongodb}</strong>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getStatusIcon(document.indexing_status.qdrant)}
              <Typography variant="body2">
                Qdrant: <strong>{document.indexing_status.qdrant}</strong>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getStatusIcon(document.indexing_status.bm25)}
              <Typography variant="body2">
                Chỉ mục BM25: <strong>{document.indexing_status.bm25}</strong>
              </Typography>
            </Box>

            {document.indexing_status.last_indexed_at && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                Lập chỉ mục lần cuối: {new Date(document.indexing_status.last_indexed_at).toLocaleString('vi-VN')}
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="textSecondary">
            Số lượng vector: <strong>{document.chunk_count} điểm</strong>
          </Typography>
        </Paper>

        {/* Usage Analytics */}
        {document.usage_analytics && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              Phân Tích Sử Dụng
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Tổng số truy vấn: <strong>{document.usage_analytics.query_count}</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Tuần này: <strong>{document.usage_analytics.query_count_this_week}</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Số lần truy xuất: <strong>{document.usage_analytics.times_retrieved}</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Đoạn văn đã dùng: <strong>{document.usage_analytics.chunks_used}</strong>
              </Typography>

              {document.usage_analytics.avg_relevance_score && (
                <Typography variant="body2" color="textSecondary">
                  Điểm liên quan TB: <strong>{document.usage_analytics.avg_relevance_score.toFixed(2)}</strong>
                </Typography>
              )}

              {document.usage_analytics.last_accessed_at && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Truy cập lần cuối: {new Date(document.usage_analytics.last_accessed_at).toLocaleString('vi-VN')}
                </Typography>
              )}
            </Box>
          </Paper>
        )}

        {/* File Metadata */}
        {document.file_metadata && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              Thông Tin Tệp
            </Typography>

            <Box sx={{ mt: 2 }}>
              {document.file_metadata.original_folder && (
                <Typography variant="body2" color="textSecondary">
                  Thư mục gốc: <strong>{document.file_metadata.original_folder}</strong>
                </Typography>
              )}
              {document.file_metadata.uploaded_at && (
                <Typography variant="body2" color="textSecondary">
                  Tải lên: <strong>{new Date(document.file_metadata.uploaded_at).toLocaleString('vi-VN')}</strong>
                </Typography>
              )}

              {document.file_metadata.processing_time_seconds && (
                <Typography variant="body2" color="textSecondary">
                  Thời gian xử lý: <strong>{document.file_metadata.processing_time_seconds.toFixed(2)}s</strong>
                </Typography>
              )}

              {document.file_metadata.diagram_generation_time_seconds && (
                <Typography variant="body2" color="textSecondary">
                  Thời gian tạo sơ đồ: <strong>{document.file_metadata.diagram_generation_time_seconds.toFixed(2)}s</strong>
                </Typography>
              )}
            </Box>
          </Paper>
        )}
      </TabPanel>
    </Box>
  );
};

export default DocumentDetails;
