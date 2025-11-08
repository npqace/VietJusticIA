import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import LawyerDashboard from './pages/LawyerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLawyersPage from './pages/AdminLawyersPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminRequestsPage from './pages/AdminRequestsPage';
import LawyerConversationsPage from './pages/LawyerConversationsPage';

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2854A8',
    },
    secondary: {
      main: '#1976d2',
    },
  },
});

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'lawyer') {
      return <Navigate to="/lawyer" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Main App Routes
const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {/* Login Route */}
      <Route
        path="/login"
        element={!user ? <LoginPage /> : <Navigate to={getRoleBasedRedirect(user.role)} replace />}
      />

      {/* Lawyer Routes */}
      <Route
        path="/lawyer"
        element={
          <ProtectedRoute allowedRoles={['lawyer']}>
            <LawyerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lawyer/conversations"
        element={
          <ProtectedRoute allowedRoles={['lawyer']}>
            <LawyerConversationsPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/lawyers"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLawyersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminRequestsPage />
          </ProtectedRoute>
        }
      />

      {/* Root Route - Redirect based on role or to login */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={getRoleBasedRedirect(user.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Helper function to get redirect path based on role
const getRoleBasedRedirect = (role: string): string => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'lawyer':
      return '/lawyer';
    default:
      return '/login';
  }
};

// Main App Component
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
