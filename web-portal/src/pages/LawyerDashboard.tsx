import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { LogoutOutlined, PersonOutline, AssignmentOutlined, ChatOutlined } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { ServiceRequest } from '../types';
import ServiceRequestDetailsDialog from '../components/ServiceRequestDetailsDialog';

const LawyerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(
    null
  );
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    fetchServiceRequests();
  }, []);

  const fetchServiceRequests = async () => {
    try {
      const response = await api.get<ServiceRequest[]>(
        '/api/v1/lawyers/requests/my-requests'
      );
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch service requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleViewDetails = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedRequest(null);
  };

  const getStatusColor = (status: string) => {
    // Normalize to lowercase for comparison since backend returns UPPERCASE
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return 'warning';
      case 'accepted':
        return 'info';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VietJusticIA - Lawyer Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              color="inherit"
              startIcon={<ChatOutlined />}
              onClick={() => navigate('/lawyer/conversations')}
            >
              Conversations
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

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Statistics Cards */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentOutlined color="primary" />
                  <Typography variant="h6">Total Requests</Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 2 }}>
                  {requests.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">Pending</Typography>
                <Typography variant="h3" sx={{ mt: 2 }}>
                  {requests.filter((r) => r.status.toUpperCase() === 'PENDING').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">In Progress</Typography>
                <Typography variant="h3" sx={{ mt: 2 }}>
                  {requests.filter((r) => r.status.toUpperCase() === 'IN_PROGRESS').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Service Requests List */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Service Requests
              </Typography>

              {isLoading ? (
                <Typography>Loading...</Typography>
              ) : requests.length === 0 ? (
                <Typography color="text.secondary">No service requests yet.</Typography>
              ) : (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  {requests.map((request) => (
                    <Grid size={{ xs: 12 }} key={request.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                            }}
                          >
                            <Box>
                              <Typography variant="h6">{request.title}</Typography>
                              <Typography color="text.secondary" sx={{ mt: 1 }}>
                                {request.description}
                              </Typography>
                              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                {request.category && <Chip label={request.category} size="small" />}
                                <Chip
                                  label={request.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                                  size="small"
                                  color={getStatusColor(request.status) as any}
                                />
                                {request.urgency && <Chip label={`Urgency: ${request.urgency}`} size="small" />}
                              </Box>
                            </Box>
                            <Button
                              variant="outlined"
                              onClick={() => handleViewDetails(request)}
                            >
                              View Details
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {selectedRequest && (
        <ServiceRequestDetailsDialog
          open={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
          request={selectedRequest}
          onUpdate={fetchServiceRequests}
        />
      )}
    </Box>
  );
};

export default LawyerDashboard;
