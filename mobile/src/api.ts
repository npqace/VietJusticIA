import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://10.0.2.2:8000",
});

// Request interceptor to add token to headers
api.interceptors.request.use(
  async (config: any): Promise<any> => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    if (error.response.status === 401) {
      await AsyncStorage.removeItem('access_token');
      // Redirect to login screen
    }
    return Promise.reject(error);
  }
);

export default api;