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
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
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

  const handleDeleteConsultation = async () => {
    if (!selectedConsultation) return;

    // Check if allowed to delete
    const allowedStatuses = ['pending', 'rejected'];
    if (!allowedStatuses.includes(selectedConsultation.status)) {
      alert(`Không thể xóa yêu cầu với trạng thái '${selectedConsultation.status}'. Chỉ có thể xóa yêu cầu ở trạng thái 'chờ xử lý' hoặc 'từ chối'.`);
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn yêu cầu tư vấn này? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      await api.delete(`/api/v1/consultations/${selectedConsultation.id}`);

      // Refresh data
      await fetchConsultationRequests();
      setConsultationDialogOpen(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Xóa yêu cầu tư vấn thất bại';
      alert(errorMessage);
      console.error('Failed to delete consultation request:', error);
    }
  };

  const handleDeleteHelpRequest = async () => {
    if (!selectedHelpRequest) return;

    // Check if allowed to delete
    const allowedStatuses = ['pending', 'closed'];
    if (!allowedStatuses.includes(selectedHelpRequest.status)) {
      alert(`Không thể xóa yêu cầu với trạng thái '${selectedHelpRequest.status}'. Chỉ có thể xóa yêu cầu ở trạng thái 'chờ xử lý' hoặc 'đã đóng'.`);
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn yêu cầu hỗ trợ này? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      await api.delete(`/api/v1/help-requests/${selectedHelpRequest.id}`);

      // Refresh data
      await fetchHelpRequests();
      setHelpDialogOpen(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Xóa yêu cầu hỗ trợ thất bại';
      alert(errorMessage);
      console.error('Failed to delete help request:', error);
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
            VietJusticIA - Tất Cả Yêu Cầu
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
            <Tab label={`Yêu Cầu Dịch Vụ (${serviceRequests.length})`} />
            <Tab label={`Yêu Cầu Tư Vấn (${consultationRequests.length})`} />
            <Tab label={`Yêu Cầu Hỗ Trợ (${helpRequests.length})`} />
          </Tabs>

          {/* Service Requests Tab */}
          {currentTab === 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Yêu Cầu Dịch Vụ (Người Dùng → Luật Sư Cụ Thể)
              </Typography>
              {isLoadingService ? (
                <Typography>Đang tải...</Typography>
              ) : serviceRequests.length === 0 ? (
                <Typography color="text.secondary">Không tìm thấy yêu cầu dịch vụ.</Typography>
              ) : (
                <TableContainer sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Người dùng</TableCell>
                        <TableCell>Luật sư</TableCell>
                        <TableCell>Tiêu đề</TableCell>
                        <TableCell>Trạng thái</TableCell>
                        <TableCell>Ngày tạo</TableCell>
                        <TableCell align="center">Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {serviceRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.id}</TableCell>
                          <TableCell>{request.user_name}</TableCell>
                          <TableCell>{request.lawyer_name || 'Chưa gán'}</TableCell>
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
                              Xem Chi Tiết
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
                Yêu Cầu Tư Vấn (Biểu Mẫu Tư Vấn Pháp Luật)
              </Typography>
              {isLoadingConsultation ? (
                <Typography>Đang tải...</Typography>
              ) : consultationRequests.length === 0 ? (
                <Typography color="text.secondary">Không tìm thấy yêu cầu tư vấn.</Typography>
              ) : (
                <TableContainer sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Tên</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Địa điểm</TableCell>
                        <TableCell>Mức độ ưu tiên</TableCell>
                        <TableCell>Trạng thái</TableCell>
                        <TableCell>Ngày tạo</TableCell>
                        <TableCell align="center">Thao tác</TableCell>
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
                              Quản Lý
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
                Yêu Cầu Hỗ Trợ (Biểu Mẫu Liên Hệ)
              </Typography>
              {isLoadingHelp ? (
                <Typography>Đang tải...</Typography>
              ) : helpRequests.length === 0 ? (
                <Typography color="text.secondary">Không tìm thấy yêu cầu hỗ trợ.</Typography>
              ) : (
                <TableContainer sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Tên</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Chủ đề</TableCell>
                        <TableCell>Trạng thái</TableCell>
                        <TableCell>Ngày tạo</TableCell>
                        <TableCell align="center">Thao tác</TableCell>
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
                              Quản Lý
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
        <DialogTitle>Chi Tiết Yêu Cầu Dịch Vụ</DialogTitle>
        <DialogContent>
          {selectedServiceRequest && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  ID Yêu cầu
                </Typography>
                <Typography variant="body1">{selectedServiceRequest.id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Trạng thái
                </Typography>
                <Chip
                  label={selectedServiceRequest.status}
                  color={getStatusColor(selectedServiceRequest.status) as any}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Người dùng
                </Typography>
                <Typography variant="body1">{selectedServiceRequest.user_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Luật sư
                </Typography>
                <Typography variant="body1">{selectedServiceRequest.lawyer_name || 'Chưa gán'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tiêu đề
                </Typography>
                <Typography variant="body1">{selectedServiceRequest.title}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Mô tả
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
                    Phản hồi của luật sư
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
                    Lý do từ chối
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
                  Ngày tạo
                </Typography>
                <Typography variant="body1">{formatDate(selectedServiceRequest.created_at)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Ngày cập nhật
                </Typography>
                <Typography variant="body1">{formatDate(selectedServiceRequest.updated_at)}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServiceDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Consultation Request Details Dialog */}
      <Dialog open={consultationDialogOpen} onClose={() => setConsultationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Chi Tiết Yêu Cầu Tư Vấn</DialogTitle>
        <DialogContent>
          {selectedConsultation && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  ID Yêu cầu
                </Typography>
                <Typography variant="body1">{selectedConsultation.id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Loại người dùng
                </Typography>
                <Chip label={selectedConsultation.user_id ? 'Người dùng đã đăng ký' : 'Khách'} size="small" />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Họ và tên
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
                  Số điện thoại
                </Typography>
                <Typography variant="body1">{selectedConsultation.phone}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Địa điểm
                </Typography>
                <Typography variant="body1">{selectedConsultation.district}, {selectedConsultation.province}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Nội dung yêu cầu
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
                  Quản Lý Admin
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={editStatus}
                    label="Trạng thái"
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <MenuItem value="pending">Chờ xử lý</MenuItem>
                    <MenuItem value="in_progress">Đang xử lý</MenuItem>
                    <MenuItem value="completed">Hoàn thành</MenuItem>
                    <MenuItem value="rejected">Từ chối</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Mức độ ưu tiên</InputLabel>
                  <Select
                    value={editPriority}
                    label="Mức độ ưu tiên"
                    onChange={(e) => setEditPriority(e.target.value)}
                  >
                    <MenuItem value="low">Thấp</MenuItem>
                    <MenuItem value="medium">Trung bình</MenuItem>
                    <MenuItem value="high">Cao</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Ghi chú Admin"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Thêm ghi chú về yêu cầu này..."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Ngày tạo
                </Typography>
                <Typography variant="body1">{formatDate(selectedConsultation.created_at)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Ngày cập nhật
                </Typography>
                <Typography variant="body1">{formatDate(selectedConsultation.updated_at)}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Box sx={{ flexGrow: 1 }}>
            {selectedConsultation && (selectedConsultation.status === 'pending' || selectedConsultation.status === 'rejected') && (
              <Button
                color="error"
                onClick={handleDeleteConsultation}
              >
                Xóa
              </Button>
            )}
          </Box>
          <Button onClick={() => setConsultationDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleUpdateConsultation}>
            Lưu Thay Đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Help Request Details Dialog */}
      <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Chi Tiết Yêu Cầu Hỗ Trợ</DialogTitle>
        <DialogContent>
          {selectedHelpRequest && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  ID Yêu cầu
                </Typography>
                <Typography variant="body1">{selectedHelpRequest.id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Loại người dùng
                </Typography>
                <Chip label={selectedHelpRequest.user_id ? 'Người dùng đã đăng ký' : 'Khách'} size="small" />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Họ và tên
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
                  Chủ đề
                </Typography>
                <Typography variant="body1">{selectedHelpRequest.subject}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Nội dung yêu cầu
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
                  Quản Lý Admin
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={editHelpStatus}
                    label="Trạng thái"
                    onChange={(e) => setEditHelpStatus(e.target.value)}
                  >
                    <MenuItem value="pending">Chờ xử lý</MenuItem>
                    <MenuItem value="in_progress">Đang xử lý</MenuItem>
                    <MenuItem value="resolved">Đã giải quyết</MenuItem>
                    <MenuItem value="closed">Đã đóng</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Ghi chú Admin"
                  value={editHelpNotes}
                  onChange={(e) => setEditHelpNotes(e.target.value)}
                  placeholder="Thêm ghi chú về yêu cầu này..."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Ngày tạo
                </Typography>
                <Typography variant="body1">{formatDate(selectedHelpRequest.created_at)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Ngày cập nhật
                </Typography>
                <Typography variant="body1">{formatDate(selectedHelpRequest.updated_at)}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Box sx={{ flexGrow: 1 }}>
            {selectedHelpRequest && (selectedHelpRequest.status === 'pending' || selectedHelpRequest.status === 'closed') && (
              <Button
                color="error"
                onClick={handleDeleteHelpRequest}
              >
                Xóa
              </Button>
            )}
          </Box>
          <Button onClick={() => setHelpDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleUpdateHelpRequest}>
            Lưu Thay Đổi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminRequestsPage;
