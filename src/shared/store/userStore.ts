// src/store/userStore.ts
import { create } from "zustand";
import axios from "axios";
import type { User, UserRole } from "../types";
import { API_URL } from "../config/constants";

// ✅ Global axios config
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_URL;

interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

interface UpdateUserPayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

interface ChangePasswordPayload {
  user_id: string; // ✅ UUID
  new_password: string;
}

interface UserState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  onlineUsers: string[]; // ✅ UUIDs
  fetchUsers: () => Promise<void>;
  createUser: (userData: CreateUserPayload) => Promise<void>;
  updateUser: (id: string, userData: UpdateUserPayload) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  activateUser: (id: string) => Promise<void>;
  deactivateUser: (id: string) => Promise<void>;
  fetchOnlineUsers: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,
  onlineUsers: [],

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get<User[]>("/users");
      set({ users: res.data, isLoading: false });
    } catch (err) {
      console.error("Failed to fetch users:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to fetch users",
        isLoading: false,
      });
    }
  },

  createUser: async (userData: CreateUserPayload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post<User>("/users", userData);
      set({ users: [...get().users, res.data], isLoading: false });
    } catch (err) {
      console.error("Failed to create user:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to create user",
        isLoading: false,
      });
      throw err;
    }
  },

  updateUser: async (id: string, userData: UpdateUserPayload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.put<User>(`/users/${id}`, userData);
      set({
        users: get().users.map((u) => (u.id === id ? res.data : u)),
        isLoading: false,
      });
    } catch (err) {
      console.error(`Failed to update user ${id}:`, err);
      set({
        error:
          err instanceof Error ? err.message : `Failed to update user ${id}`,
        isLoading: false,
      });
      throw err;
    }
  },

  deleteUser: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`/users/${id}`);
      set({
        users: get().users.filter((u) => u.id !== id),
        isLoading: false,
      });
    } catch (err) {
      console.error(`Failed to delete user ${id}:`, err);
      set({
        error:
          err instanceof Error ? err.message : `Failed to delete user ${id}`,
        isLoading: false,
      });
      throw err;
    }
  },

  changePassword: async ({ user_id, new_password }: ChangePasswordPayload) => {
    set({ isLoading: true, error: null });
    try {
      await axios.put(`/users/${user_id}/password`, { new_password });
      set({ isLoading: false });
    } catch (err) {
      console.error(`Failed to change password for user ${user_id}:`, err);
      set({
        error: err instanceof Error ? err.message : "Failed to change password",
        isLoading: false,
      });
      throw err;
    }
  },

  activateUser: async (id: string) => {
    await get().updateUser(id, { is_active: true });
  },

  deactivateUser: async (id: string) => {
    await get().updateUser(id, { is_active: false });
  },

  fetchOnlineUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get<string[]>("/users/online");
      set({ onlineUsers: res.data, isLoading: false });
    } catch (err) {
      console.error("Failed to fetch online users:", err);
      set({
        error:
          err instanceof Error ? err.message : "Failed to fetch online users",
        isLoading: false,
      });
    }
  },
}));
