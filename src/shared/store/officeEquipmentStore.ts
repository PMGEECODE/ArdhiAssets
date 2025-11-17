// src/store/officeEquipmentStore.ts

import { create } from "zustand";
import axios from "axios";
import { API_URL } from "../config/constants";

// -------------------- Types --------------------
export interface OfficeEquipment {
  id: string;
  asset_description: string;
  financed_by: string;
  serial_number: string;
  tag_number: string;
  make_model: string;
  pv_number?: string;
  original_location?: string;
  current_location?: string;
  responsible_officer?: string;
  delivery_installation_date?: string;
  replacement_date?: string;
  disposal_date?: string;
  purchase_amount: number;
  depreciation_rate?: number;
  annual_depreciation?: number;
  accumulated_depreciation?: number;
  net_book_value?: number;
  disposal_value?: number;
  asset_condition?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export type CreateOfficeEquipmentData = Omit<
  OfficeEquipment,
  "id" | "created_at" | "updated_at"
>;
export type UpdateOfficeEquipmentData = Partial<CreateOfficeEquipmentData>;

// -------------------- Store --------------------
interface OfficeEquipmentStore {
  officeEquipment: OfficeEquipment[];
  selectedOfficeEquipment: OfficeEquipment | null;
  isLoading: boolean;
  error: string | null;

  setSelectedOfficeEquipment: (item: OfficeEquipment | null) => void;
  fetchOfficeEquipment: () => Promise<void>;
  getOfficeEquipmentById: (id: string) => Promise<OfficeEquipment | null>;
  createOfficeEquipment: (
    data: CreateOfficeEquipmentData
  ) => Promise<OfficeEquipment>;
  updateOfficeEquipment: (
    id: string,
    data: UpdateOfficeEquipmentData
  ) => Promise<OfficeEquipment>;
}

// -------------------- Store Implementation --------------------
export const useOfficeEquipmentStore = create<OfficeEquipmentStore>((set) => ({
  officeEquipment: [],
  selectedOfficeEquipment: null,
  isLoading: false,
  error: null,

  setSelectedOfficeEquipment: (item) => set({ selectedOfficeEquipment: item }),

  fetchOfficeEquipment: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/office-equipment/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      set({ officeEquipment: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
    }
  },

  getOfficeEquipmentById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/office-equipment/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      set({ selectedOfficeEquipment: response.data, isLoading: false });
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

  createOfficeEquipment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/office-equipment/`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const newItem = response.data;
      set((state) => ({
        officeEquipment: [...state.officeEquipment, newItem],
        isLoading: false,
      }));
      return newItem;
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  updateOfficeEquipment: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(
        `${API_URL}/office-equipment/${id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const updatedItem = response.data;
      set((state) => ({
        officeEquipment: state.officeEquipment.map((item) =>
          item.id === id ? updatedItem : item
        ),
        selectedOfficeEquipment:
          state.selectedOfficeEquipment?.id === id
            ? updatedItem
            : state.selectedOfficeEquipment,
        isLoading: false,
      }));
      return updatedItem;
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
