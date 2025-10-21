import axios from "axios";
import * as SecureStore from 'expo-secure-store';
import { API_URL } from "@env";

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add token to headers
api.interceptors.request.use(
  async (config: any): Promise<any> => {
    try {
      console.log(`[API] -> ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    } catch {}
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response: any) => {
    try {
      console.log(`[API] <- ${response.status} ${response.config.url}`, JSON.stringify(response.data).slice(0, 500));
    } catch {}
    return response;
  },
  async (error: any) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    try {
      const url = originalRequest?.url || '';
      console.log(`[API] xx ${status || 'ERR'} ${url}`, JSON.stringify(error?.response?.data || error?.message || {}).slice(0, 500));
    } catch {}
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        console.log('Attempting to refresh token with:', refreshToken);
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        const refreshResponse = await api.post<{access_token: string}>('/api/v1/auth/refresh', { refresh_token: refreshToken });
        const newAccessToken = refreshResponse.data?.access_token;
        if (newAccessToken) {
          console.log('Successfully refreshed token:', newAccessToken);
          await SecureStore.setItemAsync('access_token', newAccessToken);
          // Update header and retry original request
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        // fall through to logout
      }
      console.log('Logging out due to refresh failure.');
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      // TODO: Optionally trigger a navigation to Login screen from a global handler
    }
    return Promise.reject(error);
  }
);

export default api;