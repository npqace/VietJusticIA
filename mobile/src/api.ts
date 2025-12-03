import axios from "axios";
import { storage, STORAGE_KEYS } from './utils/storage';
import { API_URL } from "@env";

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add token to headers
api.interceptors.request.use(
  async (config: any): Promise<any> => {
    try {
      console.log(`[API] -> ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    } catch { }
    const token = await storage.getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
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
        const refreshToken = await storage.getSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          console.log('[AUTH] No refresh token available, silent logout');
          // Clear tokens silently
          await storage.clearAuth();
          // Return a silent rejection - AuthContext will handle navigation
          return Promise.reject({ silent: true, message: 'No refresh token' });
        }

        console.log('[AUTH] Attempting to refresh access token...');
        const { data } = await api.post('/api/v1/auth/refresh', { refresh_token: refreshToken });

        await storage.setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
        originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`;

        console.log('[AUTH] Token refreshed successfully');
        return api(originalRequest);
      } catch (refreshError) {
        console.log('[AUTH] Token refresh failed, silent logout');
        // Clear tokens silently without throwing visible error
        await storage.clearAuth();
        // Return silent rejection - AuthContext will navigate to Welcome screen
        return Promise.reject({ silent: true, message: 'Token refresh failed' });
      }
    }
    return Promise.reject(error);
  }
);

export default api;