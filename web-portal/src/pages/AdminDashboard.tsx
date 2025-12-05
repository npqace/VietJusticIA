import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  Skeleton,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  LogoutOutlined,
  PersonOutline,
  PeopleOutlined,
  GavelOutlined,
  AssignmentOutlined,
  DescriptionOutlined,
  AdminPanelSettingsOutlined,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Routes Constant
const ADMIN_ROUTES = {
  USERS: '/admin/users',
  LAWYERS: '/admin/lawyers',
  REQUESTS: '/admin/requests',
  DOCUMENTS: '/admin/documents',
  LOGIN: '/login',
};

interface DashboardStats {
  total_users: number;
  total_lawyers: number;
  total_admins: number;
  total_requests: number;
  total_documents: number;
}

interface DashboardCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  onClick: () => void;
  isLoading: boolean;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, onClick, isLoading }) => (
  <Card
    sx={{
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 4,
      },
      height: '100%',
    }}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onClick();
      }
    }}
    aria-label={`View details for ${title}`}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {icon}
        <Typography variant="h6">{title}</Typography>
      </Box>
      {isLoading ? (
        <Skeleton variant="rectangular" width={60} height={40} />
      ) : (
        <Typography variant="h3" component="div">
          {value}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_lawyers: 0,
    total_admins: 0,
    total_requests: 0,
    total_documents: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await api.get<DashboardStats>('/api/v1/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const handleLogout = () => {
    logout();
    navigate(ADMIN_ROUTES.LOGIN);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VietJusticIA - Bảng Điều Khiển Quản Trị
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
        <Grid container spacing={3}>
          {/* Users Card */}
          <Grid size={{ xs: 12, md: 3 }}>
            <DashboardCard
              title="Tổng Người Dùng"
              value={stats.total_users}
              icon={<PeopleOutlined color="primary" />}
              onClick={() => navigate(`${ADMIN_ROUTES.USERS}?role=user`)}
              isLoading={isLoading}
            />
          </Grid>

          {/* Lawyers Card */}
          <Grid size={{ xs: 12, md: 3 }}>
            <DashboardCard
              title="Tổng Luật Sư"
              value={stats.total_lawyers}
              icon={<GavelOutlined color="success" />}
              onClick={() => navigate(ADMIN_ROUTES.LAWYERS)}
              isLoading={isLoading}
            />
          </Grid>

          {/* Admins Card */}
          <Grid size={{ xs: 12, md: 3 }}>
            <DashboardCard
              title="Tổng Admin"
              value={stats.total_admins}
              icon={<AdminPanelSettingsOutlined color="warning" />}
              onClick={() => navigate(`${ADMIN_ROUTES.USERS}?role=admin`)}
              isLoading={isLoading}
            />
          </Grid>

          {/* Requests Card */}
          <Grid size={{ xs: 12, md: 3 }}>
            <DashboardCard
              title="Yêu Cầu"
              value={stats.total_requests}
              icon={<AssignmentOutlined color="info" />}
              onClick={() => navigate(ADMIN_ROUTES.REQUESTS)}
              isLoading={isLoading}
            />
          </Grid>

          {/* Document CMS Card */}
          <Grid size={{ xs: 12, md: 3 }}>
            <DashboardCard
              title="Quản Lý Văn Bản"
              value={stats.total_documents}
              icon={<DescriptionOutlined color="secondary" />}
              onClick={() => navigate(ADMIN_ROUTES.DOCUMENTS)}
              isLoading={isLoading}
            />
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDashboard;