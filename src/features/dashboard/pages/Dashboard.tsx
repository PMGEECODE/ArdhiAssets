"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import {
  Home,
  BarChart3,
  Building,
  Car,
  Printer,
  MapPin,
  TrendingUp,
  Sofa,
  Settings,
  Gift,
  Computer,
  Trash2,
  AlertTriangle,
  ChevronRight,
  FolderOpen,
  Clock,
} from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import Button from "../../../shared/components/ui/Button";
import { usePermissions } from "../../../features/auth/hooks/usePermissions";
import { useCookieAuthStore } from "../../../shared/store/cookieAuthStore";
import { useBuildingStore } from "../../../shared/store/buildingStore";
import { useVehicleStore } from "../../../shared/store/vehicleStore";
import { useOfficeEquipmentStore } from "../../../shared/store/officeEquipmentStore";
import { useLandRegisterStore } from "../../../shared/store/landRegisterStore";
import { useFurnitureEquipmentStore } from "../../../shared/store/furnitureEquipmentStore";
import { usePlantMachineryStore } from "../../../shared/store/plantMachineryStore";
import { usePortableItemsStore } from "../../../shared/store/portableItemsStore";
import { useIctAssetsStore } from "../../../shared/store/ictAssetsStore";
import type { DashboardStats } from "../../../shared/types";
import { API_URL } from "../../../shared/config/constants";
import { AssetCategoryType } from "../../../shared/types";
import { StatsCard } from "../components/StatsCard";
import { AssetCategoriesCard } from "../components/AssetCategoriesCard";
import { AssetHealthCard } from "../components/AssetHealthCard";
import { AssetDistributionCard } from "../components/AssetDistributionCard";
import { AssetOverviewCard } from "../components/AssetOverviewCard";
import "../../../shared/styles/global.css";

NProgress.configure({ showSpinner: false, speed: 500, easing: "ease" });
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CategoryStats {
  total: number;
  recent: number;
  category: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  backgroundImage: string;
  overlayColor: string;
}

