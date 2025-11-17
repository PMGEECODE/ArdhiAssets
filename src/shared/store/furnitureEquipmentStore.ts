// src/store/furnitureEquipmentStore.ts

import { create } from "zustand";
import axios from "axios";
import { API_URL } from "../config/constants";

// -------------------- Types --------------------
export interface FurnitureEquipment {
  id: string;
  asset_description: string;
  financed_by: string;
  serial_number: string;
  tag_number: string;
  make_model: string;
  pv_number?: string | null;
  original_location?: string | null;
  current_location?: string | null;
  responsible_officer?: string | null;
  delivery_installation_date?: string | null;
  replacement_date?: string | null;
  disposal_date?: string | null;
  purchase_amount: number;
  depreciation_rate?: number | null;
  annual_depreciation?: number | null;
  accumulated_depreciation?: number | null;
  net_book_value?: number | null;
  disposal_value?: number | null;
  asset_condition?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateFurnitureEquipmentData = Omit<
  FurnitureEquipment,
  "id" | "created_at" | "updated_at"
>;
export type UpdateFurnitureEquipmentData =
  Partial<CreateFurnitureEquipmentData>;

// -------------------- Store --------------------
interface FurnitureEquipmentStore {
  furnitureEquipments: FurnitureEquipment[];
  selectedFurnitureEquipment: FurnitureEquipment | null;
  isLoading: boolean;
  error: string | null;

  setSelectedFurnitureEquipment: (
    furnitureEquipment: FurnitureEquipment | null
  ) => void;
  fetchFurnitureEquipments: () => Promise<void>;
  getFurnitureEquipmentById: (id: string) => Promise<FurnitureEquipment | null>;
  createFurnitureEquipment: (
    data: CreateFurnitureEquipmentData
  ) => Promise<FurnitureEquipment>;
  updateFurnitureEquipment: (
    id: string,
    data: UpdateFurnitureEquipmentData
  ) => Promise<FurnitureEquipment>;
  deleteFurnitureEquipment: (id: string) => Promise<void>;
}

// -------------------- Store Implementation --------------------
export const useFurnitureEquipmentStore = create<FurnitureEquipmentStore>(
  (set) => ({
    furnitureEquipments: [],
    selectedFurnitureEquipment: null,
    isLoading: false,
    error: null,

    setSelectedFurnitureEquipment: (fe) =>
      set({ selectedFurnitureEquipment: fe }),

    fetchFurnitureEquipments: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await axios.get(`${API_URL}/furniture-equipment`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        set({ furnitureEquipments: response.data, isLoading: false });
      } catch (error: any) {
        set({
          error:
            error.response?.data?.detail ||
            error.message ||
            "An error occurred",
          isLoading: false,
        });
      }
    },

    getFurnitureEquipmentById: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await axios.get(
          `${API_URL}/furniture-equipment/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        set({ selectedFurnitureEquipment: response.data, isLoading: false });
        return response.data;
      } catch (error: any) {
        console.error("[v0] Error fetching furniture equipment by ID:", error);
        set({
          error:
            error.response?.data?.detail ||
            error.message ||
            "An error occurred",
          isLoading: false,
        });
        return null;
      }
    },

    createFurnitureEquipment: async (data) => {
      set({ isLoading: true, error: null });
      try {
        const cleanedData = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            value === "" ? null : value,
          ])
        );

        const response = await axios.post(
          `${API_URL}/furniture-equipment`,
          cleanedData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const newFE = response.data;
        set((state) => ({
          furnitureEquipments: [...state.furnitureEquipments, newFE],
          isLoading: false,
        }));
        return newFE;
      } catch (error: any) {
        set({
          error:
            error.response?.data?.detail ||
            error.message ||
            "An error occurred",
          isLoading: false,
        });
        throw error;
      }
    },

    updateFurnitureEquipment: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
        const cleanedData = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            value === "" ? null : value,
          ])
        );

        const response = await axios.put(
          `${API_URL}/furniture-equipment/${id}`,
          cleanedData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const updatedFE = response.data;
        set((state) => ({
          furnitureEquipments: state.furnitureEquipments.map((fe) =>
            fe.id === id ? updatedFE : fe
          ),
          selectedFurnitureEquipment:
            state.selectedFurnitureEquipment?.id === id
              ? updatedFE
              : state.selectedFurnitureEquipment,
          isLoading: false,
        }));
        return updatedFE;
      } catch (error: any) {
        set({
          error:
            error.response?.data?.detail ||
            error.message ||
            "An error occurred",
          isLoading: false,
        });
        throw error;
      }
    },

    deleteFurnitureEquipment: async (id) => {
      set({ isLoading: true, error: null });
      try {
        await axios.delete(`${API_URL}/furniture-equipment/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        set((state) => ({
          furnitureEquipments: state.furnitureEquipments.filter(
            (fe) => fe.id !== id
          ),
          selectedFurnitureEquipment:
            state.selectedFurnitureEquipment?.id === id
              ? null
              : state.selectedFurnitureEquipment,
          isLoading: false,
        }));
      } catch (error: any) {
        set({
          error:
            error.response?.data?.detail ||
            error.message ||
            "An error occurred",
          isLoading: false,
        });
        throw error;
      }
    },
  })
);
// ------------------------------------------------
