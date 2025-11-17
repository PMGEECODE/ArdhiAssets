import { create } from "zustand";
import axios from "axios";
import { type User, type LoginCredentials, UserRole } from "../types";
import { API_URL } from "../config/constants";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userPermissions: Record<string, any> | null;
  login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  checkAuthStatus: () => boolean;
  loadUserPermissions: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  userPermissions: null,

  login: async (credentials: LoginCredentials, rememberMe?: boolean) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);

      if (response.data.requires2FA) {
        sessionStorage.setItem("twoFAEmail", response.data.email);
        throw new Error("2FA_REQUIRED");
      }

      const { user, token } = response.data;
      const isAdmin = user.role === UserRole.ADMIN;

      set({
        user,
        token,
        isAuthenticated: true,
        isAdmin,
      });

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      await get().loadUserPermissions();
    } catch (error: any) {
      throw error;
    }
  },

  logout: () => {
    const logoutFromBackend = async () => {
      try {
        const { token } = get();
        if (token) {
          await axios.post(
            `${API_URL}/auth/logout`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        }
      } catch (error) {}
    };

    logoutFromBackend();

    delete axios.defaults.headers.common["Authorization"];

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      userPermissions: null,
    });
  },

  checkAuthStatus: () => {
    return false;
  },

  loadUserPermissions: async () => {
    try {
      const { token, user } = get();
      if (!token || !user) return;

      const response = await axios.get(`${API_URL}/permissions/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      set({
        userPermissions: response.data.permissions,
      });
    } catch (error) {}
  },
}));
