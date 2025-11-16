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
} from '@mui/material';
import {
  LogoutOutlined,
  PersonOutline,
  ArrowBackOutlined,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Lawyer } from '../types';

const AdminLawyersPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchLawyers();
  }, []);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/admin')}>
            <ArrowBackOutlined />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VietJusticIA - Quản Lý Luật Sư
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
            Danh Sách Luật Sư
          </Typography>

          {isLoading ? (
            <Typography sx={{ mt: 3 }}>Đang tải...</Typography>
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
                    <TableCell>Số giấy phép</TableCell>
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
                      <TableCell>{lawyer.bar_license_number}</TableCell>
                      <TableCell>{lawyer.years_of_experience} năm</TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewDetails(lawyer)}
                        >
                          Xem Chi Tiết
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
        <DialogTitle>Chi Tiết Luật Sư</DialogTitle>
        <DialogContent>
          {selectedLawyer && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Họ và tên
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
                  Số điện thoại
                </Typography>
                <Typography variant="body1">{selectedLawyer.phone}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Số giấy phép
                </Typography>
                <Typography variant="body1">{selectedLawyer.bar_license_number}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Số năm kinh nghiệm
                </Typography>
                <Typography variant="body1">{selectedLawyer.years_of_experience} năm</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phí tư vấn
                </Typography>
                <Typography variant="body1">{selectedLawyer.consultation_fee ? `${selectedLawyer.consultation_fee.toLocaleString('vi-VN')} VNĐ` : 'Chưa cập nhật'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Chuyên môn
                </Typography>
                <Typography variant="body1">{selectedLawyer.specialization}</Typography>
              </Grid>
              <Grid item xs={12}>
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
    </Box>
  );
};

export default AdminLawyersPage;
