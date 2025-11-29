import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircleOutline,
  ErrorOutline,
  HourglassEmpty,
  DeleteOutlined,
} from '@mui/icons-material';
import type { DocumentListItem, DocumentDetail } from '../../pages/AdminDocumentCMS';

interface DocumentListProps {
  documents: DocumentListItem[];
  selectedDocument: DocumentDetail | null;
  totalCount: number;
  onDocumentSelect: (doc: DocumentListItem) => void;
  onDocumentDelete: (documentId: string) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleOutline fontSize="small" sx={{ color: 'success.main' }} />;
    case 'processing':
      return <HourglassEmpty fontSize="small" sx={{ color: 'warning.main' }} />;
    case 'failed':
      return <ErrorOutline fontSize="small" sx={{ color: 'error.main' }} />;
    default:
      return null;
  }
};

const getStatusColor = (status: string) => {
  // Handle Vietnamese legal document statuses
  if (status?.includes('Còn hiệu lực')) {
    return 'success';
  }
  if (status?.includes('Hết hiệu lực')) {
    return 'default';
  }
  return 'default';
};

const getIndexingStatusText = (indexing: any) => {
  const { mongodb, qdrant, bm25 } = indexing;

  if (mongodb === 'completed' && qdrant === 'completed' && bm25 === 'completed') {
    return '✓ Đã lập chỉ mục';
  }

  if (mongodb === 'processing' || qdrant === 'processing' || bm25 === 'processing') {
    return '⏳ Đang lập chỉ mục...';
  }

  if (mongodb === 'failed' || qdrant === 'failed' || bm25 === 'failed') {
    return '❌ Lập chỉ mục thất bại';
  }

  return '⏳ Đang chờ';
};

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocument,
  totalCount,
  onDocumentSelect,
  onDocumentDelete,
}) => {
  if (documents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="textSecondary">
          Không tìm thấy văn bản
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
        📚 Văn Bản ({totalCount > 0 ? `${totalCount}` : documents.length})
      </Typography>

      {documents.map((doc) => (
        <Card
          key={doc._id}
          sx={{
            mb: 1,
            cursor: 'pointer',
            border: selectedDocument?._id === doc._id ? 2 : 0,
            borderColor: 'primary.main',
            '&:hover': {
              boxShadow: 3,
            },
          }}
          onClick={() => onDocumentSelect(doc)}
        >
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            {/* Status Icon + Title */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
              {getStatusIcon(doc.status)}
              <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500 }}>
                {doc.title.length > 60 ? `${doc.title.substring(0, 60)}...` : doc.title}
              </Typography>
              <Tooltip title="Xóa văn bản">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentDelete(doc._id);
                  }}
                  sx={{ ml: 'auto' }}
                >
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Metadata row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
              {doc.category && doc.category.split(',').map((cat, index) => (
                <Chip
                  key={index}
                  label={cat.trim()}
                  size="small"
                  variant="outlined"
                />
              ))}
              <Chip
                label={doc.status}
                size="small"
                color={getStatusColor(doc.status) as any}
              />
            </Box>

            {/* Upload date */}
            <Typography variant="caption" color="textSecondary" component="div">
              Tải lên: {new Date(doc.upload_date).toLocaleDateString('vi-VN')}
            </Typography>

            {/* Indexing status */}
            <Typography variant="caption" color="textSecondary" component="div">
              Trạng thái: {getIndexingStatusText(doc.indexing_status)}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default DocumentList;
