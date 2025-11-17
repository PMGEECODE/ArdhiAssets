// src/store/auditStore.ts

import { create } from "zustand";
import axios from "axios";
import { API_URL } from "../config/constants";

// -------------------- Types --------------------
export interface AuditLogBase {
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  role?: string | null;
  status?: string;
  event_category?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
}

export interface AuditLogResponse extends AuditLogBase {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  username?: string | null;
  timestamp: string;
  timestamp_display: string;
}

export type AuditLog = AuditLogResponse;

export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  entity_type?: string;
  status?: string;
  event_category?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// -------------------- Store --------------------
interface AuditState {
  auditLogs: AuditLog[];
  isLoading: boolean;
  error: string | null;

  fetchAuditLogs: (filters?: AuditLogFilters) => Promise<void>;
  fetchUserActivity: (userId: string) => Promise<AuditLog[]>;
  exportAuditLogs: (format: "csv" | "pdf") => Promise<Blob>;
}

export const useAuditStore = create<AuditState>((set) => ({
  auditLogs: [],
  isLoading: false,
  error: null,

  fetchAuditLogs: async (filters?: AuditLogFilters) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const url = `${API_URL}/audit-logs${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await axios.get<AuditLog[]>(url);

      set({ auditLogs: response.data, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch audit logs",
        isLoading: false,
      });
    }
  },

  fetchUserActivity: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get<AuditLog[]>(
        `${API_URL}/audit-logs/user/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch activity for user ${userId}:`, error);
      set({
        error:
          error instanceof Error
            ? error.message
            : `Failed to fetch user activity`,
        isLoading: false,
      });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  exportAuditLogs: async (format: "csv" | "pdf") => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(
        `${API_URL}/audit-logs/export/${format}`,
        {
          responseType: "blob",
        }
      );
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      console.error(`Failed to export audit logs:`, error);
      set({
        error:
          error instanceof Error
            ? error.message
            : `Failed to export audit logs`,
        isLoading: false,
      });
      throw error;
    }
  },
}));
