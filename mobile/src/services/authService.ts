import api from '../api';
import { storage, STORAGE_KEYS } from '../utils/storage';
import axios from 'axios';

// --- Reusable Interfaces for API Responses ---

interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

interface MessageResponse {
  message: string;
}

interface ResetTokenResponse {
  reset_token: string;
  message: string;
}

interface ContactUpdateResponse {
  access_token?: string;
  message: string;
}

// --- Interfaces for Function Arguments ---

interface LoginCredentials {
  identifier: string;
  pwd: string;
}

interface SignupData {
  full_name: string;
  email: string;
  phone: string;
  pwd: string;
  confirm_pwd: string;
}

// --- Helper for Error Handling ---

const handleError = (err: unknown): never => {
  if (axios.isAxiosError(err) && err.response) {
    // Use the detailed error message from the backend if available
    throw new Error(err.response.data.detail || 'Đã có lỗi xảy ra.');
  }
  // Fallback for non-API errors
  throw err;
};


// --- Service Functions ---

export const signup = async (signupData: SignupData) => {
  try {
    const response = await api.post<MessageResponse>('/api/v1/auth/signup', signupData);
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const login = async (credentials: LoginCredentials) => {
  try {
    const response = await api.post<AuthResponse>('/api/v1/auth/login', credentials);
    const { access_token, refresh_token } = response.data;

    await storage.setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    if (refresh_token) {
      await storage.setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
    }
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const verifyOTP = async (email: string, otp: string) => {
  try {
    const response = await api.post<AuthResponse>('/api/v1/auth/verify-otp', { email, otp });
    const { access_token, refresh_token } = response.data;

    await storage.setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    if (refresh_token) {
      await storage.setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
    }
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const resendOTP = async (email: string) => {
  try {
    const response = await api.post<MessageResponse>('/api/v1/auth/resend-otp', { email });
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const logout = async () => {
  try {
    await storage.clearAuth();
  } catch (err) {
    console.error("Could not clear auth tokens", err);
    throw err;
  }
};

export const getAccessToken = async () => {
  try {
    return await storage.getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (err) {
    console.error("Could not get access token", err);
    return null;
  }
};

export const requestContactUpdate = async (data: { email?: string; phone?: string }) => {
  try {
    const response = await api.post<MessageResponse>('/api/v1/users/me/update-contact', data);
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const verifyContactUpdate = async (data: { otp: string; email?: string; phone?: string }) => {
  try {
    const response = await api.post<ContactUpdateResponse>('/api/v1/users/me/verify-contact-update', data);
    if (response.data.access_token) {
      await storage.setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.access_token);
    }
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const forgotPassword = async (email: string) => {
  try {
    const response = await api.post<MessageResponse>('/api/v1/password/forgot-password', { email });
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const verifyResetOTP = async (email: string, otp: string) => {
  try {
    const response = await api.post<ResetTokenResponse>('/api/v1/password/verify-reset-otp', { email, otp });
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const resendPasswordResetOTP = async (email: string) => {
  try {
    const response = await api.post<MessageResponse>('/api/v1/auth/resend-password-reset-otp', { email });
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const resetPassword = async (data: { token: string; new_password: string }) => {
  try {
    const response = await api.post<MessageResponse>('/api/v1/password/reset-password', data);
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const changePassword = async (data: { current_password: string; new_password: string; confirm_new_password: string }) => {
  try {
    const response = await api.post<MessageResponse>('/api/v1/users/me/change-password', data);
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const deactivateAccount = async () => {
  try {
    const response = await api.delete<MessageResponse>('/api/v1/users/me');
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const deleteAccount = async () => {
  try {
    const response = await api.delete<MessageResponse>('/api/v1/users/me/permanent');
    return response.data;
  } catch (err) {
    handleError(err);
  }
};