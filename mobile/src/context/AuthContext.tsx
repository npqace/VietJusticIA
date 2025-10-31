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
  onVerify: ((otp: string) => Promise<any>) | null;
  onResend: (() => Promise<any>) | null;
  onSuccess: (() => void) | null;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  showOtpModal: (
    email: string,
    onVerify: (otp: string) => Promise<any>,
    onResend: () => Promise<any>,
    onSuccess: () => void
  ) => void;
  hideOtpModal: () => void;
  handleOtpVerified: () => void;
  updateUser: (updatedUser: any) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOtpModalVisible, setOtpModalVisible] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [onVerify, setOnVerify] = useState<((otp: string) => Promise<any>) | null>(null);
  const [onResend, setOnResend] = useState<(() => Promise<any>) | null>(null);
  const [onSuccess, setOnSuccess] = useState<(() => void) | null>(null);

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
          // If user is not verified, show OTP modal for signup verification
          showOtpModal(
            userData.email,
            (otp) => authService.verifyOTP(userData.email, otp),
            () => authService.resendOTP(userData.email),
            handleOtpVerified
          );
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
      // A small delay to allow the navigator to mount before hiding the splash screen
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    }
  };

  const refreshUserData = async () => {
    try {
      const response = await api.get('/api/v1/users/me');
      setUser(response.data);
    } catch (error) {
      console.error("Failed to refresh user data", error);
      // If refreshing fails, it might mean the token is invalid, so we trigger a full re-check
      await checkAuthStatus();
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

  const showOtpModal = (
    email: string,
    verify: (otp: string) => Promise<any>,
    resend: () => Promise<any>,
    success: () => void
  ) => {
    setOtpEmail(email);
    setOnVerify(() => verify);
    setOnResend(() => resend);
    setOnSuccess(() => success);
    setOtpModalVisible(true);
  };

  const hideOtpModal = () => {
    setOtpModalVisible(false);
    setOtpEmail(null);
    setOnVerify(null);
    setOnResend(null);
    setOnSuccess(null);
  };

  const handleOtpVerified = () => {
    hideOtpModal();
    checkAuthStatus();
  };

  const updateUser = (updatedUser: any) => {
    setUser(updatedUser);
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
        onVerify,
        onResend,
        onSuccess,
        login,
        logout,
        checkAuthStatus,
        showOtpModal,
        hideOtpModal,
        handleOtpVerified,
        updateUser,
        refreshUserData,
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
