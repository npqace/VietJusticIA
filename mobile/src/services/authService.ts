import api from '../api';
import * as SecureStore from 'expo-secure-store';

// Interface for the expected authentication response from the API
interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

// Interface for login credentials
interface LoginCredentials {
  identifier: string;
  password_val: string;
}

// Interface for signup data
interface SignupData {
  full_name: string;
  email: string;
  phone: string;
  pwd: string;
  confirm_pwd: string;
}

/**
 * Handles user login.
 * @param credentials - The user's login credentials.
 * @returns The response data from the server, including tokens.
 */
export const login = async ({ identifier, password_val }: LoginCredentials) => {
  try {
    const response = await api.post('/login', { identifier, pwd: password_val });
    const { access_token, refresh_token } = response.data as AuthResponse; // Type assertion

    if (access_token) {
      await SecureStore.setItemAsync('access_token', access_token);
      if (refresh_token) {
        await SecureStore.setItemAsync('refresh_token', refresh_token);
      }
      return response.data;
    } else {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    }
  } catch (err: any) {
    throw err;
  }
};

/**
 * Handles new user registration.
 * @param signupData - The data for the new user.
 * @returns The response data from the server, including tokens.
 */
export const signup = async (signupData: SignupData) => {
  try {
    const response = await api.post('/signup', signupData);
    const { access_token, refresh_token } = response.data as AuthResponse; // Type assertion

    if (access_token) {
      await SecureStore.setItemAsync('access_token', access_token);
      if (refresh_token) {
        await SecureStore.setItemAsync('refresh_token', refresh_token);
      }
      return response.data;
    } else {
      throw new Error('Đăng ký không thành công');
    }
  } catch (err: any) {
    throw err;
  }
};

/**
 * Handles user logout by clearing stored tokens.
 */
export const logout = async () => {
  try {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  } catch (err: any) {
    console.error("Could not clear auth tokens", err);
    throw err;
  }
};

/**
 * Retrieves the access token from secure storage.
 * @returns The access token, or null if not found.
 */
export const getAccessToken = async () => {
  try {
    return await SecureStore.getItemAsync('access_token');
  } catch (err) {
    console.error("Could not get access token", err);
    return null;
  }
};
