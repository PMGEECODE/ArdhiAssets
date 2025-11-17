//src/store/portableItemsStore.ts

import { create } from "zustand";
import axios from "axios";
import { API_URL } from "../config/constants";

// -------------------- Types --------------------
export interface PlantMachinery {
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

export type CreatePlantMachineryData = Omit<
  PlantMachinery,
  "id" | "created_at" | "updated_at"
>;
export type UpdatePlantMachineryData = Partial<CreatePlantMachineryData>;

// -------------------- Store --------------------
interface PlantMachineryStore {
  plantMachineries: PlantMachinery[];
  selectedPlantMachinery: PlantMachinery | null;
  isLoading: boolean;
  error: string | null;

  setSelectedPlantMachinery: (plantMachinery: PlantMachinery | null) => void;
  fetchPlantMachineries: () => Promise<void>;
  getPlantMachineryById: (id: string) => Promise<PlantMachinery | null>;
  createPlantMachinery: (
    data: CreatePlantMachineryData
  ) => Promise<PlantMachinery>;
  updatePlantMachinery: (
    id: string,
    data: UpdatePlantMachineryData
  ) => Promise<PlantMachinery>;
}

// -------------------- Store Implementation --------------------
export const usePlantMachineryStore = create<PlantMachineryStore>((set) => ({
  plantMachineries: [],
  selectedPlantMachinery: null,
  isLoading: false,
  error: null,

  setSelectedPlantMachinery: (pm) => set({ selectedPlantMachinery: pm }),

  fetchPlantMachineries: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/plant-machinery/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      set({ plantMachineries: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
    }
  },

  getPlantMachineryById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/plant-machinery/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      set({ selectedPlantMachinery: response.data, isLoading: false });
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

  createPlantMachinery: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/plant-machinery/`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const newPM = response.data;
      set((state) => ({
        plantMachineries: [...state.plantMachineries, newPM],
        isLoading: false,
      }));
      return newPM;
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  updatePlantMachinery: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(
        `${API_URL}/plant-machinery/${id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const updatedPM = response.data;
      set((state) => ({
        plantMachineries: state.plantMachineries.map((pm) =>
          pm.id === id ? updatedPM : pm
        ),
        selectedPlantMachinery:
          state.selectedPlantMachinery?.id === id
            ? updatedPM
            : state.selectedPlantMachinery,
        isLoading: false,
      }));
      return updatedPM;
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
