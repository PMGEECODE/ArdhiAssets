import { create } from "zustand";

interface AssetStats {
  total_assets: number;
  total_value: number;
  recent_additions: number;
  maintenance_due: number;
}

interface CategoryStats {
  devices: {
    total_devices: number;
    active_devices: number;
    inactive_devices: number;
    devices_by_type: Record<string, number>;
  };
  buildings: {
    total_buildings: number;
    total_construction_cost: number;
    total_fair_value: number;
    by_type: Record<string, number>;
  };
  vehicles: {
    total_vehicles: number;
    total_purchase_amount: number;
    total_net_book_value: number;
    by_make: Record<string, number>;
  };
  office_equipment: {
    total_equipment: number;
    total_purchase_amount: number;
    total_net_book_value: number;
    by_type: Record<string, number>;
  };
  furniture_equipment: {
    total_items: number;
    total_purchase_value: number;
    total_net_book_value: number;
  };
  land_assets: {
    total_assets: number;
    by_category: Record<string, number>;
    total_size: number;
    total_acquisition_value: number;
  };
  plant_machinery: {
    total_items: number;
    total_purchase_value: number;
    total_net_book_value: number;
  };
  portable_items: {
    total_items: number;
    total_purchase_value: number;
    total_net_book_value: number;
  };
}

interface DashboardStore {
  assetStats: AssetStats;
  categoryStats: CategoryStats | null;
  loading: boolean;
  error: string | null;
  fetchDashboardStats: () => Promise<void>;
}

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://10.241.18.55:3001";

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  assetStats: {
    total_assets: 0,
    total_value: 0,
    recent_additions: 0,
    maintenance_due: 0,
  },
  categoryStats: null,
  loading: false,
  error: null,

  fetchDashboardStats: async () => {
    set({ loading: true, error: null });

    try {
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch stats from all endpoints
      const [
        devicesRes,
        buildingsRes,
        vehiclesRes,
        officeEquipmentRes,
        furnitureRes,
        landAssetsRes,
        plantMachineryRes,
        portableItemsRes,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/devices/stats/summary`, { headers }),
        fetch(`${API_BASE_URL}/api/buildings/stats/summary`, { headers }),
        fetch(`${API_BASE_URL}/api/vehicles/stats/summary`, { headers }),
        fetch(`${API_BASE_URL}/api/office-equipment/stats/summary`, {
          headers,
        }),
        fetch(`${API_BASE_URL}/api/furniture-equipments/stats/summary`, {
          headers,
        }),
        fetch(`${API_BASE_URL}/api/land-assets/stats/summary`, { headers }),
        fetch(`${API_BASE_URL}/api/plant-machinery/stats/summary`, { headers }),
        fetch(`${API_BASE_URL}/api/portable-items/stats/summary`, { headers }),
      ]);

      const [
        devices,
        buildings,
        vehicles,
        office_equipment,
        furniture_equipment,
        land_assets,
        plant_machinery,
        portable_items,
      ] = await Promise.all([
        devicesRes.json(),
        buildingsRes.json(),
        vehiclesRes.json(),
        officeEquipmentRes.json(),
        furnitureRes.json(),
        landAssetsRes.json(),
        plantMachineryRes.json(),
        portableItemsRes.json(),
      ]);

      const categoryStats: CategoryStats = {
        devices,
        buildings,
        vehicles,
        office_equipment,
        furniture_equipment,
        land_assets,
        plant_machinery,
        portable_items,
      };

      // Calculate aggregate stats
      const totalAssets =
        devices.total_devices +
        buildings.total_buildings +
        vehicles.total_vehicles +
        office_equipment.total_equipment +
        furniture_equipment.total_items +
        land_assets.total_assets +
        plant_machinery.total_items +
        portable_items.total_items;

      const totalValue =
        (buildings.total_fair_value || 0) +
        (vehicles.total_net_book_value || 0) +
        (office_equipment.total_net_book_value || 0) +
        (furniture_equipment.total_net_book_value || 0) +
        (land_assets.total_acquisition_value || 0) +
        (plant_machinery.total_net_book_value || 0) +
        (portable_items.total_net_book_value || 0);

      set({
        categoryStats,
        assetStats: {
          total_assets: totalAssets,
          total_value: totalValue,
          recent_additions: 0, // Will be calculated from individual stores
          maintenance_due: devices.inactive_devices, // Use inactive devices as maintenance indicator
        },
        loading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch dashboard stats",
        loading: false,
      });
    }
  },
}));
