import api from './api';
import { storage } from '../utils/storage';
import type { LoginRequest, LoginResponse, User } from '../types';

export const authService = {
  /**
   * Login user and store JWT tokens
   */
  login: async (identifier: string, password: string): Promise<LoginResponse> => {
    const payload: LoginRequest = {
      identifier,
      pwd: password,
    };

    const response = await api.post<LoginResponse>('/api/v1/auth/login', payload);
    const { access_token, refresh_token } = response.data;

    // Store tokens in localStorage
    storage.setTokens(access_token, refresh_token);

    return response.data;
  },

  /**
   * Logout user and clear tokens
   */
  logout: (): void => {
    storage.clearTokens();
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/api/v1/users/me');
    return response.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return storage.isAuthenticated();
  },
};
