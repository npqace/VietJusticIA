import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as authService from '../services/authService';
import api from '../api';

interface AuthContextType {
  isAuthenticated: boolean;
  isVerified: boolean;
  user: any;
  isLoading: boolean;
  isOtpModalVisible: boolean;
  otpEmail: string | null;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  showOtpModal: (email: string) => void;
  hideOtpModal: () => void;
  handleOtpVerified: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOtpModalVisible, setOtpModalVisible] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const token = await authService.getAccessToken();
      if (token) {
        const response = await api.get('/api/v1/users/me');
        const userData = response.data;
        setUser(userData);
        if (userData.is_verified) {
          setIsAuthenticated(true);
          setIsVerified(true);
        } else {
          setIsAuthenticated(false);
          setIsVerified(false);
          setOtpEmail(userData.email);
          setOtpModalVisible(true);
        }
      } else {
        setIsAuthenticated(false);
        setIsVerified(false);
        setUser(null);
      }
    } catch (e) {
      console.error('Auth check failed, user is not authenticated.', e);
      setIsAuthenticated(false);
      setIsVerified(false);
      setUser(null);
      await authService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (credentials: any) => {
    await authService.login(credentials);
    await checkAuthStatus();
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setIsVerified(false);
  };

  const showOtpModal = (email: string) => {
    setOtpEmail(email);
    setOtpModalVisible(true);
  };

  const hideOtpModal = () => {
    setOtpModalVisible(false);
    setOtpEmail(null);
  };

  const handleOtpVerified = () => {
    hideOtpModal();
    checkAuthStatus();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isVerified,
        user,
        isLoading,
        isOtpModalVisible,
        otpEmail,
        login,
        logout,
        checkAuthStatus,
        showOtpModal,
        hideOtpModal,
        handleOtpVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
