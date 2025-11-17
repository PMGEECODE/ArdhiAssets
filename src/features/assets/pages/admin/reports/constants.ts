import {
  Users,
  Server,
  Activity,
  Building,
  Car,
  Monitor,
  Sofa,
  Wrench,
  MapPin,
  Package,
  Smartphone,
} from "lucide-react";
import type { AssetCategory } from "./types";

export const ASSET_CATEGORIES: AssetCategory[] = [
  {
    key: "users",
    label: "Users",
    icon: Users,
    color: "rgba(59, 130, 246, 0.7)",
    storeKey: "users",
  },
  {
    key: "devices",
    label: "Devices",
    icon: Server,
    color: "rgba(16, 185, 129, 0.7)",
    storeKey: "devices",
  },
  {
    key: "buildings",
    label: "Buildings",
    icon: Building,
    color: "rgba(245, 158, 11, 0.7)",
    storeKey: "buildings",
  },
  {
    key: "vehicles",
    label: "Vehicles",
    icon: Car,
    color: "rgba(239, 68, 68, 0.7)",
    storeKey: "vehicles",
  },
  {
    key: "officeEquipment",
    label: "Office Equipment",
    icon: Monitor,
    color: "rgba(139, 92, 246, 0.7)",
    storeKey: "officeEquipment",
  },
  {
    key: "furnitureEquipment",
    label: "Furniture",
    icon: Sofa,
    color: "rgba(236, 72, 153, 0.7)",
    storeKey: "furnitureEquipment",
  },
  {
    key: "plantMachinery",
    label: "Plant Machinery",
    icon: Wrench,
    color: "rgba(34, 197, 94, 0.7)",
    storeKey: "plantMachinery",
  },
  {
    key: "landRegister",
    label: "Land Register",
    icon: MapPin,
    color: "rgba(168, 85, 247, 0.7)",
    storeKey: "landRegister",
  },
  {
    key: "portableItems",
    label: "Portable Items",
    icon: Package,
    color: "rgba(14, 165, 233, 0.7)",
    storeKey: "portableItems",
  },
  {
    key: "ictAssets",
    label: "ICT Assets",
    icon: Smartphone,
    color: "rgba(147, 51, 234, 0.7)",
    storeKey: "ictAssets",
  },
  {
    key: "activity",
    label: "Activity Logs",
    icon: Activity,
    color: "rgba(6, 182, 212, 0.7)",
    storeKey: "auditLogs",
  },
];

export const CONDITION_OPTIONS = ["Good", "Fair", "Poor", "Disposed"];

export const EXPORT_MODES = [
  { value: "summary", label: "Summary Only" },
  { value: "data", label: "Data Only" },
  { value: "full", label: "Full Report" },
];

// Government report styling
export const GOVERNMENT_REPORT_CONFIG = {
  headerColor: "#003366",
  accentColor: "#0066CC",
  fontFamily: "Georgia, serif",
  bodyFontFamily: "Arial, sans-serif",
  pageMargin: 20,
  lineHeight: 1.5,
};
