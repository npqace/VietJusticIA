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
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  LogoutOutlined,
  PersonOutline,
  ArrowBackOutlined,
  RefreshOutlined,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Lawyer } from '../types';
import { ROUTES } from '../constants/routes';

/**
 * AdminLawyersPage Component
 *
 * Admin page for viewing and managing lawyers in the system.
 *
 * Features:
 * - Lawyers list table with key information
 * - Details modal showing comprehensive lawyer profile
 * - Read-only view (admin-managed accounts)
 * - Manual refresh capability
 * - Error handling with retry
 *
 * Backend API:
 * - GET /api/v1/lawyers - Fetch all lawyers
 *
 * @component
 */
const AdminLawyersPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    specialization: '',
    years_of_experience: 0,
    consultation_fee: 0,
    bar_license_number: '',
    bio: '',
    city: '',
    province: '',
  });

  useEffect(() => {
    fetchLawyers();
  }, []);

  /**
   * Fetches all lawyers from backend
   * Handles loading state and errors
   */
  const fetchLawyers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<Lawyer[]>('/api/v1/lawyers');
      setLawyers(response.data);
    } catch (err) {
      console.error('Failed to fetch lawyers:', err);
      setError('Không thể tải danh sách luật sư. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Opens details modal for selected lawyer
   *
   * @param {Lawyer} lawyer - Lawyer to view details for
   */
  const handleViewDetails = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setEditForm({
      full_name: lawyer.full_name,
      phone: lawyer.phone,
      specialization: lawyer.specialization,
      years_of_experience: lawyer.years_of_experience,
      consultation_fee: lawyer.consultation_fee || 0,
      bar_license_number: lawyer.bar_license_number,
      bio: lawyer.bio || '',
      city: lawyer.city || '',
      province: lawyer.province || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateLawyer = async () => {
    if (!selectedLawyer) return;

    try {
      await api.put(`/api/v1/admin/lawyers/${selectedLawyer.id}`, editForm);
      setEditDialogOpen(false);
      fetchLawyers(); // Refresh list
      // Show success message (optional)
    } catch (error) {
      console.error('Failed to update lawyer:', error);
      // Show error message
    }
  };

  const handleToggleStatus = async (lawyer: Lawyer) => {
    try {
      // Assuming lawyer object has user_id or we can get it. 
      // The Lawyer type definition might need update if user_id is missing.
      // Based on previous file view, Lawyer type has user_id.
      const newStatus = !lawyer.user?.is_active; // Check nested user object
      await api.patch(`/api/v1/admin/users/${lawyer.user_id}/status`, null, {
        params: { is_active: newStatus }
      });
      fetchLawyers();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  /**
   * Handles admin logout and navigation
   * Safely handles logout errors
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error('Logout failed:', error);
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}>
            <ArrowBackOutlined />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            VietJusticIA - Quản Lý Luật Sư
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonOutline />
              <Typography>{user?.full_name || 'Admin'}</Typography>
            </Box>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutOutlined />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">
              Danh Sách Luật Sư
            </Typography>
            <IconButton
              onClick={fetchLawyers}
              disabled={isLoading}
              aria-label="Refresh lawyers list"
              size="small"
            >
              <RefreshOutlined />
            </IconButton>
          </Box>

          {error ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="error" gutterBottom>
                {error}
              </Typography>
              <Button variant="contained" onClick={fetchLawyers} sx={{ mt: 2 }}>
                Thử lại
              </Button>
            </Box>
          ) : isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 3 }}>
              <CircularProgress />
            </Box>
          ) : lawyers.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 3 }}>
              Không tìm thấy luật sư.
            </Typography>
          ) : (
            <TableContainer sx={{ mt: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Tên</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Kinh nghiệm</TableCell>
                    <TableCell align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lawyers.map((lawyer) => (
                    <TableRow key={lawyer.id}>
                      <TableCell>{lawyer.id}</TableCell>
                      <TableCell>{lawyer.full_name}</TableCell>
                      <TableCell>{lawyer.email}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            backgroundColor: lawyer.user?.is_active ? '#e8f5e9' : '#ffebee',
                            color: lawyer.user?.is_active ? '#2e7d32' : '#c62828',
                            py: 0.5,
                            px: 1,
                            borderRadius: 1,
                            display: 'inline-block',
                            fontSize: '0.875rem',
                            fontWeight: 500
                          }}
                        >
                          {lawyer.user?.is_active ? 'Hoạt động' : 'Đã khóa'}
                        </Box>
                      </TableCell>
                      <TableCell>{lawyer.years_of_experience} năm</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleViewDetails(lawyer)}
                          >
                            Chi Tiết
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleOpenEditDialog(lawyer)}
                          >
                            Sửa
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color={lawyer.user?.is_active ? "error" : "success"}
                            onClick={() => handleToggleStatus(lawyer)}
                          >
                            {lawyer.user?.is_active ? 'Khóa' : 'Mở khóa'}
                          </Button>
                        </Box>
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
        <DialogTitle>Chi Tiết Luật Sư</DialogTitle>
        <DialogContent>
          {selectedLawyer && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Họ và tên
                </Typography>
                <Typography variant="body1">{selectedLawyer.full_name}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{selectedLawyer.email}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Số điện thoại
                </Typography>
                <Typography variant="body1">{selectedLawyer.phone}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Số giấy phép
                </Typography>
                <Typography variant="body1">{selectedLawyer.bar_license_number}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Số năm kinh nghiệm
                </Typography>
                <Typography variant="body1">{selectedLawyer.years_of_experience} năm</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phí tư vấn
                </Typography>
                <Typography variant="body1">{selectedLawyer.consultation_fee ? `${selectedLawyer.consultation_fee.toLocaleString('vi-VN')} VNĐ` : 'Chưa cập nhật'}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Chuyên môn
                </Typography>
                <Typography variant="body1">{selectedLawyer.specialization}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Giới thiệu
                </Typography>
                <Typography variant="body1">{selectedLawyer.bio || 'Chưa có thông tin'}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Lawyer Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Cập Nhật Thông Tin Luật Sư</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2">Họ và tên</Typography>
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2">Số điện thoại</Typography>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2">Chuyên môn</Typography>
              <input
                type="text"
                value={editForm.specialization}
                onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2">Kinh nghiệm (năm)</Typography>
              <input
                type="number"
                value={editForm.years_of_experience}
                onChange={(e) => setEditForm({ ...editForm, years_of_experience: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2">Phí tư vấn</Typography>
              <input
                type="number"
                value={editForm.consultation_fee}
                onChange={(e) => setEditForm({ ...editForm, consultation_fee: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleUpdateLawyer}>Lưu Thay Đổi</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminLawyersPage;
