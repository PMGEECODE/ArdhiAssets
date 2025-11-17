// src/store/vehicleStore.ts

import { create } from "zustand";
import axios from "axios";
import { API_URL } from "../config/constants";

// -------------------- Types --------------------
export interface Vehicle {
  id: string;
  registration_number: string;
  financed_by?: string;
  engine_number?: string;
  chassis_number?: string;
  tag_number?: string;
  make_model?: string;
  color?: string;
  year_of_purchase?: string;
  pv_number?: string;
  original_location?: string;
  current_location?: string;
  replacement_date?: string;
  amount?: number;
  depreciation_rate?: number;
  annual_depreciation?: number;
  accumulated_depreciation?: number;
  net_book_value?: number;
  date_of_disposal?: string;
  disposal_value?: number;
  responsible_officer?: string;
  asset_condition?: string;
  has_logbook?: string;
  notes?: string;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
}

export type CreateVehicleData = Omit<
  Vehicle,
  "id" | "created_at" | "updated_at"
> & {
  images?: File[];
};

export type UpdateVehicleData = Partial<CreateVehicleData> & {
  keep_existing_images?: boolean;
};

// -------------------- Store --------------------
interface VehicleStore {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;

  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  fetchVehicles: () => Promise<void>;
  getVehicleById: (id: string) => Promise<Vehicle | null>;
  createVehicle: (data: CreateVehicleData) => Promise<Vehicle>;
  updateVehicle: (id: string, data: UpdateVehicleData) => Promise<Vehicle>;
  checkRegistrationNumbers: (
    registration_numbers: string[]
  ) => Promise<string[]>;
  uploadExcelData: (data: any[]) => Promise<void>;
}

// -------------------- Store Implementation --------------------
export const useVehicleStore = create<VehicleStore>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  isLoading: false,
  error: null,

  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

  fetchVehicles: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/vehicles/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      set({ vehicles: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
    }
  },

  getVehicleById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/vehicles/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      set({ selectedVehicle: response.data, isLoading: false });
      return response.data;
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      return null;
    }
  },

  createVehicle: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (key === "images") {
          // Handle images separately
          return;
        }
        if (key === "keep_existing_images") {
          // This field is not needed for create
          return;
        }
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value));
        }
      });

      if (data.images && Array.isArray(data.images)) {
        data.images.forEach((file: File) => {
          if (file && file.size > 0) {
            formData.append("images", file);
          }
        });
      }

      console.log("[v0] Creating vehicle with FormData entries:");
      for (const [key, value] of formData.entries()) {
        console.log(
          `[v0] ${key}:`,
          value instanceof File ? `File: ${value.name}` : value
        );
      }

      const response = await axios.post(`${API_URL}/vehicles/`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      const newVehicle = response.data;
      set((state) => ({
        vehicles: [...state.vehicles, newVehicle],
        isLoading: false,
      }));
      return newVehicle;
    } catch (error: any) {
      console.log("[v0] Create vehicle error:", error.response?.data);
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  updateVehicle: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (key === "images") {
          // Handle images separately
          return;
        }
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value));
        }
      });

      if (data.images && Array.isArray(data.images)) {
        data.images.forEach((file: File) => {
          if (file && file.size > 0) {
            formData.append("images", file);
          }
        });
      }

      if (data.keep_existing_images !== undefined) {
        formData.append(
          "keep_existing_images",
          String(data.keep_existing_images)
        );
      }

      console.log("[v0] Updating vehicle with FormData entries:");
      for (const [key, value] of formData.entries()) {
        console.log(
          `[v0] ${key}:`,
          value instanceof File ? `File: ${value.name}` : value
        );
      }

      const response = await axios.put(`${API_URL}/vehicles/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      const updatedVehicle = response.data;
      set((state) => ({
        vehicles: state.vehicles.map((v) => (v.id === id ? updatedVehicle : v)),
        selectedVehicle:
          state.selectedVehicle?.id === id
            ? updatedVehicle
            : state.selectedVehicle,
        isLoading: false,
      }));
      return updatedVehicle;
    } catch (error: any) {
      console.log("[v0] Update vehicle error:", error.response?.data);
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  checkRegistrationNumbers: async (registration_numbers: string[]) => {
    try {
      const response = await axios.post(
        `${API_URL}/vehicles/check-registration-numbers`,
        { registration_numbers },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      return response.data.existing_registration_numbers || [];
    } catch (error: any) {
      throw error;
    }
  },

  uploadExcelData: async (data: any[]) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(
        `${API_URL}/vehicles/upload-excel-data`,
        { data },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      set({ isLoading: false });
      await get().fetchVehicles();
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },
}));
