import React, { useState } from 'react';
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
} from '@mui/material';
import {
  DescriptionOutlined,
  ViewModuleOutlined,
  BarChartOutlined,
  CheckCircleOutline,
  ErrorOutline,
  HourglassEmpty,
} from '@mui/icons-material';
import type { DocumentDetail } from '../../pages/AdminDocumentCMS';

interface DocumentDetailsProps {
  document: DocumentDetail;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
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

const DocumentDetails: React.FC<DocumentDetailsProps> = ({ document }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            Đoạn Văn Bản
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Tổng số đoạn: <strong>{document.chunk_count}</strong>
            </Typography>

            <Alert severity="info" sx={{ mt: 2 }}>
              Trực quan hóa chi tiết các đoạn văn sẽ được triển khai trong Giai đoạn 2.
              <br />
              <br />
              Hiện tại: {document.chunk_count} đoạn văn đã được lập chỉ mục trong Qdrant.
            </Alert>
          </Box>
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
