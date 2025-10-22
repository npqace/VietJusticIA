import api from '../api';
import * as SecureStore from 'expo-secure-store';

// Interface for the expected authentication response from the API
interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

// Interface for the expected response from contact update verification
interface ContactUpdateResponse {
  access_token?: string;
}

// Interface for login credentials
interface LoginCredentials {
  identifier: string;
  pwd: string;
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
 * Handles new user registration.
 * The backend will send an OTP and return a message, not tokens.
 * @param signupData - The data for the new user.
 * @returns The response data from the server.
 */
export const signup = async (signupData: SignupData) => {
  try {
    const response = await api.post('/api/v1/auth/signup', signupData);
    return response.data; // e.g., { message: "Signup successful..." }
  } catch (err: any) {
    throw err;
  }
};

/**
 * Handles user login.
 * @param credentials - The user's login credentials.
 * @returns The response data from the server, including tokens.
 */
export const login = async (credentials: LoginCredentials) => {
  try {
    const response = await api.post('/api/v1/auth/login', credentials);
    const { access_token, refresh_token } = response.data as AuthResponse;

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
 * Verifies the OTP and logs the user in by storing tokens.
 * @param email - The user's email.
 * @param otp - The 6-digit code.
 * @returns The response data from the server, including tokens.
 */
export const verifyOTP = async (email: string, otp: string) => {
    try {
        const response = await api.post('/api/v1/auth/verify-otp', { email, otp });
        const { access_token, refresh_token } = response.data as AuthResponse;

        if (access_token) {
            await SecureStore.setItemAsync('access_token', access_token);
            if (refresh_token) {
                await SecureStore.setItemAsync('refresh_token', refresh_token);
            }
            return response.data;
        } else {
            throw new Error('OTP verification failed.');
        }
    } catch (err: any) {
        throw err;
    }
};

/**
 * Requests a new OTP for a given email.
 * @param email - The user's email.
 * @returns The response data from the server.
 */
export const resendOTP = async (email: string) => {
    try {
        const response = await api.post('/api/v1/auth/resend-otp', { email });
        return response.data;
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

/**
 * Requests an update for the user's contact information.
 * @param data - The new contact information (email or phone).
 * @returns The response data from the server.
 */
export const requestContactUpdate = async (data: { email?: string; phone?: string }) => {
  try {
    const response = await api.post('/api/v1/users/me/update-contact', data);
    return response.data;
  } catch (err: any) {
    throw err;
  }
};

/**
 * Verifies the OTP for a contact information update.
 * @param data - The OTP and the new contact information.
 * @returns The response data from the server.
 */
export const verifyContactUpdate = async (data: { otp: string; email?: string; phone?: string }) => {
  try {
    const response = await api.post('/api/v1/users/me/verify-contact-update', data);
    if (response.data.access_token) {
      await SecureStore.setItemAsync('access_token', response.data.access_token);
    }
    return response.data;
  } catch (err: any) {
    throw err;
  }
};

/**
 * Sends a password reset request for the given email.
 * @param email - The user's email address.
 * @returns The response data from the server.
 */
export const forgotPassword = async (email: string) => {
  try {
    const response = await api.post('/api/v1/auth/forgot-password', { email });
    return response.data;
  } catch (err: any) {
    throw err;
  }
};

/**
 * Resets the user's password using the provided OTP.
 * @param data - The email, OTP, and new password.
 * @returns The response data from the server.
 */
export const resetPassword = async (data: { email: string; otp: string; new_password: string }) => {
  try {
    const response = await api.post('/api/v1/auth/reset-password', data);
    return response.data;
  } catch (err: any) {
    throw err;
  }
};

/**
 * Changes the user's password.
 * @param data - The current and new password.
 * @returns The response data from the server.
 */
export const changePassword = async (data: { current_password: string; new_password: string; confirm_new_password: string }) => {
  try {
    const response = await api.post('/api/v1/users/me/change-password', data);
    return response.data;
  } catch (err: any) {
    throw err;
  }
};