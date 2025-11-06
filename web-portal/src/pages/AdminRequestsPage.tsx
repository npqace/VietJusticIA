import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  LogoutOutlined,
  PersonOutline,
  ArrowBackOutlined,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatDate } from '../utils/dateFormatter';

// Service Request Interface
interface AdminServiceRequest {
  id: number;
  user_id: number;
  user_name: string;
  lawyer_id?: number;
  lawyer_name?: string;
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  lawyer_response?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}

// Consultation Request Interface
interface ConsultationRequest {
  id: number;
  user_id?: number;
  full_name: string;
  email: string;
  phone: string;
  province: string;
  district: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  admin_notes?: string;
  assigned_lawyer_id?: number;
  assigned_lawyer_name?: string;
  created_at: string;
  updated_at: string;
}

// Help Request Interface
interface HelpRequest {
  id: number;
  user_id?: number;
  full_name: string;
  email: string;
  subject: string;
  content: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  admin_notes?: string;
  admin_id?: number;
  created_at: string;
  updated_at: string;
}

const AdminRequestsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [currentTab, setCurrentTab] = useState(0);

  // Service Requests state
  const [serviceRequests, setServiceRequests] = useState<AdminServiceRequest[]>([]);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<AdminServiceRequest | null>(null);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [isLoadingService, setIsLoadingService] = useState(true);

  // Consultation Requests state
  const [consultationRequests, setConsultationRequests] = useState<ConsultationRequest[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationRequest | null>(null);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [isLoadingConsultation, setIsLoadingConsultation] = useState(true);

  // Help Requests state
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [selectedHelpRequest, setSelectedHelpRequest] = useState<HelpRequest | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [isLoadingHelp, setIsLoadingHelp] = useState(true);

  // Edit consultation state
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Edit help request state
  const [editHelpStatus, setEditHelpStatus] = useState('');
  const [editHelpNotes, setEditHelpNotes] = useState('');

  useEffect(() => {
    fetchServiceRequests();
    fetchConsultationRequests();
    fetchHelpRequests();
  }, []);

  const fetchServiceRequests = async () => {
    try {
      const response = await api.get<AdminServiceRequest[]>('/api/v1/admin/requests');
      setServiceRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch service requests:', error);
    } finally {
      setIsLoadingService(false);
    }
  };

  const fetchConsultationRequests = async () => {
    try {
      const response = await api.get<ConsultationRequest[]>('/api/v1/consultations');
      setConsultationRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch consultation requests:', error);
    } finally {
      setIsLoadingConsultation(false);
    }
  };

  const fetchHelpRequests = async () => {
    try {
      const response = await api.get<HelpRequest[]>('/api/v1/help-requests');
      setHelpRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch help requests:', error);
    } finally {
      setIsLoadingHelp(false);
    }
  };

  const handleViewServiceRequest = (request: AdminServiceRequest) => {
    setSelectedServiceRequest(request);
    setServiceDialogOpen(true);
  };

  const handleViewConsultation = async (requestId: number) => {
    try {
      // Fetch full consultation details including content
      const response = await api.get<ConsultationRequest>(`/api/v1/consultations/${requestId}`);
      setSelectedConsultation(response.data);
      setEditStatus(response.data.status);
      setEditPriority(response.data.priority);
      setEditNotes(response.data.admin_notes || '');
      setConsultationDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch consultation details:', error);
    }
  };

  const handleUpdateConsultation = async () => {
    if (!selectedConsultation) return;

    try {
      await api.patch(`/api/v1/consultations/${selectedConsultation.id}`, {
        status: editStatus,
        priority: editPriority,
        admin_notes: editNotes,
      });

      // Refresh data
      await fetchConsultationRequests();
      setConsultationDialogOpen(false);
    } catch (error) {
      console.error('Failed to update consultation request:', error);
    }
  };

  const handleViewHelpRequest = async (requestId: number) => {
    try {
      // Fetch full help request details including content
      const response = await api.get<HelpRequest>(`/api/v1/help-requests/${requestId}`);
      setSelectedHelpRequest(response.data);
      setEditHelpStatus(response.data.status);
      setEditHelpNotes(response.data.admin_notes || '');
      setHelpDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch help request details:', error);
    }
  };

  const handleUpdateHelpRequest = async () => {
    if (!selectedHelpRequest) return;

    try {
      await api.patch(`/api/v1/help-requests/${selectedHelpRequest.id}`, {
        status: editHelpStatus,
        admin_notes: editHelpNotes,
      });

      // Refresh data
      await fetchHelpRequests();
      setHelpDialogOpen(false);
    } catch (error) {
      console.error('Failed to update help request:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
      case 'resolved':
        return 'success';
      case 'cancelled':
      case 'rejected':
      case 'closed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/admin')}>
            <ArrowBackOutlined />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VietJusticIA - All Requests
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
        <Paper sx={{ p: 3 }}>
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab label={`Service Requests (${serviceRequests.length})`} />
            <Tab label={`Consultation Requests (${consultationRequests.length})`} />
            <Tab label={`Help Requests (${helpRequests.length})`} />
          </Tabs>

          {/* Service Requests Tab */}
          {currentTab === 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Service Requests (User → Specific Lawyer)
              </Typography>
              {isLoadingService ? (
                <Typography>Loading...</Typography>
              ) : serviceRequests.length === 0 ? (
                <Typography color="text.secondary">No service requests found.</Typography>
              ) : (
                <TableContainer sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Lawyer</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {serviceRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.id}</TableCell>
                          <TableCell>{request.user_name}</TableCell>
                          <TableCell>{request.lawyer_name || 'N/A'}</TableCell>
                          <TableCell>{request.title}</TableCell>
                          <TableCell>
                            <Chip
                              label={request.status}
                              size="small"
                              color={getStatusColor(request.status) as any}
                            />
                          </TableCell>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewServiceRequest(request)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Consultation Requests Tab */}
          {currentTab === 1 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Consultation Requests (Legal Consultation Form)
              </Typography>
              {isLoadingConsultation ? (
                <Typography>Loading...</Typography>
              ) : consultationRequests.length === 0 ? (
                <Typography color="text.secondary">No consultation requests found.</Typography>
              ) : (
                <TableContainer sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {consultationRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.id}</TableCell>
                          <TableCell>{request.full_name}</TableCell>
                          <TableCell>{request.email}</TableCell>
                          <TableCell>{request.district}, {request.province}</TableCell>
                          <TableCell>
                            <Chip
                              label={request.priority}
                              size="small"
                              color={getPriorityColor(request.priority) as any}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={request.status}
                              size="small"
                              color={getStatusColor(request.status) as any}
                            />
                          </TableCell>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewConsultation(request.id)}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Help Requests Tab */}
          {currentTab === 2 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Help Requests (Contact Us Form)
              </Typography>
              {isLoadingHelp ? (
                <Typography>Loading...</Typography>
              ) : helpRequests.length === 0 ? (
                <Typography color="text.secondary">No help requests found.</Typography>
              ) : (
                <TableContainer sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {helpRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.id}</TableCell>
                          <TableCell>{request.full_name}</TableCell>
                          <TableCell>{request.email}</TableCell>
                          <TableCell>{request.subject}</TableCell>
                          <TableCell>
                            <Chip
                              label={request.status}
                              size="small"
                              color={getStatusColor(request.status) as any}
                            />
                          </TableCell>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewHelpRequest(request.id)}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Paper>
      </Container>

      {/* Service Request Details Dialog */}
      <Dialog open={serviceDialogOpen} onClose={() => setServiceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Service Request Details</DialogTitle>
        <DialogContent>
          {selectedServiceRequest && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Request ID
                </Typography>
                <Typography variant="body1">{selectedServiceRequest.id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedServiceRequest.status}
                  color={getStatusColor(selectedServiceRequest.status) as any}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  User
                </Typography>
                <Typography variant="body1">{selectedServiceRequest.user_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Lawyer
                </Typography>
                <Typography variant="body1">{selectedServiceRequest.lawyer_name || 'Not assigned'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="body1">{selectedServiceRequest.title}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedServiceRequest.description}
                  </Typography>
                </Paper>
              </Grid>
              {selectedServiceRequest.lawyer_response && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Lawyer Response
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'blue.50' }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedServiceRequest.lawyer_response}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              {selectedServiceRequest.rejected_reason && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Rejection Reason
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedServiceRequest.rejected_reason}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created At
                </Typography>
                <Typography variant="body1">{formatDate(selectedServiceRequest.created_at)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated At
                </Typography>
                <Typography variant="body1">{formatDate(selectedServiceRequest.updated_at)}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServiceDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Help Form Request Details Dialog */}
      <Dialog open={consultationDialogOpen} onClose={() => setConsultationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Help Form Request Details</DialogTitle>
        <DialogContent>
          {selectedConsultation && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Request ID
                </Typography>
                <Typography variant="body1">{selectedConsultation.id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  User Type
                </Typography>
                <Chip label={selectedConsultation.user_id ? 'Registered User' : 'Guest'} size="small" />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Full Name
                </Typography>
                <Typography variant="body1">{selectedConsultation.full_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{selectedConsultation.email}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1">{selectedConsultation.phone}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1">{selectedConsultation.district}, {selectedConsultation.province}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Request Content
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedConsultation.content}
                  </Typography>
                </Paper>
              </Grid>

              {/* Admin Management Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  Admin Management
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editStatus}
                    label="Status"
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={editPriority}
                    label="Priority"
                    onChange={(e) => setEditPriority(e.target.value)}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Admin Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created At
                </Typography>
                <Typography variant="body1">{formatDate(selectedConsultation.created_at)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated At
                </Typography>
                <Typography variant="body1">{formatDate(selectedConsultation.updated_at)}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsultationDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateConsultation}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Help Request Details Dialog */}
      <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Help Request Details</DialogTitle>
        <DialogContent>
          {selectedHelpRequest && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Request ID
                </Typography>
                <Typography variant="body1">{selectedHelpRequest.id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  User Type
                </Typography>
                <Chip label={selectedHelpRequest.user_id ? 'Registered User' : 'Guest'} size="small" />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Full Name
                </Typography>
                <Typography variant="body1">{selectedHelpRequest.full_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{selectedHelpRequest.email}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Subject
                </Typography>
                <Typography variant="body1">{selectedHelpRequest.subject}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Request Content
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedHelpRequest.content}
                  </Typography>
                </Paper>
              </Grid>

              {/* Admin Management Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  Admin Management
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editHelpStatus}
                    label="Status"
                    onChange={(e) => setEditHelpStatus(e.target.value)}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Admin Notes"
                  value={editHelpNotes}
                  onChange={(e) => setEditHelpNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created At
                </Typography>
                <Typography variant="body1">{formatDate(selectedHelpRequest.created_at)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated At
                </Typography>
                <Typography variant="body1">{formatDate(selectedHelpRequest.updated_at)}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateHelpRequest}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminRequestsPage;