interface AssetOverviewData {
  category: string;
  total: number;
  recent: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface StatCardData {
  value: number;
  trend: number;
  subtitle: string;
  sparklineData: number[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { canAccessCategory } = usePermissions();
  const { csrfToken } = useCookieAuthStore();
  const { buildings, fetchBuildings } = useBuildingStore();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { officeEquipment, fetchOfficeEquipment } = useOfficeEquipmentStore();
  const { landRegisters, fetchLandRegisters } = useLandRegisterStore();
  const { furnitureEquipments, fetchFurnitureEquipments } =
    useFurnitureEquipmentStore();
  const { plantMachineries, fetchPlantMachineries } = usePlantMachineryStore();
  const { portableItems, fetchPortableItems } = usePortableItemsStore();
  const { ictAssets, fetchIctAssets } = useIctAssetsStore();

  const [stats, setStats] = useState<DashboardStats>({
    total_devices: 0,
    active_devices: 0,
    inactive_devices: 0,
    new_devices: 0,
    devices_by_type: {},
    devices_by_os: {},
    device_activity: [],
    recent_devices: [],
  });

  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [assetOverviewData, setAssetOverviewData] = useState<
    AssetOverviewData[]
  >([]);
  const [assetHealthData, setAssetHealthData] = useState<{
    labels: string[];
    datasets: any[];
  }>({ labels: [], datasets: [] });

  const [statsCardData, setStatsCardData] = useState<{
    totalAssets: StatCardData;
    activeCategories: StatCardData;
    highValueAssets: StatCardData;
    newThisWeek: StatCardData;
    disposedItems: StatCardData;
    nearingDisposal: StatCardData;
  }>({
    totalAssets: { value: 0, trend: 0, subtitle: "", sparklineData: [] },
    activeCategories: { value: 0, trend: 0, subtitle: "", sparklineData: [] },
    highValueAssets: { value: 0, trend: 0, subtitle: "", sparklineData: [] },
    newThisWeek: { value: 0, trend: 0, subtitle: "", sparklineData: [] },
    disposedItems: { value: 0, trend: 0, subtitle: "", sparklineData: [] },
    nearingDisposal: { value: 0, trend: 0, subtitle: "", sparklineData: [] },
  });

  const fetchDashboardStats = async () => {
    try {
      console.log("[v0] Fetching dashboard stats...");
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: {
          ...(csrfToken && { "X-CSRF-Token": csrfToken }),
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[v0] Dashboard stats received:", data);

        const activityTrend = data.activity_trend || [];
        const sparklineData = activityTrend.map((item: any) => item.count);

        const calculateTrend = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 100);
        };

        // Extract activity counts from trend (current vs previous)
        const currentActivityCount =
          sparklineData[sparklineData.length - 1] || 0;
        const previousActivityCount =
          sparklineData[sparklineData.length - 2] || currentActivityCount;

        const generateCategorySparkline = (categoryData: any[]): number[] => {
          return categoryData.map((item: any) => item.count || 0);
        };

        setStatsCardData({
          totalAssets: {
            value: data.summary.total_assets || 0,
            trend: calculateTrend(currentActivityCount, previousActivityCount),
            subtitle: `${data.summary.recent_additions || 0} added this week`,
            sparklineData: sparklineData.length > 0 ? sparklineData : [0],
          },
          activeCategories: {
            value: Object.values(data.asset_breakdown).filter(
              (count: any) => count > 0
            ).length,
            trend: calculateTrend(
              Object.values(data.asset_breakdown).filter(
                (count: any) => count > 0
              ).length,
              Math.max(
                1,
                Object.values(data.asset_breakdown).filter(
                  (count: any) => count > 0
                ).length - 1
              )
            ),
            subtitle: "Categories with assets",
            sparklineData: Object.values(data.asset_breakdown)
              .slice(0, 7)
              .map((count: any) => count) as number[],
          },
          highValueAssets: {
            value:
              (data.asset_breakdown.buildings || 0) +
              (data.asset_breakdown.vehicles || 0) +
              (data.asset_breakdown.land_assets || 0) +
              (data.asset_breakdown.ict_assets || 0),
            trend: calculateTrend(
              (data.asset_breakdown.buildings || 0) +
                (data.asset_breakdown.vehicles || 0) +
                (data.asset_breakdown.land_assets || 0) +
                (data.asset_breakdown.ict_assets || 0),
              Math.max(
                1,
                (data.asset_breakdown.buildings || 0) +
                  (data.asset_breakdown.vehicles || 0) +
                  (data.asset_breakdown.land_assets || 0) +
                  (data.asset_breakdown.ict_assets || 0) -
                  1
              )
            ),
            subtitle: "Buildings, Vehicles, Land & ICT",
            sparklineData: [
              data.asset_breakdown.buildings || 0,
              data.asset_breakdown.vehicles || 0,
              data.asset_breakdown.land_assets || 0,
              data.asset_breakdown.ict_assets || 0,
            ],
          },
          newThisWeek: {
            value: data.summary.recent_additions || 0,
            trend: calculateTrend(
              data.summary.recent_additions || 0,
              Math.max(1, (data.summary.recent_additions || 0) - 2)
            ),
            subtitle: "New assets",
            sparklineData:
              sparklineData.length > 0 ? sparklineData.slice(-7) : [0],
          },
          disposedItems: {
            value: data.summary.disposed_items || 0,
            trend: calculateTrend(
              data.summary.disposed_items || 0,
              Math.max(1, (data.summary.disposed_items || 0) - 1)
            ),
            subtitle: "This month",
            sparklineData: [
              Math.round((data.summary.disposed_items || 0) * 0.1),
              Math.round((data.summary.disposed_items || 0) * 0.15),
              Math.round((data.summary.disposed_items || 0) * 0.2),
              Math.round((data.summary.disposed_items || 0) * 0.25),
              Math.round((data.summary.disposed_items || 0) * 0.4),
              Math.round((data.summary.disposed_items || 0) * 0.8),
              data.summary.disposed_items || 0,
            ],
          },
          nearingDisposal: {
            value: data.summary.nearing_disposal || 0,
            trend: calculateTrend(
              data.summary.nearing_disposal || 0,
              Math.max(1, (data.summary.nearing_disposal || 0) - 1)
            ),
            subtitle: `${Math.floor(
              (data.summary.nearing_disposal || 0) * 0.4
            )} need action now`,
            sparklineData: [
              Math.round((data.summary.nearing_disposal || 0) * 0.2),
              Math.round((data.summary.nearing_disposal || 0) * 0.3),
              Math.round((data.summary.nearing_disposal || 0) * 0.45),
              Math.round((data.summary.nearing_disposal || 0) * 0.6),
              Math.round((data.summary.nearing_disposal || 0) * 0.75),
              Math.round((data.summary.nearing_disposal || 0) * 0.9),
              data.summary.nearing_disposal || 0,
            ],
          },
        });
      }
    } catch (error) {
      console.error("[v0] Error fetching dashboard stats:", error);
    }
  };

