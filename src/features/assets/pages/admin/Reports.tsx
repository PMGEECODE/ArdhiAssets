"use client";

import type React from "react";
import { useCallback, useMemo, useState } from "react";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { ASSET_CATEGORIES, CONDITION_OPTIONS } from "./reports/constants";
import { useReportData } from "./reports/hooks/useReportData";
import { ReportFilters } from "./reports/components/ReportFilters";
import { ReportSummaryComponent } from "./reports/components/ReportSummary";
import { ReportCharts } from "./reports/components/ReportCharts";
import { ReportExportSection } from "./reports/components/ReportExportSection";
import { generateGovernmentPDF } from "./reports/utils/pdfExport";
import type {
  ReportFilters as FilterType,
  ExportOptions,
  ReportSummary,
  ChartData,
  StatusOption,
} from "./reports/types";

const Reports: React.FC = () => {
  const {
    stores,
    isLoading,
    getAssetData,
    getFilteredData,
    getUniqueLocations,
  } = useReportData();

  const [filters, setFilters] = useState<FilterType>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
    status: "all",
    location: "all",
  });

  const [selectedAssetCategory, setSelectedAssetCategory] =
    useState<string>("users");

  const currentCategoryData = useMemo(() => {
    return getAssetData(selectedAssetCategory);
  }, [selectedAssetCategory, getAssetData]);

  const filteredData = useMemo(() => {
    return getFilteredData(currentCategoryData, filters);
  }, [currentCategoryData, filters, getFilteredData]);

  const locations = useMemo(() => {
    return getUniqueLocations(currentCategoryData);
  }, [currentCategoryData, getUniqueLocations]);

  const getStatusOptions = useCallback((): StatusOption[] => {
    switch (selectedAssetCategory) {
      case "users":
        return [
          { value: "all", label: "All Status" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ];
      case "devices":
        return [
          { value: "all", label: "All Status" },
          { value: "online", label: "Online" },
          { value: "offline", label: "Offline" },
        ];
      default:
        return [
          { value: "all", label: "All Conditions" },
          ...CONDITION_OPTIONS.map((condition) => ({
            value: condition.toLowerCase(),
            label: condition,
          })),
        ];
    }
  }, [selectedAssetCategory]);

  const generateChartData = useCallback((): ChartData => {
    const category = ASSET_CATEGORIES.find(
      (cat) => cat.key === selectedAssetCategory
    );
    const color = category?.color || "rgba(59, 130, 246, 0.7)";

    switch (selectedAssetCategory) {
      case "users":
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        return {
          labels: ["Active", "Inactive", "New (7 days)"],
          datasets: [
            {
              label: "User Statistics",
              data: [
                filteredData.filter((u: any) => u.is_active).length,
                filteredData.filter((u: any) => !u.is_active).length,
                filteredData.filter((u: any) => {
                  return new Date(u.created_at!) > oneWeekAgo;
                }).length,
              ],
              backgroundColor: [
                color,
                "rgba(239, 68, 68, 0.7)",
                "rgba(34, 197, 94, 0.7)",
              ],
            },
          ],
        };

      case "devices":
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        return {
          labels: ["Online", "Offline", "New (7 days)"],
          datasets: [
            {
              label: "Device Statistics",
              data: [
                filteredData.filter((d: any) => {
                  return new Date(d.last_seen) > oneDayAgo;
                }).length,
                filteredData.filter((d: any) => {
                  return new Date(d.last_seen) <= oneDayAgo;
                }).length,
                filteredData.filter((d: any) => {
                  const oneWeekAgoDevice = new Date();
                  oneWeekAgoDevice.setDate(oneWeekAgoDevice.getDate() - 7);
                  return new Date(d.first_seen) > oneWeekAgoDevice;
                }).length,
              ],
              backgroundColor: [
                color,
                "rgba(239, 68, 68, 0.7)",
                "rgba(34, 197, 94, 0.7)",
              ],
            },
          ],
        };

      case "activity":
        const dates = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split("T")[0];
        }).reverse();

        return {
          labels: dates,
          datasets: [
            {
              label: "Activity Over Time",
              data: dates.map(
                (date) =>
                  filteredData.filter((log: any) =>
                    log.timestamp.startsWith(date)
                  ).length
              ),
              borderColor: color,
              backgroundColor: color.replace("0.7", "0.1"),
              tension: 0.4,
              fill: true,
            },
          ],
        };

      default:
        return {
          labels: CONDITION_OPTIONS,
          datasets: [
            {
              label: `${category?.label} by Condition`,
              data: CONDITION_OPTIONS.map(
                (condition) =>
                  filteredData.filter(
                    (item: any) =>
                      item.asset_condition?.toLowerCase() ===
                      condition.toLowerCase()
                  ).length
              ),
              backgroundColor: [
                "rgba(34, 197, 94, 0.7)",
                "rgba(245, 158, 11, 0.7)",
                "rgba(239, 68, 68, 0.7)",
                "rgba(107, 114, 128, 0.7)",
              ],
            },
          ],
        };
    }
  }, [selectedAssetCategory, filteredData]);

  const reportSummary = useMemo((): ReportSummary => {
    const summary: ReportSummary = {
      totalRecords: filteredData.length,
    };

    if (selectedAssetCategory === "users") {
      summary.activeCount = filteredData.filter((u: any) => u.is_active).length;
      summary.inactiveCount = filteredData.filter(
        (u: any) => !u.is_active
      ).length;
    }

    if (selectedAssetCategory === "devices") {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      summary.activeCount = filteredData.filter((d: any) => {
        return new Date(d.last_seen) > oneDayAgo;
      }).length;
      summary.inactiveCount = filteredData.filter((d: any) => {
        return new Date(d.last_seen) <= oneDayAgo;
      }).length;
    }

    const conditionMap: Record<string, number> = {};
    filteredData.forEach((item: any) => {
      if (item.asset_condition) {
        const condition = item.asset_condition;
        conditionMap[condition] = (conditionMap[condition] || 0) + 1;
      }
    });
    if (Object.keys(conditionMap).length > 0) {
      summary.conditionBreakdown = conditionMap;
    }

    const locationMap: Record<string, number> = {};
    filteredData.forEach((item: any) => {
      if (item.current_location) {
        const location = item.current_location;
        locationMap[location] = (locationMap[location] || 0) + 1;
      }
    });
    if (Object.keys(locationMap).length > 0) {
      summary.locationBreakdown = locationMap;
    }

    return summary;
  }, [filteredData, selectedAssetCategory]);

  const handleExportCSV = useCallback(() => {
    const category = ASSET_CATEGORIES.find(
      (cat) => cat.key === selectedAssetCategory
    );
    let dataToExport: any[] = [];

    switch (selectedAssetCategory) {
      case "users":
        dataToExport = filteredData.map((user: any) => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          status: user.is_active ? "Active" : "Inactive",
          created_at: user.created_at || "",
        }));
        break;

      case "devices":
        dataToExport = filteredData.map((device: any) => ({
          id: device.id,
          hostname: device.hostname,
          lastSeen: device.last_seen,
          firstSeen: device.first_seen,
          status:
            new Date(device.last_seen) >
            new Date(Date.now() - 24 * 60 * 60 * 1000)
              ? "Online"
              : "Offline",
        }));
        break;

      case "activity":
        dataToExport = filteredData.map((log: any) => ({
          id: log.id,
          user: `${log.user?.first_name || "Unknown"} ${
            log.user?.last_name || "Unknown"
          }`,
          action: log.action,
          timestamp: log.timestamp,
        }));
        break;

      default:
        dataToExport = filteredData.map((item: any) => ({
          id: item.id,
          description:
            item.asset_description ||
            item.description_of_land ||
            item.registration_number ||
            "N/A",
          tag_number: item.tag_number || "N/A",
          current_location: item.current_location || "N/A",
          responsible_officer: item.responsible_officer || "N/A",
          condition: item.asset_condition || "N/A",
          purchase_amount:
            item.purchase_amount || item.acquisition_amount || "N/A",
          created_at: item.created_at || "",
        }));
        break;
    }

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    saveAs(
      blob,
      `${category?.label.toLowerCase().replace(/\s+/g, "_")}_report_${
        filters.dateRange.start
      }_to_${filters.dateRange.end}.csv`
    );
  }, [filteredData, selectedAssetCategory, filters.dateRange]);

  const handleExportPDF = useCallback(
    (options: ExportOptions) => {
      const category = ASSET_CATEGORIES.find(
        (cat) => cat.key === selectedAssetCategory
      );
      if (!category) return;

      generateGovernmentPDF({
        categoryLabel: category.label,
        dateRange: filters.dateRange,
        filteredData,
        summary: reportSummary,
        categoryKey: selectedAssetCategory,
        options,
      });
    },
    [selectedAssetCategory, filters.dateRange, filteredData, reportSummary]
  );

  const currentCategory = ASSET_CATEGORIES.find(
    (cat) => cat.key === selectedAssetCategory
  );
  const chartType = selectedAssetCategory === "activity" ? "line" : "bar";

  return (
    <div className="px-4 space-y-6 sm:px-6 md:px-8 py-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            Asset Management Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate comprehensive, government-standard asset reports
          </p>
        </div>

        {/* Category Selector */}
        <select
          value={selectedAssetCategory}
          onChange={(e) => setSelectedAssetCategory(e.target.value)}
          className="px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Select asset category"
        >
          {ASSET_CATEGORIES.map((category) => (
            <option key={category.key} value={category.key}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filters Section */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        locations={locations}
        statusOptions={getStatusOptions()}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Charts Section */}
        <div className="lg:col-span-2">
          <ReportCharts
            chartData={generateChartData()}
            isLoading={isLoading}
            chartType={chartType}
            title={`${currentCategory?.label} Analysis`}
          />
        </div>

        {/* Summary Section */}
        <div>
          <ReportSummaryComponent
            summary={reportSummary}
            isLoading={isLoading}
            categoryLabel={currentCategory?.label || ""}
            dateRange={filters.dateRange}
          />
        </div>
      </div>

      {/* Export Section */}
      <ReportExportSection
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
        isLoading={isLoading}
        categoryLabel={currentCategory?.label || ""}
        recordCount={filteredData.length}
      />
    </div>
  );
};

export default Reports;
