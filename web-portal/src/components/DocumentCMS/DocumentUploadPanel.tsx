import React, { useState, useRef } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  LinearProgress,
} from '@mui/material';
import { UploadFileOutlined, FolderOutlined } from '@mui/icons-material';
import api from '../../services/api';

interface DocumentUploadPanelProps {
  onUploadSuccess: () => void;
}

const DocumentUploadPanel: React.FC<DocumentUploadPanelProps> = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Processing options
  const [generateDiagram, setGenerateDiagram] = useState(true);
  const [indexQdrant, setIndexQdrant] = useState(true);
  const [indexMongoDB, setIndexMongoDB] = useState(true);
  const [indexBM25, setIndexBM25] = useState(true);

  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  const handleFolderChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    // Validate required files
    let hasMetadata = false;
    let hasContent = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name === 'metadata.json') {
        hasMetadata = true;
      } else if (file.name === 'cleaned_content.txt') {
        hasContent = true;
      }
    }

    if (!hasMetadata || !hasContent) {
      setError('Thư mục phải chứa metadata.json và cleaned_content.txt');
      return;
    }

    await uploadFolder(files);
  };

  const uploadFolder = async (files: FileList) => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Append all files
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      // Append processing options
      formData.append('generate_diagram', generateDiagram.toString());
      formData.append('index_qdrant', indexQdrant.toString());
      formData.append('index_mongodb', indexMongoDB.toString());
      formData.append('index_bm25', indexBM25.toString());

      const response = await api.post('/api/v1/admin/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      setSuccess(`Văn bản "${response.data.title}" đã được tải lên thành công! Đang xử lý trong nền.`);
      onUploadSuccess();

      // Reset input
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Upload failed:', err);

      if (err.response?.status === 409) {
        setError('Văn bản với ID này đã tồn tại.');
      } else if (err.response?.status === 400) {
        setError(err.response.data.detail || 'Định dạng văn bản không hợp lệ.');
      } else {
        setError('Tải văn bản lên thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        📁 Tải Lên Thư Mục Văn Bản
      </Typography>

      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in TS types
        webkitdirectory="true"
        directory="true"
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderChange}
        disabled={isUploading}
      />

      {/* Upload button */}
      <Box
        sx={{
          border: '2px dashed',
          borderColor: 'primary.main',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          bgcolor: isUploading ? 'action.disabledBackground' : 'transparent',
          '&:hover': {
            bgcolor: isUploading ? 'action.disabledBackground' : 'action.hover',
          },
        }}
        onClick={!isUploading ? handleFolderSelect : undefined}
      >
        <FolderOutlined sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="body1" gutterBottom>
          {isUploading ? 'Đang tải lên...' : 'Nhấn để chọn thư mục'}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Tệp bắt buộc:
        </Typography>
        <Typography variant="caption" component="div" color="textSecondary">
          ✓ cleaned_content.txt
        </Typography>
        <Typography variant="caption" component="div" color="textSecondary">
          ✓ metadata.json
        </Typography>
        <Typography variant="caption" component="div" color="textSecondary">
          • page_content.html (tùy chọn)
        </Typography>
      </Box>

      {/* Upload progress */}
      {isUploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption" sx={{ mt: 1 }}>
            Đang tải lên: {uploadProgress}%
          </Typography>
        </Box>
      )}

      {/* Processing options */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          ⚡ Tùy Chọn Xử Lý:
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={generateDiagram}
              onChange={(e) => setGenerateDiagram(e.target.checked)}
              disabled={isUploading}
              size="small"
            />
          }
          label="Tạo sơ đồ ASCII"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={indexQdrant}
              onChange={(e) => setIndexQdrant(e.target.checked)}
              disabled={isUploading}
              size="small"
            />
          }
          label="Lập chỉ mục Qdrant Cloud"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={indexMongoDB}
              onChange={(e) => setIndexMongoDB(e.target.checked)}
              disabled={isUploading}
              size="small"
            />
          }
          label="Lập chỉ mục MongoDB Atlas"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={indexBM25}
              onChange={(e) => setIndexBM25(e.target.checked)}
              disabled={isUploading}
              size="small"
            />
          }
          label="Xây dựng chỉ mục BM25"
        />
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Success message */}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Paper>
  );
};

export default DocumentUploadPanel;
