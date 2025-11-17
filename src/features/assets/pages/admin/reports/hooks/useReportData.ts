"use client";

import { useEffect, useCallback, useMemo, useRef } from "react";
import { useDeviceStore } from "../../../../../../shared/store/deviceStore";
import { useUserStore } from "../../../../../../shared/store/userStore";
import { useAuditStore } from "../../../../../../shared/store/auditStore";
import { useBuildingStore } from "../../../../../../shared/store/buildingStore";
import { useVehicleStore } from "../../../../../../shared/store/vehicleStore";
import { useOfficeEquipmentStore } from "../../../../../../shared/store/officeEquipmentStore";
import { useFurnitureEquipmentStore } from "../../../../../../shared/store/furnitureEquipmentStore";
import { usePlantMachineryStore } from "../../../../../../shared/store/plantMachineryStore";
import { useLandRegisterStore } from "../../../../../../shared/store/landRegisterStore";
import { usePortableItemsStore } from "../../../../../../shared/store/portableItemsStore";
import { useIctAssetsStore } from "../../../../../../shared/store/ictAssetsStore";
import type { ReportFilters, ReportStores } from "../types";

export const useReportData = () => {
  const deviceStore = useDeviceStore();
  const userStore = useUserStore();
  const auditStore = useAuditStore();
  const buildingStore = useBuildingStore();
  const vehicleStore = useVehicleStore();
  const officeEquipmentStore = useOfficeEquipmentStore();
  const furnitureStore = useFurnitureEquipmentStore();
  const plantMachineryStore = usePlantMachineryStore();
  const landRegisterStore = useLandRegisterStore();
  const portableItemsStore = usePortableItemsStore();
  const ictAssetsStore = useIctAssetsStore();

  const fetchedRef = useRef(false);

  // Fetch all data on mount - only once
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchDataStaggered = async () => {
      // Fetch critical data first
      await Promise.all([userStore.fetchUsers(), deviceStore.fetchDevices()]);

      // Then fetch other data in batches
      await Promise.all([
        auditStore.fetchAuditLogs(),
        buildingStore.fetchBuildings(),
        vehicleStore.fetchVehicles(),
      ]);

      await Promise.all([
        officeEquipmentStore.fetchOfficeEquipment(),
        furnitureStore.fetchFurnitureEquipments(),
        plantMachineryStore.fetchPlantMachineries(),
      ]);

      await Promise.all([
        landRegisterStore.fetchLandRegisters(),
        portableItemsStore.fetchPortableItems(),
        ictAssetsStore.fetchIctAssets(),
      ]);
    };

    fetchDataStaggered();
  }, []);

  // Get all stores data
  const stores: ReportStores = useMemo(
    () => ({
      users: userStore.users,
      devices: deviceStore.devices,
      buildings: buildingStore.buildings,
      vehicles: vehicleStore.vehicles,
      officeEquipment: officeEquipmentStore.officeEquipment,
      furnitureEquipment: furnitureStore.furnitureEquipments,
      plantMachinery: plantMachineryStore.plantMachineries,
      landRegister: landRegisterStore.landRegisters,
      portableItems: portableItemsStore.portableItems,
      ictAssets: ictAssetsStore.ictAssets,
      auditLogs: auditStore.auditLogs,
    }),
    [
      userStore.users,
      deviceStore.devices,
      buildingStore.buildings,
      vehicleStore.vehicles,
      officeEquipmentStore.officeEquipment,
      furnitureStore.furnitureEquipments,
      plantMachineryStore.plantMachineries,
      landRegisterStore.landRegisters,
      portableItemsStore.portableItems,
      ictAssetsStore.ictAssets,
      auditStore.auditLogs,
    ]
  );

  // Check if any store is loading
  const isLoading = useMemo(
    () =>
      deviceStore.isLoading ||
      userStore.isLoading ||
      auditStore.isLoading ||
      buildingStore.isLoading ||
      vehicleStore.isLoading ||
      officeEquipmentStore.isLoading ||
      furnitureStore.isLoading ||
      plantMachineryStore.isLoading ||
      landRegisterStore.isLoading ||
      portableItemsStore.isLoading ||
      ictAssetsStore.isLoading,
    [
      deviceStore.isLoading,
      userStore.isLoading,
      auditStore.isLoading,
      buildingStore.isLoading,
      vehicleStore.isLoading,
      officeEquipmentStore.isLoading,
      furnitureStore.isLoading,
      plantMachineryStore.isLoading,
      landRegisterStore.isLoading,
      portableItemsStore.isLoading,
      ictAssetsStore.isLoading,
    ]
  );

  // Get asset data by category
  const getAssetData = useCallback(
    (category: string) => {
      const categoryKey = category as keyof ReportStores;
      return stores[categoryKey] || [];
    },
    [stores]
  );

  // Filter data based on filters - optimized with early returns
  const getFilteredData = useCallback((data: any[], filters: ReportFilters) => {
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);
    endDate.setHours(23, 59, 59, 999); // Include entire end date

    return data.filter((item: any) => {
      // Date filter - early return
      const itemDate = new Date(item.created_at || item.timestamp);
      if (itemDate < startDate || itemDate > endDate) return false;

      // Status filter
      if (filters.status !== "all") {
        if (item.is_active !== undefined) {
          if (filters.status === "active" && !item.is_active) return false;
          if (filters.status === "inactive" && item.is_active) return false;
        } else if (item.last_seen !== undefined) {
          const isOnline =
            new Date(item.last_seen) >
            new Date(Date.now() - 24 * 60 * 60 * 1000);
          if (filters.status === "online" && !isOnline) return false;
          if (filters.status === "offline" && isOnline) return false;
        } else if (item.asset_condition) {
          if (
            filters.status !== "all" &&
            item.asset_condition.toLowerCase() !== filters.status.toLowerCase()
          )
            return false;
        }
      }

      // Location filter
      if (
        filters.location !== "all" &&
        item.current_location !== filters.location
      )
        return false;

      return true;
    });
  }, []);

  // Get unique locations from data
  const getUniqueLocations = useCallback((data: any[]) => {
    const locations = new Set<string>();
    data.forEach((item: any) => {
      if (item.current_location) locations.add(item.current_location);
    });
    return Array.from(locations).sort();
  }, []);

  return {
    stores,
    isLoading,
    getAssetData,
    getFilteredData,
    getUniqueLocations,
  };
};
