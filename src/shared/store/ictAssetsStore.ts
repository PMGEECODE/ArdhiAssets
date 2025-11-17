// src/store/ictAssetsStore.ts

import { create } from "zustand";
import axiosInstance from "../lib/axiosInstance";

// -------------------- Types --------------------
export interface IctAsset {
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

export type CreateIctAssetData = Omit<
  IctAsset,
  "id" | "created_at" | "updated_at"
>;
export type UpdateIctAssetData = Partial<CreateIctAssetData>;

export interface IctAssetTransfer {
  id: string;
  ict_asset_id: string;
  previous_owner?: string;
  assigned_to: string;
  transfer_date: string;
  transfer_location?: string;
  location?: string;
  transfer_department?: string;
  transfer_room_or_floor?: string;
  transfer_reason?: string;
  created_at: string;
  updated_at: string;
}

// -------------------- Store --------------------
interface IctAssetsStore {
  ictAssets: IctAsset[];
  selectedIctAsset: IctAsset | null;
  transferHistory: IctAssetTransfer[];
  isLoading: boolean;
  isLoadingTransfers: boolean;
  error: string | null;

  setSelectedIctAsset: (asset: IctAsset | null) => void;
  fetchIctAssets: () => Promise<void>;
  getIctAssetById: (id: string) => Promise<IctAsset | null>;
  createIctAsset: (data: CreateIctAssetData) => Promise<IctAsset>;
  updateIctAsset: (id: string, data: UpdateIctAssetData) => Promise<IctAsset>;
  fetchTransferHistory: (assetId: string) => Promise<void>;
}

// -------------------- Store Implementation --------------------
export const useIctAssetsStore = create<IctAssetsStore>((set) => ({
  ictAssets: [],
  selectedIctAsset: null,
  transferHistory: [],
  isLoading: false,
  isLoadingTransfers: false,
  error: null,

  setSelectedIctAsset: (asset) => set({ selectedIctAsset: asset }),

  fetchIctAssets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/ict-assets/`);
      set({ ictAssets: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
    }
  },

  getIctAssetById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/ict-assets/${id}`);
      set({ selectedIctAsset: response.data, isLoading: false });
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

  createIctAsset: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.post(`/ict-assets/`, data);
      const newAsset = response.data;
      set((state) => ({
        ictAssets: [...state.ictAssets, newAsset],
        isLoading: false,
      }));
      return newAsset;
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  updateIctAsset: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.put(`/ict-assets/${id}`, data);
      const updatedAsset = response.data;
      set((state) => ({
        ictAssets: state.ictAssets.map((asset) =>
          asset.id === id ? updatedAsset : asset
        ),
        selectedIctAsset:
          state.selectedIctAsset?.id === id
            ? updatedAsset
            : state.selectedIctAsset,
        isLoading: false,
      }));
      return updatedAsset;
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail || error.message || "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  fetchTransferHistory: async (assetId: string) => {
    set({ isLoadingTransfers: true, error: null });
    try {
      const response = await axiosInstance.get(
        `/ict-assets/${assetId}/transfers`
      );
      set({ transferHistory: response.data, isLoadingTransfers: false });
    } catch (error: any) {
      set({
        error:
          error.response?.data?.detail ||
          error.message ||
          "Failed to load transfer history",
        isLoadingTransfers: false,
      });
    }
  },
}));
