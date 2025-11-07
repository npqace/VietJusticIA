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
  Button,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import {
  LogoutOutlined,
  PersonOutline,
  CheckCircleOutline,
  CancelOutlined,
  ArrowBackOutlined,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import type { Lawyer } from '../types';

const AdminLawyersPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchLawyers();
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  const fetchLawyers = async () => {
    try {
      const response = await api.get<Lawyer[]>('/api/v1/lawyers');
      setLawyers(response.data);
    } catch (error) {
      console.error('Failed to fetch lawyers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setDialogOpen(true);
  };

  const handleApprove = async (lawyerId: number) => {
    try {
      await api.patch(`/api/v1/lawyers/${lawyerId}/approve`);
      fetchLawyers();
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to approve lawyer:', error);
    }
  };

  const handleReject = async (lawyerId: number) => {
    try {
      await api.patch(`/api/v1/lawyers/${lawyerId}/reject`);
      fetchLawyers();
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to reject lawyer:', error);
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
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleStatusFilterChange = (_event: React.SyntheticEvent, newValue: string) => {
    setStatusFilter(newValue);
    if (newValue === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ status: newValue });
    }
  };

  const filteredLawyers = lawyers.filter((lawyer) => {
    if (statusFilter === 'all') return true;
    return lawyer.verification_status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/admin')}>
            <ArrowBackOutlined />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VietJusticIA - Manage Lawyers
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
          <Typography variant="h5" gutterBottom>
            Lawyer Applications
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
            <Tabs value={statusFilter} onChange={handleStatusFilterChange}>
              <Tab label="All" value="all" />
              <Tab label="Pending" value="pending" />
              <Tab label="Approved" value="approved" />
              <Tab label="Rejected" value="rejected" />
            </Tabs>
          </Box>

          {isLoading ? (
            <Typography sx={{ mt: 3 }}>Loading...</Typography>
          ) : filteredLawyers.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 3 }}>
              No lawyers found for this filter.
            </Typography>
          ) : (
            <TableContainer sx={{ mt: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>License Number</TableCell>
                    <TableCell>Experience</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLawyers.map((lawyer) => (
                    <TableRow key={lawyer.id}>
                      <TableCell>{lawyer.id}</TableCell>
                      <TableCell>{lawyer.full_name}</TableCell>
                      <TableCell>{lawyer.email}</TableCell>
                      <TableCell>{lawyer.bar_license_number}</TableCell>
                      <TableCell>{lawyer.years_of_experience} years</TableCell>
                      <TableCell>
                        <Chip
                          label={lawyer.verification_status.charAt(0) + lawyer.verification_status.slice(1).toLowerCase()}
                          size="small"
                          color={getStatusColor(lawyer.verification_status) as any}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewDetails(lawyer)}
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
        </Paper>
      </Container>

      {/* Lawyer Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Lawyer Details</DialogTitle>
        <DialogContent>
          {selectedLawyer && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Full Name
                </Typography>
                <Typography variant="body1">{selectedLawyer.full_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{selectedLawyer.email}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1">{selectedLawyer.phone}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  License Number
                </Typography>
                <Typography variant="body1">{selectedLawyer.bar_license_number}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Years of Experience
                </Typography>
                <Typography variant="body1">{selectedLawyer.years_of_experience} years</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Consultation Fee
                </Typography>
                <Typography variant="body1">${selectedLawyer.consultation_fee}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Specialization
                </Typography>
                <Typography variant="body1">{selectedLawyer.specialization}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Bio
                </Typography>
                <Typography variant="body1">{selectedLawyer.bio}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedLawyer.verification_status.charAt(0) + selectedLawyer.verification_status.slice(1).toLowerCase()}
                  color={getStatusColor(selectedLawyer.verification_status) as any}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedLawyer?.verification_status.toUpperCase() === 'PENDING' && (
            <>
              <Button
                startIcon={<CancelOutlined />}
                color="error"
                onClick={() => handleReject(selectedLawyer.id)}
              >
                Reject
              </Button>
              <Button
                startIcon={<CheckCircleOutline />}
                variant="contained"
                color="success"
                onClick={() => handleApprove(selectedLawyer.id)}
              >
                Approve
              </Button>
            </>
          )}
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminLawyersPage;
