// src/store/deviceStore.ts

import { create } from "zustand";
import axios from "axios";
import type { Device, DeviceTransfer } from "../types";
import { API_URL } from "../config/constants";

interface DeviceState {
  devices: Device[];
  isLoading: boolean;
  error: string | null;
  selectedDevice: Device | null;
  transferHistory: DeviceTransfer[];
  isLoadingTransfers: boolean;
  transferError: string | null;
  fetchDevices: () => Promise<void>;
  fetchDevice: (id: string) => Promise<Device>;
  createDevice: (device: Omit<Device, "id">) => Promise<void>;
  updateDevice: (id: string, device: Partial<Device>) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  setSelectedDevice: (device: Device | null) => void;
  fetchTransferHistory: (deviceId: string) => Promise<DeviceTransfer[]>;
  createTransfer: (
    deviceId: string,
    transferData: Omit<
      DeviceTransfer,
      "id" | "device_id" | "created_at" | "updated_at"
    >
  ) => Promise<void>;
  clearTransferHistory: () => void;
}

const getAuthToken = (): string | null => {
  try {
    const storedAuth = localStorage.getItem("auth-storage");
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth);
      return parsed?.state?.token || null;
    }
  } catch (err) {
    console.error("Failed to parse auth token:", err);
  }
  return null;
};

const getAxiosConfig = () => {
  const token = getAuthToken();
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  };
};

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  isLoading: false,
  error: null,
  selectedDevice: null,
  transferHistory: [],
  isLoadingTransfers: false,
  transferError: null,

  fetchDevices: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get<Device[]>(
        `${API_URL}/devices/`,
        getAxiosConfig()
      );
      set({ devices: response.data, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch devices",
        isLoading: false,
      });
    }
  },

  fetchDevice: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get<Device>(
        `${API_URL}/devices/${id}/`,
        getAxiosConfig()
      );
      set({ selectedDevice: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch device ${id}:`, error);
      set({
        error:
          error instanceof Error
            ? error.message
            : `Failed to fetch device ${id}`,
        isLoading: false,
      });
      throw error;
    }
  },

  createDevice: async (device: Omit<Device, "id">) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post<Device>(
        `${API_URL}/devices/`,
        device,
        getAxiosConfig()
      );
      const { devices } = get();
      set({ devices: [...devices, response.data], isLoading: false });
    } catch (error) {
      console.error("Failed to create device:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to create device",
        isLoading: false,
      });
      throw error;
    }
  },

  updateDevice: async (id: string, device: Partial<Device>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put<Device>(
        `${API_URL}/devices/${id}/`,
        device,
        getAxiosConfig()
      );
      const { devices } = get();
      set({
        devices: devices.map((d) => (String(d.id) === id ? response.data : d)),
        selectedDevice: response.data,
        isLoading: false,
      });
    } catch (error) {
      console.error(`Failed to update device ${id}:`, error);
      set({
        error:
          error instanceof Error
            ? error.message
            : `Failed to update device ${id}`,
        isLoading: false,
      });
      throw error;
    }
  },

  deleteDevice: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`${API_URL}/devices/${id}/`, getAxiosConfig());
      const { devices } = get();
      set({
        devices: devices.filter((d) => String(d.id) !== id),
        selectedDevice: null,
        isLoading: false,
      });
    } catch (error) {
      console.error(`Failed to delete device ${id}:`, error);
      set({
        error:
          error instanceof Error
            ? error.message
            : `Failed to delete device ${id}`,
        isLoading: false,
      });
      throw error;
    }
  },

  setSelectedDevice: (device: Device | null) => set({ selectedDevice: device }),

  fetchTransferHistory: async (deviceId: string) => {
    set({ isLoadingTransfers: true, transferError: null });
    try {
      const response = await axios.get<DeviceTransfer[]>(
        `${API_URL}/devices/${deviceId}/transfers/`,
        getAxiosConfig()
      );
      set({ transferHistory: response.data, isLoadingTransfers: false });
      return response.data;
    } catch (error) {
      console.error(
        `Failed to fetch transfer history for device ${deviceId}:`,
        error
      );
      set({
        transferError:
          error instanceof Error
            ? error.message
            : "Failed to fetch transfer history",
        isLoadingTransfers: false,
      });
      throw error;
    }
  },

  createTransfer: async (
    deviceId: string,
    transferData: Omit<
      DeviceTransfer,
      "id" | "device_id" | "created_at" | "updated_at"
    >
  ) => {
    set({ isLoadingTransfers: true, transferError: null });
    try {
      const payload = { ...transferData, device_id: deviceId };
      await axios.post(
        `${API_URL}/devices/${deviceId}/transfer/`,
        payload,
        getAxiosConfig()
      );
      await get().fetchTransferHistory(deviceId);
      await get().fetchDevice(deviceId);
      set({ isLoadingTransfers: false });
    } catch (error) {
      console.error(`Failed to create transfer for device ${deviceId}:`, error);
      set({
        transferError:
          error instanceof Error ? error.message : "Failed to create transfer",
        isLoadingTransfers: false,
      });
      throw error;
    }
  },

  clearTransferHistory: () =>
    set({
      transferHistory: [],
      transferError: null,
      isLoadingTransfers: false,
    }),
}));
