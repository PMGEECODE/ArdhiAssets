import { create } from "zustand";
import axiosInstance from "../lib/axiosInstance";
import type { Building } from "../types/index";
import { API_URL } from "../config/constants";

export interface CreateBuildingData
  extends Omit<Building, "id" | "created_at" | "updated_at"> {
  support_files?: File[];
}

export interface UpdateBuildingData extends Partial<CreateBuildingData> {
  keep_existing_files?: boolean;
}

interface BuildingState {
  buildings: Building[];
  isLoading: boolean;
  error: string | null;
  selectedBuilding: Building | null;
  fetchBuildings: () => Promise<void>;
  fetchBuilding: (id: string) => Promise<Building>;
  createBuilding: (building: CreateBuildingData) => Promise<void>;
  updateBuilding: (id: string, building: UpdateBuildingData) => Promise<void>;
  deleteBuilding: (id: string) => Promise<void>;
  setSelectedBuilding: (building: Building | null) => void;
  checkBuildingNames: (names: string[]) => Promise<string[]>;
  uploadExcelData: (data: any[]) => Promise<void>;
}

export const useBuildingStore = create<BuildingState>((set, get) => ({
  buildings: [],
  isLoading: false,
  error: null,
  selectedBuilding: null,

  fetchBuildings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get<Building[]>(
        `${API_URL}/buildings/`
      );
      set({ buildings: response.data, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch buildings",
        isLoading: false,
      });
    }
  },

  fetchBuilding: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get<Building>(
        `${API_URL}/buildings/${id}/`
      );
      set({ selectedBuilding: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : `Failed to fetch building ${id}`,
        isLoading: false,
      });
      throw error;
    }
  },

  createBuilding: async (data: CreateBuildingData) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (key === "support_files") return;
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value));
        }
      });

      if (data.support_files && Array.isArray(data.support_files)) {
        data.support_files.forEach((file: File) => {
          if (file && file.size > 0) {
            formData.append("support_files", file);
          }
        });
      }

      const response = await axiosInstance.post<Building>(
        `${API_URL}/buildings/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const { buildings } = get();
      set({
        buildings: [...buildings, response.data],
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail ||
          error.message ||
          "Failed to create building",
        isLoading: false,
      });
      throw error;
    }
  },

  updateBuilding: async (id: string, data: UpdateBuildingData) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (key === "support_files") return;
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value));
        }
      });

      if (data.support_files && Array.isArray(data.support_files)) {
        data.support_files.forEach((file: File) => {
          if (file && file.size > 0) {
            formData.append("support_files", file);
          }
        });
      }

      if (data.keep_existing_files !== undefined) {
        formData.append(
          "keep_existing_files",
          String(data.keep_existing_files)
        );
      }

      const response = await axiosInstance.put<Building>(
        `${API_URL}/buildings/${id}/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const { buildings } = get();
      set({
        buildings: buildings.map((b) => (b.id === id ? response.data : b)),
        selectedBuilding: response.data,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail ||
          error.message ||
          `Failed to update building ${id}`,
        isLoading: false,
      });
      throw error;
    }
  },

  deleteBuilding: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`${API_URL}/buildings/${id}/`);
      const { buildings } = get();
      set({
        buildings: buildings.filter((b) => b.id !== id),
        selectedBuilding: null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : `Failed to delete building ${id}`,
        isLoading: false,
      });
      throw error;
    }
  },

  setSelectedBuilding: (building: Building | null) => {
    set({ selectedBuilding: building });
  },

  checkBuildingNames: async (names: string[]) => {
    try {
      const response = await axiosInstance.post(
        `${API_URL}/buildings/check-building-numbers/`,
        { building_numbers: names }
      );
      return response.data.existing_building_numbers || [];
    } catch (error) {
      throw error;
    }
  },

  uploadExcelData: async (data: any[]) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.post(`${API_URL}/buildings/upload-excel-data/`, {
        data,
      });
      const { fetchBuildings } = get();
      await fetchBuildings();
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload excel data",
        isLoading: false,
      });
      throw error;
    }
  },
}));
