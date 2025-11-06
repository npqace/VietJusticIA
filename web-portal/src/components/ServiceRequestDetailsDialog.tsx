import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import type { ServiceRequest } from '../types';
import api from '../services/api';

interface ServiceRequestDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  request: ServiceRequest | null;
  onUpdate?: () => void; // Callback to refresh parent data
}

const ServiceRequestDetailsDialog: React.FC<
  ServiceRequestDetailsDialogProps
> = ({ open, onClose, request, onUpdate }) => {
  const [updatedStatus, setUpdatedStatus] = useState('');
  const [lawyerResponse, setLawyerResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (request) {
      // Backend returns UPPERCASE, convert to lowercase for consistency with UI
      setUpdatedStatus(request.status.toLowerCase());
      setLawyerResponse(request.lawyer_response || '');
      setError(null);
      setSuccess(false);
    }
  }, [request]);

  if (!request) {
    return null;
  }

  const handleUpdate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Backend expects UPPERCASE status values
      await api.patch(`/api/v1/service-requests/${request.id}`, {
        status: updatedStatus.toUpperCase(),
        lawyer_response: lawyerResponse,
      });

      setSuccess(true);

      // Call parent refresh callback
      if (onUpdate) {
        onUpdate();
      }

      // Close dialog after short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Failed to update service request:', error);

      // Extract error message from response
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        'Failed to update service request';

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'accepted':
        return 'info';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Service Request Details</DialogTitle>
      <DialogContent dividers>
        {/* Success/Error Alerts */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Service request updated successfully!
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          {request.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {request.description}
        </Typography>

        <Box sx={{ my: 2 }}>
          <Chip
            label={request.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
            size="small"
            color={getStatusColor(request.status.toLowerCase()) as any}
          />
        </Box>

        {request.user && (
          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom>
              Client Information
            </Typography>
            <Typography variant="body2">
              <strong>Name:</strong> {request.user.full_name}
            </Typography>
            <Typography variant="body2">
              <strong>Email:</strong> {request.user.email}
            </Typography>
            <Typography variant="body2">
              <strong>Phone:</strong> {request.user.phone}
            </Typography>
          </Box>
        )}

        {/* Display existing lawyer response if available */}
        {request.lawyer_response && (
          <Box mt={3} p={2} sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Your Previous Response
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {request.lawyer_response}
            </Typography>
          </Box>
        )}

        {/* Display rejection reason if available */}
        {request.rejected_reason && (
          <Box mt={2} p={2} sx={{ bgcolor: 'error.lighter', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
              Rejection Reason
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {request.rejected_reason}
            </Typography>
          </Box>
        )}

        <Box mt={4}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Update Request
          </Typography>
          <FormControl fullWidth sx={{ mb: 2, mt: 2 }} disabled={isLoading}>
            <InputLabel>Status</InputLabel>
            <Select
              value={updatedStatus}
              label="Status"
              onChange={(e) => setUpdatedStatus(e.target.value)}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label={request.lawyer_response ? "Update Your Response / Notes" : "Add Your Response / Notes"}
            value={lawyerResponse}
            onChange={(e) => setLawyerResponse(e.target.value)}
            variant="outlined"
            disabled={isLoading}
            placeholder="Add notes, updates, or feedback for the client..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Close
        </Button>
        <Button
          onClick={handleUpdate}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Updating...' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceRequestDetailsDialog;
