import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, MFAVerification, AuthContextType } from '../types/auth';
import { api } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      try {
        const response = await api.refresh();
        api.setAccessToken(response.access_token);
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } catch (refreshError) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await api.login(credentials);

      if (response.requires_mfa) {
        return { requiresMFA: true };
      }

      api.setAccessToken(response.access_token);
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);

      return {};
    } catch (error) {
      throw error;
    }
  };

  const verifyMFA = async (data: MFAVerification) => {
    try {
      const response = await api.verifyMFA(data);
      api.setAccessToken(response.access_token);
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      api.setAccessToken(null);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await api.refresh();
      api.setAccessToken(response.access_token);
    } catch (error) {
      setUser(null);
      api.setAccessToken(null);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verifyMFA,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
