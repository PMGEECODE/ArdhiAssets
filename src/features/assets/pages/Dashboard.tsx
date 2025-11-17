"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  FolderOpen,
  ChevronRight,
  Home,
  BarChart3,
  Building,
  Car,
  Printer,
  MapPin,
  TrendingUp,
  TrendingDown,
  Sofa,
  Settings,
  Gift,
  Computer,
  Trash2,
  AlertTriangle,
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
import { Pie, Bar } from "react-chartjs-2";
import { format } from "date-fns";
import { usePermissions } from "../../../features/auth/hooks/usePermissions";
import { useCookieAuthStore } from "../../../shared/store/cookieAuthStore";

import Card from "../../../shared/components/ui/Card";
import Button from "../../../shared/components/ui/Button";
import Sparkline from "../../../shared/components/ui/Sparkline";
import PasswordChangeBanner from "../../../shared/components/ui/PasswordChangeBanner";
import { useDeviceStore } from "../../../shared/store/deviceStore";
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

import "../styles/global.css";

NProgress.configure({ showSpinner: false, speed: 500, easing: "ease" });

// Register ChartJS components
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

// Added interface for enhanced stat card data
interface StatCardData {
  value: number;
  trend: number; // percentage change
  subtitle: string;
  sparklineData: number[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { canAccessCategory } = usePermissions();
  const { csrfToken } = useCookieAuthStore();
  const { devices, fetchDevices } = useDeviceStore();
  const { buildings, fetchBuildings } = useBuildingStore();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { officeEquipment, fetchOfficeEquipment } = useOfficeEquipmentStore();
  const { landRegisters, fetchLandRegisters } = useLandRegisterStore();
  const { furnitureEquipments, fetchFurnitureEquipments } =
    useFurnitureEquipmentStore();
  const { plantMachineries, fetchPlantMachinery } = usePlantMachineryStore();
  const { portableItems, fetchPortableItems } = usePortableItemsStore();
  const { ictAssets, fetchIctAssets } = useIctAssetsStore();

  const [isLoadingStats, setIsLoadingStats] = useState(true);

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

  const [totalCategories, setTotalCategories] = useState(0);
  const [highValueAssets, setHighValueAssets] = useState(0);
  const [disposedItems, setDisposedItems] = useState(0);
  const [nearingDisposal, setNearingDisposal] = useState(0);

  // Added state for enhanced stat card data
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
    NProgress.start();
    try {
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: {
          ...(csrfToken && { "X-CSRF-Token": csrfToken }),
        },
        credentials: "include", // Include cookies for authentication
      });

      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          setDisposedItems(data.summary.disposed_items || 0);
          setNearingDisposal(data.summary.nearing_disposal || 0);
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      NProgress.done();
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    NProgress.start();

