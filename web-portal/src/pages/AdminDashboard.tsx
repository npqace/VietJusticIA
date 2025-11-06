import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  Button,
} from '@mui/material';
import {
  LogoutOutlined,
  PersonOutline,
  PeopleOutlined,
  GavelOutlined,
  AssignmentOutlined,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface DashboardStats {
  total_users: number;
  total_lawyers: number;
  pending_lawyers: number;
  total_requests: number;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_lawyers: 0,
    pending_lawyers: 0,
    total_requests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // TODO: Create backend endpoint for admin stats
      // For now, this is a placeholder
      const response = await api.get<DashboardStats>('/api/v1/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VietJusticIA - Admin Dashboard
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
        <Grid container spacing={3}>
          {/* Statistics Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleOutlined color="primary" />
                  <Typography variant="h6">Total Users</Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 2 }}>
                  {stats.total_users}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GavelOutlined color="success" />
                  <Typography variant="h6">Total Lawyers</Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 2 }}>
                  {stats.total_lawyers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GavelOutlined color="warning" />
                  <Typography variant="h6">Pending Approvals</Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 2 }}>
                  {stats.pending_lawyers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentOutlined color="info" />
                  <Typography variant="h6">Service Requests</Typography>
                </Box>
                <Typography variant="h3" sx={{ mt: 2 }}>
                  {stats.total_requests}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<GavelOutlined />}
                    onClick={() => navigate('/admin/lawyers')}
                  >
                    Manage Lawyers
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<PeopleOutlined />}
                    onClick={() => navigate('/admin/users')}
                  >
                    Manage Users
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<AssignmentOutlined />}
                    onClick={() => navigate('/admin/requests')}
                  >
                    View All Requests
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Recent Activity
              </Typography>
              {isLoading ? (
                <Typography>Loading...</Typography>
              ) : (
                <Typography color="text.secondary">No recent activity.</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
