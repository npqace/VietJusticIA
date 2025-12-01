import React, { useEffect, useState, useCallback } from 'react';
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
  TablePagination,
  Skeleton,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  LogoutOutlined,
  PersonOutline,
  ArrowBackOutlined,
  SearchOutlined,
  BlockOutlined,
  CheckCircleOutline,
  AddOutlined,
  ArrowUpward,
  ArrowDownward,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import type { User } from '../types';
import { formatDate } from '../utils/dateFormatter';

// Type for role color to satisfy MUI types
type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

interface UserListResponse {
  users: User[];
  total: number;
  skip: number;
  limit: number;
}

const AdminUsersPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Notification State
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

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

  // Fetch users with server-side pagination and filtering
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('skip', (page * rowsPerPage).toString());
      params.append('limit', rowsPerPage.toString());
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (roleFilter && roleFilter !== 'all') {
        params.append('role', roleFilter);
      }

      const response = await api.get<UserListResponse>(`/api/v1/admin/users?${params.toString()}`);
      setUsers(response.data.users);
      setTotalUsers(response.data.total);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showSnackbar('Không thể tải danh sách người dùng', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, roleFilter]);

  // Initial load and sync with URL params
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam) {
      setRoleFilter(roleParam);
    }
  }, [searchParams]);

  // Trigger fetch when dependencies change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleSortById = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    // Client-side sort for current page
    setUsers(prev => [...prev].sort((a, b) => {
      return sortOrder === 'asc' ? b.id - a.id : a.id - b.id;
    }));
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
      showSnackbar('Cập nhật trạng thái thành công', 'success');
      fetchUsers();
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to update user status:', error);
      showSnackbar('Cập nhật trạng thái thất bại', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleColor = (role: string): ChipColor => {
    switch (role.toLowerCase()) {
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
    setPage(0); // Reset to first page on filter change
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
    const emailRegex = /^[^
@]+@[^
@]+\.[^
@]+$/;
    const phoneRegex = /^(0|\+84)(\s|\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\d)(\s|\.)?(\d{3})(\s|\.)?(\d{3})$/;

    if (!newUser.full_name.trim()) errors.full_name = 'Họ và tên là bắt buộc';
    
    if (!newUser.email.trim()) {
      errors.email = 'Email là bắt buộc';
    } else if (!emailRegex.test(newUser.email)) {
      errors.email = 'Email không hợp lệ';
    }

    if (!newUser.phone.trim()) {
      errors.phone = 'Số điện thoại là bắt buộc';
    } 
    // Optional: Add phone regex validation strictness
    // else if (!phoneRegex.test(newUser.phone)) {
    //   errors.phone = 'Số điện thoại không hợp lệ (VN)';
    // }

    if (newUser.role === 'lawyer') {
      if (!newUser.lawyer_profile.specialization.trim())
        errors.specialization = 'Chuyên môn là bắt buộc';
      if (!newUser.lawyer_profile.bar_license_number.trim())
        errors.bar_license_number = 'Số giấy phép hành nghề là bắt buộc';
      if (newUser.lawyer_profile.years_of_experience < 0)
        errors.years_of_experience = 'Số năm kinh nghiệm không thể âm';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    try {
      // Define explicit type for payload
      interface CreateUserPayload {
        full_name: string;
        email: string;
        phone: string;
        role: string;
        lawyer_profile?: any;
      }

      const payload: CreateUserPayload = {
        full_name: newUser.full_name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      };

      if (newUser.role === 'lawyer') {
        payload.lawyer_profile = {
          ...newUser.lawyer_profile,
          consultation_fee: newUser.lawyer_profile.consultation_fee
            ? parseFloat(String(newUser.lawyer_profile.consultation_fee))
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
      showSnackbar('Tạo người dùng thành công', 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Tạo người dùng thất bại';
      showSnackbar(errorMessage, 'error');
      console.error('Failed to create user:', error);
    }
  };

  const handleCopyCredentials = () => {
    if (createdCredentials) {
      const text = `Email: ${createdCredentials.email}\nMật khẩu: ${createdCredentials.password}`;
      navigator.clipboard.writeText(text);
      showSnackbar('Đã sao chép thông tin đăng nhập vào clipboard!', 'success');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/admin')} aria-label="Quay lại">
            <ArrowBackOutlined />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VietJusticIA - Quản Lý Người Dùng
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonOutline />
              <Typography>{user?.full_name}</Typography>
            </Box>
            <IconButton color="inherit" onClick={handleLogout} aria-label="Đăng xuất">
              <LogoutOutlined />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5">Quản Lý Người Dùng</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                placeholder="Tìm kiếm theo tên, email..."
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
                Tạo Người Dùng
              </Button>
            </Box>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
            <Tabs value={roleFilter} onChange={handleRoleFilterChange}>
              <Tab label="Tất cả" value="all" />
              <Tab label="Người dùng" value="user" />
              <Tab label="Luật sư" value="lawyer" />
              <Tab label="Admin" value="admin" />
            </Tabs>
          </Box>

          <TableContainer sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      onClick={handleSortById}
                      role="button"
                      aria-label="Sắp xếp theo ID"
                    >
                      ID
                      {sortOrder === 'asc' ? (
                        <ArrowUpward fontSize="small" />
                      ) : (
                        <ArrowDownward fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>Tên</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Số điện thoại</TableCell>
                  <TableCell>Vai trò</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Đã xác thực</TableCell>
                  <TableCell align="center">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  // Loading Skeleton
                  Array.from(new Array(rowsPerPage)).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell><Skeleton width={40} /></TableCell>
                      <TableCell><Skeleton width={120} /></TableCell>
                      <TableCell><Skeleton width={180} /></TableCell>
                      <TableCell><Skeleton width={100} /></TableCell>
                      <TableCell><Skeleton width={80} /></TableCell>
                      <TableCell><Skeleton width={80} /></TableCell>
                      <TableCell><Skeleton width={40} /></TableCell>
                      <TableCell><Skeleton width={100} /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        Không tìm thấy người dùng nào.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>{u.full_name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.phone}</TableCell>
                      <TableCell>
                        <Chip label={u.role} size="small" color={getRoleColor(u.role)} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.is_active ? 'Hoạt động' : 'Vô hiệu'}
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
                          Xem Chi Tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalUsers}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Số hàng mỗi trang:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} trong số ${count}`}
          />
        </Paper>
      </Container>

      {/* User Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chi Tiết Người Dùng</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Họ và tên
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
                  Số điện thoại
                </Typography>
                <Typography variant="body1">{selectedUser.phone}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Vai trò
                </Typography>
                <Chip label={selectedUser.role} color={getRoleColor(selectedUser.role)} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Trạng thái
                </Typography>
                <Chip
                  label={selectedUser.is_active ? 'Hoạt động' : 'Không hoạt động'}
                  color={selectedUser.is_active ? 'success' : 'default'}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Đã xác thực
                </Typography>
                <Typography variant="body1">{selectedUser.is_verified ? 'Có' : 'Không'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Ngày tạo
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
              {selectedUser.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="md" fullWidth>
        <DialogTitle>Tạo Tài Khoản Người Dùng Mới</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Info */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Họ và tên"
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
                label="Số điện thoại"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                error={!!formErrors.phone}
                helperText={formErrors.phone}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Vai trò</InputLabel>
                <Select
                  value={newUser.role}
                  label="Vai trò"
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <MenuItem value="lawyer">Luật sư</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
                <FormHelperText>Mật khẩu sẽ được tự động tạo và hiển thị sau khi tạo tài khoản</FormHelperText>
              </FormControl>
            </Grid>

            {/* Lawyer Profile Fields - Only shown if role is lawyer */}
            {newUser.role === 'lawyer' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    Thông Tin Luật Sư
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Chuyên môn"
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
                    label="Số giấy phép hành nghề"
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
                    label="Số năm kinh nghiệm"
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
                    label="Thành phố"
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
                    label="Tỉnh/Thành phố"
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
                    label="Phí tư vấn (VNĐ)"
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
                    label="Ngôn ngữ"
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
                    label="Giới thiệu"
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
          <Button onClick={handleCloseCreateDialog}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateUser}>
            Tạo Người Dùng
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
        <DialogTitle>Tài Khoản Đã Được Tạo Thành Công</DialogTitle>
        <DialogContent>
          {createdCredentials && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Tài khoản {createdCredentials.role === 'lawyer' ? 'luật sư' : 'admin'} đã được tạo. Vui lòng chia sẻ thông tin đăng nhập này với người dùng:
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
                      Mật khẩu
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body1" 
                        sx={{ fontFamily: 'monospace', fontWeight: 'bold', flexGrow: 1 }}
                      >
                        {showPassword ? createdCredentials.password : '••••••••••••'}
                      </Typography>
                      <IconButton onClick={() => setShowPassword(!showPassword)} size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
              <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
                Quan trọng: Lưu thông tin đăng nhập ngay bây giờ. Mật khẩu không thể lấy lại sau này.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyCredentials} variant="outlined">
            Sao Chép Vào Clipboard
          </Button>
          <Button onClick={() => setCredentialsDialogOpen(false)} variant="contained">
            Hoàn Tất
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminUsersPage;