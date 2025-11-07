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
  TextField,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import {
  LogoutOutlined,
  PersonOutline,
  ArrowBackOutlined,
  SearchOutlined,
  BlockOutlined,
  CheckCircleOutline,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import type { User } from '../types';
import { formatDate } from '../utils/dateFormatter';

const AdminUsersPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
    const roleParam = searchParams.get('role');
    if (roleParam) {
      setRoleFilter(roleParam);
    }
  }, [searchParams]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users, roleFilter]);

  const fetchUsers = async () => {
    try {
      const response = await api.get<User[]>('/api/v1/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role.toLowerCase() === roleFilter.toLowerCase());
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.full_name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.phone.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleViewDetails = (selectedUser: User) => {
    setSelectedUser(selectedUser);
    setDialogOpen(true);
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await api.patch(`/api/v1/admin/users/${userId}/status`, {
        is_active: !currentStatus,
      });
      fetchUsers();
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'lawyer':
        return 'primary';
      case 'user':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleRoleFilterChange = (_event: React.SyntheticEvent, newValue: string) => {
    setRoleFilter(newValue);
    if (newValue === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ role: newValue });
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
            VietJusticIA - Manage Users
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">User Management</Typography>
            <TextField
              size="small"
              placeholder="Search by name, email, or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
            <Tabs value={roleFilter} onChange={handleRoleFilterChange}>
              <Tab label="All" value="all" />
              <Tab label="Users" value="user" />
              <Tab label="Lawyers" value="lawyer" />
              <Tab label="Admins" value="admin" />
            </Tabs>
          </Box>

          {isLoading ? (
            <Typography sx={{ mt: 3 }}>Loading...</Typography>
          ) : filteredUsers.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 3 }}>
              No users found.
            </Typography>
          ) : (
            <TableContainer sx={{ mt: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Verified</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>{u.full_name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.phone}</TableCell>
                      <TableCell>
                        <Chip label={u.role} size="small" color={getRoleColor(u.role) as any} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={u.is_active ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {u.is_verified ? (
                          <CheckCircleOutline color="success" fontSize="small" />
                        ) : (
                          <BlockOutlined color="disabled" fontSize="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewDetails(u)}
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

      {/* User Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Full Name
                </Typography>
                <Typography variant="body1">{selectedUser.full_name}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{selectedUser.email}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1">{selectedUser.phone}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Role
                </Typography>
                <Chip label={selectedUser.role} color={getRoleColor(selectedUser.role) as any} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedUser.is_active ? 'Active' : 'Inactive'}
                  color={selectedUser.is_active ? 'success' : 'default'}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Verified
                </Typography>
                <Typography variant="body1">{selectedUser.is_verified ? 'Yes' : 'No'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created At
                </Typography>
                <Typography variant="body1">
                  {formatDate(selectedUser.created_at)}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedUser && (
            <Button
              color={selectedUser.is_active ? 'error' : 'success'}
              onClick={() => handleToggleUserStatus(selectedUser.id, selectedUser.is_active)}
            >
              {selectedUser.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsersPage;
