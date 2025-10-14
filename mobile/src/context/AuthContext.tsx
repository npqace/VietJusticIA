import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as authService from '../services/authService';
import api from '../api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any; // Replace 'any' with a proper User type later
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    // Set loading to true when we start a check
    setIsLoading(true);
    try {
      const token = await authService.getAccessToken();
      if (token) {
        const response = await api.get('/profile');
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        // Explicitly set to not authenticated if no token
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (e) {
      console.error('Auth check failed, user is not authenticated.', e);
      setIsAuthenticated(false);
      setUser(null);
      // If token is invalid or profile fetch fails, ensure tokens are cleared
      await authService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (credentials: any) => {
    // Perform login to get and store tokens
    await authService.login(credentials);
    // Re-run the auth check to update the context state
    await checkAuthStatus();
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, logout, checkAuthStatus }}>
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