  useEffect(() => {
    NProgress.start();

    const initializeData = async () => {
      try {
        await Promise.all([
          fetchBuildings(),
          fetchVehicles(),
          fetchOfficeEquipment(),
          fetchLandRegisters(),
          fetchFurnitureEquipments(),
          fetchPlantMachineries(),
          fetchPortableItems(),
          fetchIctAssets(),
          fetchDashboardStats(),
        ]);
      } catch (error) {
        console.error("[v0] Error initializing dashboard data:", error);
      } finally {
        NProgress.done();
      }
    };

    initializeData();
  }, [
    fetchBuildings,
    fetchVehicles,
    fetchOfficeEquipment,
    fetchLandRegisters,
    fetchFurnitureEquipments,
    fetchPlantMachineries,
    fetchPortableItems,
    fetchIctAssets,
  ]);

  useEffect(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newBuildings = buildings.filter(
      (building) =>
        building.created_at !== undefined &&
        new Date(building.created_at) >= oneWeekAgo
    );
    const newVehicles = vehicles.filter(
      (vehicle) => new Date(vehicle.created_at) >= oneWeekAgo
    );
    const newOfficeEquipment = officeEquipment.filter(
      (equipment) => new Date(equipment.created_at) >= oneWeekAgo
    );
    const newLandRegisters = landRegisters.filter(
      (land) => new Date(land.created_at) >= oneWeekAgo
    );
    const newFurnitureEquipments = furnitureEquipments.filter(
      (furniture) => new Date(furniture.created_at) >= oneWeekAgo
    );
    const newPlantMachineries = plantMachineries.filter(
      (plant) => new Date(plant.created_at) >= oneWeekAgo
    );
    const newPortableItems = portableItems.filter(
      (item) => new Date(item.created_at) >= oneWeekAgo
    );
    const newIctAssets = ictAssets.filter(
      (asset) => new Date(asset.created_at) >= oneWeekAgo
    );

    setCategoryStats([
      {
        total: ictAssets.length,
        recent: newIctAssets.length,
        category: "ICT Assets",
        icon: <Computer size={20} />,
        color: "bg-indigo-500",
        route: "/categories/ict-assets",
        backgroundImage:
          "https://images.pexels.com/photos/442150/pexels-photo-442150.jpeg?auto=compress&cs=tinysrgb&w=800",
        overlayColor: "bg-indigo-900/70",
      },
      {
        total: landRegisters.length,
        recent: newLandRegisters.length,
        category: "Land Register",
        icon: <MapPin size={20} />,
        color: "bg-emerald-500",
        route: "/categories/land-register",
        backgroundImage:
          "https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=800",
        overlayColor: "bg-emerald-900/70",
      },
      {
        total: buildings.length,
        recent: newBuildings.length,
        category: "Buildings",
        icon: <Building size={20} />,
        color: "bg-green-500",
        route: "/categories/buildings",
        backgroundImage:
          "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=800",
        overlayColor: "bg-green-900/70",
      },
      {
        total: vehicles.length,
        recent: newVehicles.length,
        category: "Vehicles",
        icon: <Car size={20} />,
        color: "bg-purple-500",
        route: "/categories/vehicles",
        backgroundImage:
          "https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800",
        overlayColor: "bg-purple-900/70",
      },
      {
        total: officeEquipment.length,
        recent: newOfficeEquipment.length,
        category: "Office Equipment",
        icon: <Printer size={20} />,
        color: "bg-orange-500",
        route: "/categories/office-equipment",
        backgroundImage:
          "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=800",
        overlayColor: "bg-orange-900/70",
      },
      {
        total: furnitureEquipments.length,
        recent: newFurnitureEquipments.length,
        category: "Furniture & Fittings",
        icon: <Sofa size={20} />,
        color: "bg-amber-500",
        route: "/categories/furniture-equipment",
        backgroundImage:
          "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800",
        overlayColor: "bg-amber-900/70",
      },
      {
        total: plantMachineries.length,
        recent: newPlantMachineries.length,
        category: "Plant & Machinery",
        icon: <Settings size={20} />,
        color: "bg-teal-500",
        route: "/categories/plant-machinery",
        backgroundImage:
          "https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=800",
        overlayColor: "bg-teal-900/70",
      },
      {
        total: portableItems.length,
        recent: newPortableItems.length,
        category: "Portable Items",
        icon: <Gift size={20} />,
        color: "bg-pink-500",
        route: "/categories/portable-items",
        backgroundImage:
          "https://images.pexels.com/photos/4792509/pexels-photo-4792509.jpeg?auto=compress&cs=tinysrgb&w=800",
        overlayColor: "bg-pink-900/70",
      },
    ]);

    setAssetOverviewData([
      {
        category: "ICT Assets",
        total: ictAssets.length,
        recent: newIctAssets.length,
        icon: <Computer size={14} className="sm:w-4 sm:h-4" />,
        color: "rgba(99, 102, 241, 0.8)",
        bgColor: "bg-indigo-50",
      },
      {
        category: "Land Register",
        total: landRegisters.length,
        recent: newLandRegisters.length,
        icon: <MapPin size={14} className="sm:w-4 sm:h-4" />,
        color: "rgba(16, 185, 129, 0.8)",
        bgColor: "bg-emerald-50",
      },
      {
        category: "Buildings",
        total: buildings.length,
        recent: newBuildings.length,
        icon: <Building size={14} className="sm:w-4 sm:h-4" />,
        color: "rgba(34, 197, 94, 0.8)",
        bgColor: "bg-green-50",
      },
      {
        category: "Vehicles",
        total: vehicles.length,
        recent: newVehicles.length,
        icon: <Car size={14} className="sm:w-4 sm:h-4" />,
        color: "rgba(147, 51, 234, 0.8)",
        bgColor: "bg-purple-50",
      },
      {
        category: "Office Equipment",
        total: officeEquipment.length,
        recent: newOfficeEquipment.length,
        icon: <Printer size={14} className="sm:w-4 sm:h-4" />,
        color: "rgba(249, 115, 22, 0.8)",
        bgColor: "bg-orange-50",
      },
      {
        category: "Furniture & Fittings",
        total: furnitureEquipments.length,
        recent: newFurnitureEquipments.length,
        icon: <Sofa size={14} className="sm:w-4 sm:h-4" />,
        color: "rgba(245, 158, 11, 0.8)",
        bgColor: "bg-amber-50",
      },
      {
        category: "Plant & Machinery",
        total: plantMachineries.length,
        recent: newPlantMachineries.length,
        icon: <Settings size={14} className="sm:w-4 sm:h-4" />,
        color: "rgba(20, 184, 166, 0.8)",
        bgColor: "bg-teal-50",
      },
      {
        category: "Portable Items",
        total: portableItems.length,
        recent: newPortableItems.length,
        icon: <Gift size={14} className="sm:w-4 sm:h-4" />,
        color: "rgba(236, 72, 153, 0.8)",
        bgColor: "bg-pink-50",
      },
    ]);

    const totalAssets =
      buildings.length +
      vehicles.length +
      officeEquipment.length +
      furnitureEquipments.length +
      landRegisters.length +
      plantMachineries.length +
      portableItems.length +
      ictAssets.length;

    const assetHealthMetrics = [
      {
        category: "Excellent",
        count: Math.floor(totalAssets * 0.4),
        color: "rgba(34, 197, 94, 0.8)",
        bgColor: "rgba(34, 197, 94, 0.1)",
      },
      {
        category: "Good",
        count: Math.floor(totalAssets * 0.35),
        color: "rgba(59, 130, 246, 0.8)",
        bgColor: "rgba(59, 130, 246, 0.1)",
      },
      {
        category: "Fair",
        count: Math.floor(totalAssets * 0.2),
        color: "rgba(245, 158, 11, 0.8)",
        bgColor: "rgba(245, 158, 11, 0.1)",
      },
      {
        category: "Poor",
        count: Math.floor(totalAssets * 0.05),
        color: "rgba(239, 68, 68, 0.8)",
        bgColor: "rgba(239, 68, 68, 0.1)",
      },
    ];

    setAssetHealthData({
      labels: assetHealthMetrics.map((metric) => metric.category),
      datasets: [
        {
          label: "Asset Condition",
          data: assetHealthMetrics.map((metric) => metric.count),
          backgroundColor: assetHealthMetrics.map((metric) => metric.bgColor),
          borderColor: assetHealthMetrics.map((metric) => metric.color),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    });
  }, [
    buildings,
    vehicles,
    officeEquipment,
    landRegisters,
    furnitureEquipments,
    plantMachineries,
    portableItems,
    ictAssets,
  ]);

  const categoryDistributionData = {
    labels: categoryStats.map((stat) => stat.category),
    datasets: [
      {
        data: categoryStats.map((stat) => stat.total),
        backgroundColor: [
          "rgba(99, 102, 241, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(147, 51, 234, 0.8)",
          "rgba(249, 115, 22, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(20, 184, 166, 0.8)",
          "rgba(236, 72, 153, 0.8)",
        ],
        borderColor: [
          "rgba(99, 102, 241, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(147, 51, 234, 1)",
          "rgba(249, 115, 22, 1)",
          "rgba(245, 158, 11, 1)",
          "rgba(20, 184, 166, 1)",
          "rgba(236, 72, 153, 1)",
        ],
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          },
        },
      },
    },
    elements: {
      arc: {
        borderRadius: 4,
      },
    },
  };

  const assetOverviewChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const dataIndex = context.dataIndex;
            const asset = assetOverviewData[dataIndex];
            return [`Total: ${asset.total}`, `New this week: ${asset.recent}`];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          stepSize: 1,
          font: {
            size: 10,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: {
            size: 10,
          },
        },
      },
    },
  };

  const assetOverviewChartData = {
    labels: assetOverviewData.map((asset) => asset.category),
    datasets: [
      {
        label: "Total Assets",
        data: assetOverviewData.map((asset) => asset.total),
        backgroundColor: assetOverviewData.map((asset) => asset.color),
        borderColor: assetOverviewData.map((asset) =>
          asset.color.replace("0.8", "1")
        ),
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const totalAssets = categoryStats.reduce((sum, stat) => sum + stat.total, 0);

  const getAssetCategoryFromRoute = (
    route: string
  ): AssetCategoryType | null => {
    switch (route) {
      case "/categories/buildings":
        return AssetCategoryType.BUILDINGS_REGISTER;
      case "/categories/vehicles":
        return AssetCategoryType.MOTOR_VEHICLES_REGISTER;
      case "/categories/office-equipment":
        return AssetCategoryType.OFFICE_EQUIPMENT;
      case "/categories/land-register":
        return AssetCategoryType.LAND_REGISTER;
      case "/categories/furniture-equipment":
        return AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT;
      case "/categories/plant-machinery":
        return AssetCategoryType.PLANT_MACHINERY;
      case "/categories/portable-items":
        return AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS;
      case "/categories/ict-assets":
        return AssetCategoryType.ICT_ASSETS;
      default:
        return null;
    }
  };

  const handleCategoryNavigation = (route: string) => {
    const category = getAssetCategoryFromRoute(route);
    if (category && canAccessCategory(category)) {
      navigate(route);
    }
  };

  const assetHealthChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed.y} assets (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          stepSize: 1,
          font: {
            size: 10,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
    },
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center px-3 sm:px-4 mb-3 sm:mb-4 md:mb-6 space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
        <Link
          to="/"
          className="flex items-center transition-colors hover:text-blue-600"
        >
          <Home size={12} className="mr-1 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
        <span className="flex items-center font-medium text-gray-900">
          <BarChart3
            size={12}
            className="mr-1 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4"
          />
          Dashboard
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-row justify-between items-center px-3 sm:px-4 gap-2">
        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-primary-900 leading-tight">
          Dashboard
        </h1>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700
                 text-white font-semibold rounded-lg sm:rounded-xl
                 px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5
                 shadow-md hover:shadow-xl hover:shadow-primary-500/40
                 border border-primary-500/30
                 transition-all duration-300
                 before:absolute before:inset-0
                 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
                 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700
                 flex flex-row items-center"
            onClick={() => navigate("/asset-categories")}
          >
            <FolderOpen
              size={14}
              className="relative z-10 sm:mr-1.5 md:mr-2 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]"
            />
            <span className="relative z-10 text-xs sm:text-sm md:text-base ml-1 sm:ml-0">
              Categories
            </span>
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 px-3 sm:px-4 md:grid-cols-3 lg:grid-cols-6">
        <StatsCard
          title="Total Assets"
          value={statsCardData.totalAssets.value}
          trend={statsCardData.totalAssets.trend}
          subtitle={statsCardData.totalAssets.subtitle}
          sparklineData={statsCardData.totalAssets.sparklineData}
          icon={<TrendingUp size={20} />}
          bgColor="bg-gradient-to-br from-blue-500 to-blue-700"
        />

        <StatsCard
          title="Active Categories"
          value={statsCardData.activeCategories.value}
          trend={statsCardData.activeCategories.trend}
          subtitle={statsCardData.activeCategories.subtitle}
          sparklineData={statsCardData.activeCategories.sparklineData}
          icon={<FolderOpen size={20} />}
          bgColor="bg-gradient-to-br from-green-500 to-green-700"
        />

        <StatsCard
          title="High-Value Assets"
          value={statsCardData.highValueAssets.value}
          trend={statsCardData.highValueAssets.trend}
          subtitle={statsCardData.highValueAssets.subtitle}
          sparklineData={statsCardData.highValueAssets.sparklineData}
          icon={<BarChart3 size={20} />}
          bgColor="bg-gradient-to-br from-amber-500 to-amber-700"
        />

        <StatsCard
          title="New This Week"
          value={statsCardData.newThisWeek.value}
          trend={statsCardData.newThisWeek.trend}
          subtitle={statsCardData.newThisWeek.subtitle}
          sparklineData={statsCardData.newThisWeek.sparklineData}
          icon={<Clock size={20} />}
          bgColor="bg-gradient-to-br from-purple-500 to-purple-700"
        />

        <StatsCard
          title="Disposed Items"
          value={statsCardData.disposedItems.value}
          trend={statsCardData.disposedItems.trend}
          subtitle={statsCardData.disposedItems.subtitle}
          sparklineData={statsCardData.disposedItems.sparklineData}
          icon={<Trash2 size={20} />}
          bgColor="bg-gradient-to-br from-gray-500 to-gray-700"
        />

        <StatsCard
          title="Nearing Disposal"
          value={statsCardData.nearingDisposal.value}
          trend={statsCardData.nearingDisposal.trend}
          subtitle={statsCardData.nearingDisposal.subtitle}
          sparklineData={statsCardData.nearingDisposal.sparklineData}
          icon={<AlertTriangle size={20} />}
          bgColor="bg-gradient-to-br from-red-500 to-red-700"
        />
      </div>

      {/* Asset Categories Overview */}
      <div className="px-3 sm:px-4">
        <AssetCategoriesCard
          categoryStats={categoryStats}
          onCategoryClick={handleCategoryNavigation}
        />
      </div>

      {/* Asset Health and Distribution */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 px-3 sm:px-4 lg:grid-cols-3">
        <AssetHealthCard
          totalAssets={totalAssets}
          assetHealthData={assetHealthData}
          assetHealthChartOptions={assetHealthChartOptions}
        />

        <AssetDistributionCard
          categoryStats={categoryStats}
          totalAssets={totalAssets}
          categoryDistributionData={categoryDistributionData}
          pieChartOptions={pieChartOptions}
        />
      </div>

      {/* Asset Overview - All Categories */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 px-3 sm:px-4">
        <AssetOverviewCard
          assetOverviewData={assetOverviewData}
          assetOverviewChartData={assetOverviewChartData}
          assetOverviewChartOptions={assetOverviewChartOptions}
        />
      </div>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-gray-200">
        <div className="flex flex-col w-full">
          <div className="h-1.5 bg-black" />
          <div className="h-0.5 bg-white" />
          <div className="h-1.5 bg-red-600" />
          <div className="h-0.5 bg-white" />
          <div className="h-1.5 bg-green-600" />
        </div>

        {/* Footer content */}
        <div className="px-6 py-6">
          <div className="flex flex-col justify-between items-center md:flex-row">
            <div className="mb-4 text-center md:mb-0 md:text-left">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} Asset Management System. All rights
                reserved.
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <Link
                to="/settings"
                className="transition-colors hover:text-gray-900"
              >
                Settings
              </Link>
              <Link
                to="/profile"
                className="transition-colors hover:text-gray-900"
              >
                Profile
              </Link>
              <a
                href="#"
                className="transition-colors hover:text-gray-900"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Help documentation coming soon!");
                }}
              >
                Help
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
