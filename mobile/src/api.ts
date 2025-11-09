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
  (response) => response,
  async (error) => {
    // --- Network Error Handling ---
    // If error.response is undefined, it's a network error (server unreachable)
    if (!error.response) {
      console.error('[API] Network Error Details:', {
        message: error.message,
        code: error.code,
        config: {
          baseURL: error.config?.baseURL,
          url: error.config?.url,
          method: error.config?.method
        }
      });
      console.error(
        '[API] Network Error: Could not connect to the server. ' +
        'Please check your network connection and ensure the server is running. ' +
        'If using a physical device, ensure it is on the same Wi-Fi network as the server and check for firewalls.'
      );
      // Reject with a custom error to prevent further processing
      return Promise.reject(new Error('Network error: Server is unreachable.'));
    }

    const originalRequest = error.config;
    
    // Prevent token refresh for auth endpoints (login, signup, etc.)
    if (error.response.status === 401 && originalRequest.url.includes('/auth/')) {
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) {
          console.log('No refresh token, logging out.');
          // It's better to delegate logout to the AuthContext to avoid circular dependencies
          // Instead, we'll just reject, and the UI can decide what to do.
          return Promise.reject(new Error('No refresh token'));
        }
        
        console.log('Attempting to refresh token with:', refreshToken);
        const { data } = await api.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
        
        await SecureStore.setItemAsync('access_token', data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
        originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        // If refresh fails, we should clear tokens and effectively log the user out.
        // This logic is often best handled in a central place like AuthContext.
        console.log('Logging out due to refresh failure.');
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // Here you might want to trigger a global logout state change.
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;