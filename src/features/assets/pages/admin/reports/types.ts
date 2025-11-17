import type { LucideIcon } from "lucide-react";

// Asset category definitions
export interface AssetCategory {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  storeKey: keyof ReportStores;
}

// Filter state
export interface ReportFilters {
  dateRange: {
    start: string;
    end: string;
  };
  status: string;
  location: string;
  department?: string;
  assetType?: string;
}

// Export options
export interface ExportOptions {
  format: "pdf" | "csv";
  mode: "summary" | "data" | "full";
  includeCharts: boolean;
  department?: string;
}

// Report summary statistics
export interface ReportSummary {
  totalRecords: number;
  activeCount?: number;
  inactiveCount?: number;
  conditionBreakdown?: Record<string, number>;
  locationBreakdown?: Record<string, number>;
}

// Store data types
export interface ReportStores {
  users: any[];
  devices: any[];
  buildings: any[];
  vehicles: any[];
  officeEquipment: any[];
  furnitureEquipment: any[];
  plantMachinery: any[];
  landRegister: any[];
  portableItems: any[];
  ictAssets: any[];
  auditLogs: any[];
}

// Chart data structure
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  fill?: boolean;
  tension?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

// Status options by category
export interface StatusOption {
  value: string;
  label: string;
}
