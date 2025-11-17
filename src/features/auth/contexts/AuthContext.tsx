"use client";

import {
  createContext,
  useState,
  useEffect,
  useContext,
  type ReactNode,
} from "react";
import type {
  User,
  LoginCredentials,
  MFAVerification,
  AuthContextType,
} from "../types/auth";
import { api } from "../../../shared/services/api";
import { UserRole } from "../../../shared/types";
import { useCookieAuthStore } from "../../../shared/store/cookieAuthStore";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { loadUserPermissions } = useCookieAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  // ✅ This is the original working logic — fetches /me or refreshes tokens
  const checkAuth = async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);

      // Update store for global use (sidebar, etc.)
      useCookieAuthStore.setState({
        user: currentUser,
        isAuthenticated: true,
        isAdmin: currentUser?.role?.toLowerCase() === UserRole.ADMIN,
      });

      await loadUserPermissions();
    } catch {
      try {
        const refreshToken = api.getRefreshToken();
        if (refreshToken) {
          const response = await api.refresh();
          api.setAccessToken(response.access_token);
          if (response.refresh_token) {
            api.setRefreshToken(response.refresh_token);
          }

          const currentUser = await api.getCurrentUser();
          setUser(currentUser);

          useCookieAuthStore.setState({
            user: currentUser,
            isAuthenticated: true,
            isAdmin: currentUser?.role?.toLowerCase() === UserRole.ADMIN,
          });

          await loadUserPermissions();
        } else {
          setUser(null);
          useCookieAuthStore.setState({
            user: null,
            isAuthenticated: false,
            isAdmin: false,
          });
        }
      } catch {
        setUser(null);
        useCookieAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
        });
        api.setAccessToken(null);
        api.setRefreshToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    const response = await api.login(credentials);

    if (response.requires2FA) {
      return { requiresMFA: true, email: response.email };
    }

    api.setAccessToken(response.access_token || "");
    if (response.refresh_token) {
      api.setRefreshToken(response.refresh_token);
    }

    const currentUser = await api.getCurrentUser();
    setUser(currentUser);

    useCookieAuthStore.setState({
      user: currentUser,
      isAuthenticated: true,
      isAdmin: currentUser?.role?.toLowerCase() === UserRole.ADMIN,
    });

    await loadUserPermissions();
    return {};
  };

  const verifyMFA = async (data: MFAVerification) => {
    const response = await api.verifyMFA(data);
    api.setAccessToken(response.access_token);
    if (response.refresh_token) {
      api.setRefreshToken(response.refresh_token);
    }

    const currentUser = await api.getCurrentUser();
    setUser(currentUser);

    useCookieAuthStore.setState({
      user: currentUser,
      isAuthenticated: true,
      isAdmin: currentUser?.role?.toLowerCase() === UserRole.ADMIN,
    });

    await loadUserPermissions();
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      console.error("Logout error occurred");
    } finally {
      setUser(null);
      api.setAccessToken(null);
      api.setRefreshToken(null);
      useCookieAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isAdmin: false,
      });
    }
  };

  const refreshToken = async () => {
    try {
      const response = await api.refresh();
      api.setAccessToken(response.access_token);
      if (response.refresh_token) {
        api.setRefreshToken(response.refresh_token);
      }

      const currentUser = await api.getCurrentUser();
      setUser(currentUser);

      useCookieAuthStore.setState({
        user: currentUser,
        isAuthenticated: true,
        isAdmin: currentUser?.role?.toLowerCase() === UserRole.ADMIN,
      });

      await loadUserPermissions();
    } catch {
      setUser(null);
      api.setAccessToken(null);
      api.setRefreshToken(null);
      useCookieAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isAdmin: false,
      });
      throw new Error("Token refresh failed");
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
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