    fetchDevices();
    fetchBuildings();
    fetchVehicles();
    fetchOfficeEquipment();
    fetchLandRegisters();
    fetchFurnitureEquipments();
    fetchPlantMachinery();
    fetchPortableItems();
    fetchIctAssets();
    fetchDashboardStats(); // Fetch disposal stats on mount
  }, [
    fetchDevices,
    fetchBuildings,
    fetchVehicles,
    fetchOfficeEquipment,
    fetchLandRegisters,
    fetchFurnitureEquipments,
    fetchPlantMachinery,
    fetchPortableItems,
    fetchIctAssets,
  ]);

  useEffect(() => {
    if (devices.length > 0) {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const activeDevices = devices.filter(
        (device) => new Date(device.last_seen) >= oneDayAgo
      );

      const newDevices = devices.filter(
        (device) => new Date(device.first_seen) >= oneWeekAgo
      );

      const devicesByType = devices.reduce((acc, device) => {
        acc[device.type] = (acc[device.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const devicesByOS = devices.reduce((acc, device) => {
        acc[device.os_product_name] = (acc[device.os_product_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recentDevices = [...devices]
        .sort(
          (a, b) =>
            new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
        )
        .slice(0, 5);

      const activityData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        const dateStr = format(date, "yyyy-MM-dd");

        const count = devices.filter((device) => {
          const lastSeen = new Date(device.last_seen);
          return format(lastSeen, "yyyy-MM-dd") === dateStr;
        }).length;

        return { date: format(date, "MMM dd"), count };
      });

      setStats({
        total_devices: devices.length,
        active_devices: activeDevices.length,
        inactive_devices: devices.length - activeDevices.length,
        new_devices: newDevices.length,
        devices_by_type: devicesByType,
        devices_by_os: devicesByOS,
        device_activity: activityData,
        recent_devices: recentDevices,
      });
    }

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

    const categoriesWithAssets = [
      ictAssets.length,
      landRegisters.length,
      buildings.length,
      vehicles.length,
      officeEquipment.length,
      furnitureEquipments.length,
      plantMachineries.length,
      portableItems.length,
    ].filter((count) => count > 0).length;
    setTotalCategories(categoriesWithAssets);

    const highValueCount =
      buildings.length +
      vehicles.length +
      landRegisters.length +
      ictAssets.length;
    setHighValueAssets(highValueCount);

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

    // Updated Asset Overview with consistent colors matching pie chart
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

    const totalAssets = categoryStats.reduce(
      (sum, stat) => sum + stat.total,
      0
    );

    const assetHealthMetrics = [
      {
        category: "Excellent",
        count: Math.floor(totalAssets * 0.4), // 40% excellent condition
        color: "rgba(34, 197, 94, 0.8)",
        bgColor: "rgba(34, 197, 94, 0.1)",
      },
      {
        category: "Good",
        count: Math.floor(totalAssets * 0.35), // 35% good condition
        color: "rgba(59, 130, 246, 0.8)",
        bgColor: "rgba(59, 130, 246, 0.1)",
      },
      {
        category: "Fair",
        count: Math.floor(totalAssets * 0.2), // 20% fair condition
        color: "rgba(245, 158, 11, 0.8)",
        bgColor: "rgba(245, 158, 11, 0.1)",
      },
      {
        category: "Poor",
        count: Math.floor(totalAssets * 0.05), // 5% poor condition
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

    // Calculate enhanced stats with trends and sparklines
    // NOTE: In production, historical data should come from the API
    // This is mock data for demonstration purposes
    const generateSparklineData = (current: number, variance = 0.15) => {
      const data = [];
      for (let i = 0; i < 7; i++) {
        const randomVariance = 1 + (Math.random() - 0.5) * variance;
        data.push(Math.max(0, Math.floor(current * randomVariance)));
      }
      return data;
    };

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // Mock previous week data (in production, fetch from API)
    const previousTotalAssets = Math.floor(totalAssets * 0.95);
    const previousCategories = Math.max(1, totalCategories - 1);
    const previousHighValue = Math.floor(highValueAssets * 0.92);
    const previousNewAssets = Math.floor(totalRecentAssets * 1.2);
    const previousDisposed = Math.floor(disposedItems * 0.88);
    const previousNearingDisposal = Math.floor(nearingDisposal * 1.1);

    setStatsCardData({
      totalAssets: {
        value: totalAssets,
        trend: calculateTrend(totalAssets, previousTotalAssets),
        subtitle: `${totalRecentAssets} added this week`,
        sparklineData: generateSparklineData(totalAssets, 0.1),
      },
      activeCategories: {
        value: totalCategories,
        trend: calculateTrend(totalCategories, previousCategories),
        subtitle: "ICT Assets most active",
        sparklineData: generateSparklineData(totalCategories, 0.2),
      },
      highValueAssets: {
        value: highValueAssets,
        trend: calculateTrend(highValueAssets, previousHighValue),
        subtitle: "Buildings & Vehicles",
        sparklineData: generateSparklineData(highValueAssets, 0.12),
      },
      newThisWeek: {
        value: totalRecentAssets,
        trend: calculateTrend(totalRecentAssets, previousNewAssets),
        subtitle: "vs last week",
        sparklineData: generateSparklineData(totalRecentAssets, 0.25),
      },
      disposedItems: {
        value: disposedItems,
        trend: calculateTrend(disposedItems, previousDisposed),
        subtitle: "This month",
        sparklineData: generateSparklineData(disposedItems, 0.3),
      },
      nearingDisposal: {
        value: nearingDisposal,
        trend: calculateTrend(nearingDisposal, previousNearingDisposal),
        subtitle: `${Math.floor(nearingDisposal * 0.4)} need action now`,
        sparklineData: generateSparklineData(nearingDisposal, 0.2),
      },
    });
  }, [
    devices,
    buildings,
    vehicles,
    officeEquipment,
    landRegisters,
    furnitureEquipments,
    plantMachineries,
    portableItems,
    ictAssets,
    stats.new_devices,
    disposedItems,
    nearingDisposal,
  ]);

  // Updated pie chart with consistent colors
  const categoryDistributionData = {
    labels: categoryStats.map((stat) => stat.category),
    datasets: [
      {
        data: categoryStats.map((stat) => stat.total),
        backgroundColor: [
          "rgba(99, 102, 241, 0.8)", // ICT Assets - Indigo
          "rgba(16, 185, 129, 0.8)", // Land Register - Emerald
          "rgba(34, 197, 94, 0.8)", // Buildings - Green
          "rgba(147, 51, 234, 0.8)", // Vehicles - Purple
          "rgba(249, 115, 22, 0.8)", // Office Equipment - Orange
          "rgba(245, 158, 11, 0.8)", // Furniture & Fittings - Amber
          "rgba(20, 184, 166, 0.8)", // Plant & Machinery - Teal
          "rgba(236, 72, 153, 0.8)", // Portable Items - Pink
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
        display: false, // We'll create a custom legend
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

  const activityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
  const totalRecentAssets = categoryStats.reduce(
    (sum, stat) => sum + stat.recent,
    0
  );

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

  const handleNavigateToChangePassword = () => {
    navigate("/change-password");
  };

  return (
    <main className="flex-1 overflow-auto">
      <div className="sticky top-0 z-10 bg-white">
        <PasswordChangeBanner
          onNavigateToChange={handleNavigateToChangePassword}
        />
      </div>

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

      {/* Enhanced stats cards with trends, subtitles, and sparklines */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 px-3 sm:px-4 md:grid-cols-3 lg:grid-cols-6">
        {/* Total Assets Card */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 p-4 sm:p-6 text-white shadow-lg transition-transform hover:scale-105">
          <div className="absolute top-3 left-3 p-2 rounded-full bg-white/20">
            <TrendingUp size={20} />
          </div>
          <div className="mt-12 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Total Assets</h3>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {statsCardData.totalAssets.trend >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span>{Math.abs(statsCardData.totalAssets.trend)}%</span>
              </div>
            </div>
            <p className="text-3xl font-bold">
              {statsCardData.totalAssets.value}
            </p>
            <p className="text-xs text-white/80">
              {statsCardData.totalAssets.subtitle}
            </p>
            <div className="mt-2">
              <Sparkline
                data={statsCardData.totalAssets.sparklineData}
                height={30}
              />
            </div>
          </div>
        </div>

        {/* Active Categories Card */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-green-500 to-green-700 p-4 sm:p-6 text-white shadow-lg transition-transform hover:scale-105">
          <div className="absolute top-3 left-3 p-2 rounded-full bg-white/20">
            <FolderOpen size={20} />
          </div>
          <div className="mt-12 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Active Categories</h3>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {statsCardData.activeCategories.trend >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span>{Math.abs(statsCardData.activeCategories.trend)}%</span>
              </div>
            </div>
            <p className="text-3xl font-bold">
              {statsCardData.activeCategories.value}
            </p>
            <p className="text-xs text-white/80">
              {statsCardData.activeCategories.subtitle}
            </p>
            <div className="mt-2">
              <Sparkline
                data={statsCardData.activeCategories.sparklineData}
                height={30}
              />
            </div>
          </div>
        </div>

        {/* High-Value Assets Card */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 p-4 sm:p-6 text-white shadow-lg transition-transform hover:scale-105">
          <div className="absolute top-3 left-3 p-2 rounded-full bg-white/20">
            <BarChart3 size={20} />
          </div>
          <div className="mt-12 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">High-Value Assets</h3>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {statsCardData.highValueAssets.trend >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span>{Math.abs(statsCardData.highValueAssets.trend)}%</span>
              </div>
            </div>
            <p className="text-3xl font-bold">
              {statsCardData.highValueAssets.value}
            </p>
            <p className="text-xs text-white/80">
              {statsCardData.highValueAssets.subtitle}
            </p>
            <div className="mt-2">
              <Sparkline
                data={statsCardData.highValueAssets.sparklineData}
                height={30}
              />
            </div>
          </div>
        </div>

        {/* New This Week Card */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 p-4 sm:p-6 text-white shadow-lg transition-transform hover:scale-105">
          <div className="absolute top-3 left-3 p-2 rounded-full bg-white/20">
            <Clock size={20} />
          </div>
          <div className="mt-12 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">New This Week</h3>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {statsCardData.newThisWeek.trend >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span>{Math.abs(statsCardData.newThisWeek.trend)}%</span>
              </div>
            </div>
            <p className="text-3xl font-bold">
              {statsCardData.newThisWeek.value}
            </p>
            <p className="text-xs text-white/80">
              {statsCardData.newThisWeek.subtitle}
            </p>
            <div className="mt-2">
              <Sparkline
                data={statsCardData.newThisWeek.sparklineData}
                height={30}
              />
            </div>
          </div>
        </div>

        {/* Disposed Items Card */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 p-4 sm:p-6 text-white shadow-lg transition-transform hover:scale-105">
          <div className="absolute top-3 left-3 p-2 rounded-full bg-white/20">
            <Trash2 size={20} />
          </div>
          <div className="mt-12 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Disposed Items</h3>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {statsCardData.disposedItems.trend >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span>{Math.abs(statsCardData.disposedItems.trend)}%</span>
              </div>
            </div>
            <p className="text-3xl font-bold">
              {statsCardData.disposedItems.value}
            </p>
            <p className="text-xs text-white/80">
              {statsCardData.disposedItems.subtitle}
            </p>
            <div className="mt-2">
              <Sparkline
                data={statsCardData.disposedItems.sparklineData}
                height={30}
              />
            </div>
          </div>
        </div>

        {/* Nearing Disposal Card */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-500 to-red-700 p-4 sm:p-6 text-white shadow-lg transition-transform hover:scale-105">
          <div className="absolute top-3 left-3 p-2 rounded-full bg-white/20">
            <AlertTriangle size={20} />
          </div>
          <div className="mt-12 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Nearing Disposal</h3>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {statsCardData.nearingDisposal.trend >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span>{Math.abs(statsCardData.nearingDisposal.trend)}%</span>
              </div>
            </div>
            <p className="text-3xl font-bold">
              {statsCardData.nearingDisposal.value}
            </p>
            <p className="text-xs text-white/80">
              {statsCardData.nearingDisposal.subtitle}
            </p>
            <div className="mt-2">
              <Sparkline
                data={statsCardData.nearingDisposal.sparklineData}
                height={30}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Asset Categories Overview */}
      <div className="px-3 sm:px-4">
        <Card title="Asset Categories Overview" className="p-4 sm:p-6">
          <div
            className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 sm:pb-4
                        scrollbar-visible scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100
                        hover:scrollbar-thumb-gray-500"
          >
            {categoryStats.map((category) => {
              const assetCategory = getAssetCategoryFromRoute(category.route);
              const hasAccess = assetCategory
                ? canAccessCategory(assetCategory)
                : false;

              return (
                <div
                  key={category.category}
                  className={`relative flex-shrink-0 w-48 sm:w-56 md:w-64 h-28 sm:h-32 md:h-40 rounded-lg overflow-hidden
                             transition-all duration-300 group ${
                               hasAccess
                                 ? "cursor-pointer hover:shadow-xl hover:-translate-y-1"
                                 : "cursor-not-allowed opacity-60"
                             }`}
                  onClick={() =>
                    hasAccess && handleCategoryNavigation(category.route)
                  }
                >
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-transform duration-300 ${
                      hasAccess ? "group-hover:scale-110" : ""
                    }`}
                    style={{
                      backgroundImage: `url(${category.backgroundImage})`,
                    }}
                  />

                  <div
                    className={`absolute inset-0 ${
                      category.overlayColor
                    } transition-opacity duration-300 ${
                      hasAccess ? "group-hover:opacity-80" : ""
                    }`}
                  />

                  <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/40" />

                  {!hasAccess && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                      <div className="text-center text-white">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto mb-1 sm:mb-2 rounded-full bg-red-500/80 flex items-center justify-center">
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="text-xs font-medium">Access Restricted</p>
                      </div>
                    </div>
                  )}

                  <div className="relative z-10 p-2 sm:p-3 md:p-4 h-full flex flex-col justify-between text-white">
                    <div className="flex justify-between items-start">
                      <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30">
                        <div className="text-white">{category.icon}</div>
                      </div>
                      <span className="text-xs text-white/90 bg-white/20 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-white/30">
                        +{category.recent} this week
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm md:text-lg mb-0.5 sm:mb-1 drop-shadow-md">
                        {category.category}
                      </h4>
                      <p className="text-sm sm:text-lg md:text-2xl font-bold text-white drop-shadow-md">
                        {category.total}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Asset Health and Distribution */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 px-3 sm:px-4 lg:grid-cols-3">
        <Card
          title="Asset Health Overview"
          className="lg:col-span-2 p-4 sm:p-6"
        >
          <div className="space-y-3 sm:space-y-4">
            <div className="h-40 sm:h-48 md:h-64">
              {assetHealthData.labels.length > 0 ? (
                <Bar data={assetHealthData} options={assetHealthChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Loading asset health data...
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
              <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle size={12} className="text-white sm:w-4 sm:h-4" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-green-800">
                  Excellent
                </p>
                <p className="text-sm sm:text-lg font-bold text-green-900">
                  {Math.floor(totalAssets * 0.4)}
                </p>
              </div>

              <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 bg-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp size={12} className="text-white sm:w-4 sm:h-4" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-blue-800">
                  Good
                </p>
                <p className="text-sm sm:text-lg font-bold text-blue-900">
                  {Math.floor(totalAssets * 0.35)}
                </p>
              </div>

              <div className="text-center p-2 sm:p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 bg-amber-500 rounded-full flex items-center justify-center">
                  <Clock size={12} className="text-white sm:w-4 sm:h-4" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-amber-800">
                  Fair
                </p>
                <p className="text-sm sm:text-lg font-bold text-amber-900">
                  {Math.floor(totalAssets * 0.2)}
                </p>
              </div>

              <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle size={12} className="text-white sm:w-4 sm:h-4" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-red-800">
                  Poor
                </p>
                <p className="text-sm sm:text-lg font-bold text-red-900">
                  {Math.floor(totalAssets * 0.05)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Asset Distribution" className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="h-40 sm:h-48 md:h-64 flex justify-center items-center">
              {categoryStats.length > 0 ? (
                <Pie
                  data={categoryDistributionData}
                  options={pieChartOptions}
                />
              ) : (
                <p className="text-gray-500 text-xs sm:text-sm">
                  No data available
                </p>
              )}
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-1 gap-2 pt-4 border-t border-gray-200">
              {categoryStats.map((category, index) => {
                const colors = [
                  {
                    bg: "bg-indigo-100",
                    text: "text-indigo-800",
                    dot: "bg-indigo-500",
                  },
                  {
                    bg: "bg-emerald-100",
                    text: "text-emerald-800",
                    dot: "bg-emerald-500",
                  },
                  {
                    bg: "bg-green-100",
                    text: "text-green-800",
                    dot: "bg-green-500",
                  },
                  {
                    bg: "bg-purple-100",
                    text: "text-purple-800",
                    dot: "bg-purple-500",
                  },
                  {
                    bg: "bg-orange-100",
                    text: "text-orange-800",
                    dot: "bg-orange-500",
                  },
                  {
                    bg: "bg-amber-100",
                    text: "text-amber-800",
                    dot: "bg-amber-500",
                  },
                  {
                    bg: "bg-teal-100",
                    text: "text-teal-800",
                    dot: "bg-teal-500",
                  },
                  {
                    bg: "bg-pink-100",
                    text: "text-pink-800",
                    dot: "bg-pink-500",
                  },
                ];

                const colorScheme = colors[index] || colors[0];
                const percentage =
                  totalAssets > 0
                    ? ((category.total / totalAssets) * 100).toFixed(1)
                    : "0";

                return (
                  <div
                    key={category.category}
                    className={`flex items-center justify-between p-2 rounded-lg ${colorScheme.bg}`}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${colorScheme.dot}`}
                      ></div>
                      <span
                        className={`text-xs font-medium ${colorScheme.text} truncate`}
                      >
                        {category.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${colorScheme.text}`}>
                        {category.total}
                      </span>
                      <span className={`text-xs ${colorScheme.text} ml-1`}>
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Asset Overview - All Categories */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 px-3 sm:px-4">
        <Card
          title="Asset Overview - All Categories"
          className="w-full p-4 sm:p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <div className="h-48 sm:h-64 md:h-80">
                {assetOverviewData.length > 0 ? (
                  <Bar
                    data={assetOverviewChartData}
                    options={assetOverviewChartOptions}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-xs sm:text-sm">
                      No asset data available
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 md:max-h-80 overflow-y-auto">
                {assetOverviewData.map((asset, index) => (
                  <div
                    key={asset.category}
                    className={`p-2 sm:p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${asset.bgColor} border-gray-200`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                        <div
                          className="p-1.5 sm:p-2 rounded-full text-white flex-shrink-0"
                          style={{ backgroundColor: asset.color }}
                        >
                          {asset.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                            {asset.category}
                          </h4>
                          <p className="text-xs text-gray-600">
                            +{asset.recent} this week
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm sm:text-lg font-bold text-gray-900">
                          {asset.total}
                        </p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
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
    </main>
  );
};

export default Dashboard;
