// src/store/portableItemsStore.ts

import { create } from "zustand";
import axios from "axios";
import { API_URL } from "../config/constants";

// -------------------- Types --------------------
export interface PortableItem {
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
  disposal_value?: string;
  asset_condition?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export type CreatePortableItemData = Omit<
  PortableItem,
  "id" | "created_at" | "updated_at"
>;
export type UpdatePortableItemData = Partial<CreatePortableItemData>;

// -------------------- Store --------------------
interface PortableItemsStore {
  portableItems: PortableItem[];
  selectedPortableItem: PortableItem | null;
  isLoading: boolean;
  error: string | null;

  setSelectedPortableItem: (item: PortableItem | null) => void;
  fetchPortableItems: () => Promise<void>;
  getPortableItemById: (id: string) => Promise<PortableItem | null>;
  createPortableItem: (data: CreatePortableItemData) => Promise<PortableItem>;
  updatePortableItem: (
    id: string,
    data: UpdatePortableItemData
  ) => Promise<PortableItem>;
}

// -------------------- Store Implementation --------------------
export const usePortableItemsStore = create<PortableItemsStore>((set) => ({
  portableItems: [],
  selectedPortableItem: null,
  isLoading: false,
  error: null,

  setSelectedPortableItem: (item) => set({ selectedPortableItem: item }),

  fetchPortableItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/portable-items/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      set({ portableItems: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
    }
  },

  getPortableItemById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/portable-items/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      set({ selectedPortableItem: response.data, isLoading: false });
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

  createPortableItem: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/portable-items/`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const newItem = response.data;
      set((state) => ({
        portableItems: [...state.portableItems, newItem],
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

  updatePortableItem: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(
        `${API_URL}/portable-items/${id}`,
        data,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      const updatedItem = response.data;
      set((state) => ({
        portableItems: state.portableItems.map((item) =>
          item.id === id ? updatedItem : item
        ),
        selectedPortableItem:
          state.selectedPortableItem?.id === id
            ? updatedItem
            : state.selectedPortableItem,
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
