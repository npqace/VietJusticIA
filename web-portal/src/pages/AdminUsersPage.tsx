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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import {
  LogoutOutlined,
  PersonOutline,
  ArrowBackOutlined,
  SearchOutlined,
  BlockOutlined,
  CheckCircleOutline,
  AddOutlined,
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    role: string;
  } | null>(null);
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'lawyer',
    lawyer_profile: {
      specialization: '',
      bar_license_number: '',
      years_of_experience: 0,
      city: '',
      province: '',
      bio: '',
      consultation_fee: '',
      languages: 'Vietnamese',
    },
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const handleOpenCreateDialog = () => {
    setNewUser({
      full_name: '',
      email: '',
      phone: '',
      role: 'lawyer',
      lawyer_profile: {
        specialization: '',
        bar_license_number: '',
        years_of_experience: 0,
        city: '',
        province: '',
        bio: '',
        consultation_fee: '',
        languages: 'Vietnamese',
      },
    });
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!newUser.full_name.trim()) errors.full_name = 'Full name is required';
    if (!newUser.email.trim()) errors.email = 'Email is required';
    if (!newUser.phone.trim()) errors.phone = 'Phone is required';

    if (newUser.role === 'lawyer') {
      if (!newUser.lawyer_profile.specialization.trim())
        errors.specialization = 'Specialization is required';
      if (!newUser.lawyer_profile.bar_license_number.trim())
        errors.bar_license_number = 'Bar license number is required';
      if (newUser.lawyer_profile.years_of_experience < 0)
        errors.years_of_experience = 'Years of experience cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    try {
      const payload: any = {
        full_name: newUser.full_name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      };

      if (newUser.role === 'lawyer') {
        payload.lawyer_profile = {
          ...newUser.lawyer_profile,
          consultation_fee: newUser.lawyer_profile.consultation_fee
            ? parseFloat(newUser.lawyer_profile.consultation_fee)
            : null,
        };
      }

      const response = await api.post('/api/v1/admin/users/create', payload);

      // Store credentials to show in dialog
      setCreatedCredentials({
        email: response.data.user.email,
        password: response.data.generated_password,
        role: response.data.user.role,
      });

      fetchUsers();
      handleCloseCreateDialog();
      setCredentialsDialogOpen(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to create user';
      alert(errorMessage);
      console.error('Failed to create user:', error);
    }
  };

  const handleCopyCredentials = () => {
    if (createdCredentials) {
      const text = `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
      navigator.clipboard.writeText(text);
      alert('Credentials copied to clipboard!');
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
            <Box sx={{ display: 'flex', gap: 2 }}>
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
              <Button
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={handleOpenCreateDialog}
              >
                Create User
              </Button>
            </Box>
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

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New User Account</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Info */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                error={!!formErrors.full_name}
                helperText={formErrors.full_name}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                error={!!formErrors.email}
                helperText={formErrors.email}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                error={!!formErrors.phone}
                helperText={formErrors.phone}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  value={newUser.role}
                  label="Role"
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <MenuItem value="lawyer">Lawyer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
                <FormHelperText>Password will be auto-generated and displayed after creation</FormHelperText>
              </FormControl>
            </Grid>

            {/* Lawyer Profile Fields - Only shown if role is lawyer */}
            {newUser.role === 'lawyer' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    Lawyer Profile
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Specialization"
                    value={newUser.lawyer_profile.specialization}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        lawyer_profile: { ...newUser.lawyer_profile, specialization: e.target.value },
                      })
                    }
                    error={!!formErrors.specialization}
                    helperText={formErrors.specialization}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Bar License Number"
                    value={newUser.lawyer_profile.bar_license_number}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        lawyer_profile: { ...newUser.lawyer_profile, bar_license_number: e.target.value },
                      })
                    }
                    error={!!formErrors.bar_license_number}
                    helperText={formErrors.bar_license_number}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Years of Experience"
                    type="number"
                    value={newUser.lawyer_profile.years_of_experience}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        lawyer_profile: {
                          ...newUser.lawyer_profile,
                          years_of_experience: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    error={!!formErrors.years_of_experience}
                    helperText={formErrors.years_of_experience}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="City"
                    value={newUser.lawyer_profile.city}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        lawyer_profile: { ...newUser.lawyer_profile, city: e.target.value },
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Province"
                    value={newUser.lawyer_profile.province}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        lawyer_profile: { ...newUser.lawyer_profile, province: e.target.value },
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Consultation Fee (VND)"
                    type="number"
                    value={newUser.lawyer_profile.consultation_fee}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        lawyer_profile: { ...newUser.lawyer_profile, consultation_fee: e.target.value },
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Languages"
                    value={newUser.lawyer_profile.languages}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        lawyer_profile: { ...newUser.lawyer_profile, languages: e.target.value },
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Bio"
                    multiline
                    rows={3}
                    value={newUser.lawyer_profile.bio}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        lawyer_profile: { ...newUser.lawyer_profile, bio: e.target.value },
                      })
                    }
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateUser}>
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credentials Display Dialog */}
      <Dialog
        open={credentialsDialogOpen}
        onClose={() => setCredentialsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Account Created Successfully</DialogTitle>
        <DialogContent>
          {createdCredentials && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                The {createdCredentials.role} account has been created. Please share these credentials with the user:
              </Typography>
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.100' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {createdCredentials.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Password
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {createdCredentials.password}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
              <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
                Important: Save these credentials now. The password cannot be retrieved later.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyCredentials} variant="outlined">
            Copy to Clipboard
          </Button>
          <Button onClick={() => setCredentialsDialogOpen(false)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsersPage;
