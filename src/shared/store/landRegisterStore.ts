// src/store/landRegisterStore.ts

import { create } from "zustand";
import axios from "axios";
import { API_URL } from "../config/constants";

export interface LandRegister {
  id: string;
  description_of_land: string;
  mode_of_acquisition?: string;
  category?: string;
  county?: string;
  sub_county?: string;
  division?: string;
  location?: string;
  sub_location?: string;
  nearest_town_location?: string;
  gps_coordinates?: string;
  polygon?: Record<string, string>;
  lr_certificate_no?: string;
  document_of_ownership?: string;
  proprietorship_details?: string;
  size_ha?: number;
  land_tenure?: string;
  acquisition_date?: string;
  registration_date?: string;
  disputed?: string;
  encumbrances?: string;
  planned_unplanned?: string;
  purpose_use_of_land?: string;
  surveyed?: string;
  acquisition_amount?: number;
  fair_value?: number;
  disposal_date?: string;
  disposal_value?: number;
  annual_rental_income?: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

interface LandRegisterStore {
  landRegisters: LandRegister[];
  selectedLandRegister: LandRegister | null;
  isLoading: boolean;
  error: string | null;

  setSelectedLandRegister: (lr: LandRegister | null) => void;
  fetchLandRegisters: () => Promise<void>;
  getLandRegisterById: (id: string) => Promise<LandRegister | null>;
  createLandRegister: (
    data: Omit<LandRegister, "id" | "created_at" | "updated_at">
  ) => Promise<LandRegister>;
  updateLandRegister: (
    id: string,
    data: Partial<LandRegister>
  ) => Promise<LandRegister>;
  deleteLandRegister: (id: string) => Promise<void>;
  uploadExcelData: (data: any[]) => Promise<void>;
}

export const useLandRegisterStore = create<LandRegisterStore>((set) => ({
  landRegisters: [],
  selectedLandRegister: null,
  isLoading: false,
  error: null,

  setSelectedLandRegister: (lr) => set({ selectedLandRegister: lr }),

  fetchLandRegisters: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/land-assets/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      set({ landRegisters: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
    }
  },

  getLandRegisterById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/land-assets/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      set({ isLoading: false, selectedLandRegister: response.data });
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

  createLandRegister: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/land-assets/`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const newLandRegister = response.data;
      set((state) => ({
        landRegisters: [...state.landRegisters, newLandRegister],
        isLoading: false,
      }));
      return newLandRegister;
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  updateLandRegister: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(`${API_URL}/land-assets/${id}`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const updatedLandRegister = response.data;
      set((state) => ({
        landRegisters: state.landRegisters.map((lr) =>
          lr.id === id ? updatedLandRegister : lr
        ),
        selectedLandRegister:
          state.selectedLandRegister?.id === id
            ? updatedLandRegister
            : state.selectedLandRegister,
        isLoading: false,
      }));
      return updatedLandRegister;
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  deleteLandRegister: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`${API_URL}/land-assets/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      set((state) => ({
        landRegisters: state.landRegisters.filter((lr) => lr.id !== id),
        selectedLandRegister:
          state.selectedLandRegister?.id === id
            ? null
            : state.selectedLandRegister,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  uploadExcelData: async (data: any[]) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(
        `${API_URL}/land-assets/upload-excel-data`,
        { data },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      set({ isLoading: false });
      return response.data;
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
