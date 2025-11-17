//src store/settingsStore.ts

import { create } from "zustand";
import axios from "axios";
import { API_URL } from "../config/constants";

interface AccountSettings {
  full_name: string;
  email: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  device_alerts: boolean;
  security_alerts: boolean;
  maintenance_alerts: boolean;
}

interface SecuritySettings {
  two_factor_auth: boolean;
  session_timeout: number;
  password_expiration: number;
}

interface SettingsState {
  notificationSettings: NotificationSettings;
  securitySettings: SecuritySettings;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  updateSecuritySettings: (settings: SecuritySettings) => Promise<void>;
  updateAccountSettings: (settings: AccountSettings) => Promise<void>;
  changePassword: (
    current_password: string,
    new_password: string
  ) => Promise<void>;
  toggleTwoFactor: (enabled: boolean) => Promise<void>;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  notificationSettings: {
    email_notifications: true,
    device_alerts: true,
    security_alerts: true,
    maintenance_alerts: false,
  },
  securitySettings: {
    two_factor_auth: false,
    session_timeout: 30,
    password_expiration: 90,
  },
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/users/settings`);
      set({
        notificationSettings: response.data.notifications,
        securitySettings: response.data.security,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch settings",
        isLoading: false,
      });
    }
  },

  refreshSettings: async () => {
    await get().fetchSettings();
  },

  updateNotificationSettings: async (settings: NotificationSettings) => {
    set({ isLoading: true, error: null });
    try {
      await axios.put(`${API_URL}/users/settings/notifications`, settings);
      // Update local state immediately for real-time UI update
      set({
        notificationSettings: settings,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to update notification settings",
        isLoading: false,
      });
      throw error;
    }
  },

  updateSecuritySettings: async (settings: SecuritySettings) => {
    set({ isLoading: true, error: null });
    try {
      await axios.put(`${API_URL}/users/settings/security`, settings);
      // Update local state immediately for real-time UI update
      set({
        securitySettings: settings,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error("Failed to update security settings:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to update security settings",
        isLoading: false,
      });
      throw error;
    }
  },

  updateAccountSettings: async (settings: AccountSettings) => {
    set({ isLoading: true, error: null });
    try {
      await axios.put(`${API_URL}/users/settings/account`, settings);
      // Refresh settings to get updated data from backend
      await get().fetchSettings();
      set({ isLoading: false, error: null });
    } catch (error) {
      console.error("Failed to update account settings:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to update account settings",
        isLoading: false,
      });
      throw error;
    }
  },

  changePassword: async (current_password: string, new_password: string) => {
    set({ isLoading: true, error: null });
    try {
      await axios.put(`${API_URL}/users/password`, {
        current_password,
        new_password,
      });
      set({ isLoading: false });
    } catch (error) {
      console.error("Failed to change password:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to change password",
        isLoading: false,
      });
      throw error;
    }
  },

  toggleTwoFactor: async (enabled: boolean) => {
    set({ isLoading: true, error: null });
    try {
      await axios.put(`${API_URL}/users/2fa`, { enabled });
      set({
        securitySettings: {
          ...get().securitySettings,
          two_factor_auth: enabled,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to toggle 2FA:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to toggle 2FA",
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
