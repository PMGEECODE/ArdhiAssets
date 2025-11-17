"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Eye,
  Package,
  Edit,
  ArrowRightLeft,
  Filter,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
// import { toast } from "react-toastify";

import { useIctAssetsStore } from "../../../../shared/store/ictAssetsStore";
import type { IctAsset } from "../../../../shared/store/ictAssetsStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import DataTable from "../../../../shared/components/ui/DataTable";
import FilterModal from "../../../../shared/components/ui/FilterModal";
import { logCategoryVisit } from "../../../../shared/utils/categoryTracker";

const IctAssetsList: React.FC = () => {
  const navigate = useNavigate();
  const { ictAssets, fetchIctAssets, isLoading } = useIctAssetsStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Record<string, string | undefined>
  >({});

  // Fetch items on mount
  useEffect(() => {
    logCategoryVisit("ICT_ASSETS", "ICT Assets", {
      assetCount: ictAssets?.length || 0,
    });

    fetchIctAssets();
  }, []);

  // Generate filter options dynamically from the data
  const filterOptions = useMemo(() => {
    if (!ictAssets || ictAssets.length === 0) return [];

    const conditions = Array.from(
      new Set(ictAssets.map((asset) => asset.asset_condition).filter(Boolean))
    ).sort();

    const locations = Array.from(
      new Set(ictAssets.map((asset) => asset.current_location).filter(Boolean))
    ).sort();

    const makeModels = Array.from(
      new Set(ictAssets.map((asset) => asset.make_model).filter(Boolean))
    ).sort();

    const years = Array.from(
      new Set(
        ictAssets
          .map((asset) => asset.delivery_installation_date)
          .filter(Boolean)
          .map((date) => new Date(date).getFullYear().toString())
      )
    ).sort((a, b) => Number.parseInt(b) - Number.parseInt(a));

    return [
      {
        key: "condition",
        label: "Condition",
        options: conditions,
      },
      {
        key: "location",
        label: "Location",
        options: locations,
      },
      {
        key: "makeModel",
        label: "Make/Model",
        options: makeModels,
      },
      {
        key: "year",
        label: "Acquisition Year",
        options: years,
      },
    ];
  }, [ictAssets]);

  const filteredData = useMemo(() => {
    if (!ictAssets) return [];

    return ictAssets.filter((asset) => {
      // Condition filter
      if (
        activeFilters.condition &&
        asset.asset_condition !== activeFilters.condition
      ) {
        return false;
      }

      // Location filter
      if (
        activeFilters.location &&
        asset.current_location !== activeFilters.location
      ) {
        return false;
      }

      // Make/Model filter
      if (
        activeFilters.makeModel &&
        asset.make_model !== activeFilters.makeModel
      ) {
        return false;
      }

      // Year filter
      if (activeFilters.year && asset.delivery_installation_date) {
        const assetYear = new Date(asset.delivery_installation_date)
          .getFullYear()
          .toString();
        if (assetYear !== activeFilters.year) {
          return false;
        }
      } else if (activeFilters.year && !asset.delivery_installation_date) {
        return false;
      }

      return true;
    });
  }, [ictAssets, activeFilters]);

  const statistics = useMemo(() => {
    const total = filteredData.length;
    const newItems = filteredData.filter(
      (eq) => eq.asset_condition?.toLowerCase() === "new"
    ).length;
    const goodItems = filteredData.filter(
      (eq) => eq.asset_condition?.toLowerCase() === "good"
    ).length;
    const needsReplacement = filteredData.filter(
      (eq) => eq.asset_condition?.toLowerCase() === "needs replacement"
    ).length;

    // Calculate total value
    const totalValue = filteredData.reduce(
      (sum, asset) =>
        sum + (Number.parseFloat(String(asset.net_book_value)) || 0),
      0
    );

    // Calculate items added this week (mock trend - in production, compare with historical data)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentItems = filteredData.filter((asset) => {
      if (!asset.delivery_installation_date) return false;
      return new Date(asset.delivery_installation_date) >= oneWeekAgo;
    }).length;

    // Mock trend calculations (in production, compare with previous period data)
    const totalTrend = 8.2; // percentage change
    const newTrend = 12.5;
    const goodTrend = -3.2;
    const replacementTrend = 15.8;

    // Generate sparkline data (last 7 days - mock data)
    const generateSparklineData = (baseValue: number, variance: number) => {
      return Array.from({ length: 7 }, (_, i) => {
        const randomVariance = (Math.random() - 0.5) * variance;
        return Math.max(0, baseValue + randomVariance);
      });
    };

    return {
      total: {
        value: total,
        trend: totalTrend,
        subtitle: `Ksh ${totalValue.toLocaleString()} total value`,
        sparkline: generateSparklineData(total, total * 0.1),
      },
      new: {
        value: newItems,
        trend: newTrend,
        subtitle: `${
          total > 0 ? ((newItems / total) * 100).toFixed(1) : 0
        }% of total assets`,
        sparkline: generateSparklineData(newItems, newItems * 0.2),
      },
      good: {
        value: goodItems,
        trend: goodTrend,
        subtitle: `${
          total > 0 ? ((goodItems / total) * 100).toFixed(1) : 0
        }% of total assets`,
        sparkline: generateSparklineData(goodItems, goodItems * 0.15),
      },
      needsReplacement: {
        value: needsReplacement,
        trend: replacementTrend,
        subtitle:
          needsReplacement > 0
            ? `${needsReplacement} require immediate attention`
            : "All assets in good condition",
        sparkline: generateSparklineData(
          needsReplacement,
          needsReplacement * 0.3
        ),
      },
    };
  }, [filteredData]);

  const hasActiveFilters = Object.values(activeFilters).some((value) => value);

  const handleFilterChange = (
    filterType: string,
    value: string | undefined
  ) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setActiveFilters({});
    setCurrentPage(1);
  };

  type Column = {
    header: string;
    accessor:
      | keyof IctAsset
      | ((row: IctAsset, rowIndex?: number) => React.ReactNode);
    sortable?: boolean;
    cell?: (value: any) => React.ReactNode;
  };

  const columns: Column[] = [
    {
      header: "#",
      accessor: (row: IctAsset, rowIndex?: number) =>
        rowIndex !== undefined
          ? (currentPage - 1) * pageSize + rowIndex + 1
          : filteredData.indexOf(row) + 1,
      sortable: false,
    },
    {
      header: "Asset Description",
      accessor: "asset_description",
      sortable: true,
      cell: (value: string | undefined) => (
        <div className="max-w-xs truncate" title={value}>
          {value || "N/A"}
        </div>
      ),
    },
    {
      header: "Tag Number",
      accessor: "tag_number",
      sortable: true,
      cell: (value: string | undefined) => value || "N/A",
    },
    {
      header: "Serial Number",
      accessor: "serial_number",
      sortable: true,
      cell: (value: string | undefined) => value || "N/A",
    },
    {
      header: "Make/Model",
      accessor: "make_model",
      sortable: true,
      cell: (value: string | undefined) => value || "N/A",
    },
    {
      header: "Current Location",
      accessor: "current_location",
      sortable: true,
      cell: (value: string | undefined) => value || "N/A",
    },
    {
      header: "Condition",
      accessor: "asset_condition",
      sortable: true,
      cell: (value: string | undefined) => {
        const getConditionColor = (condition?: string) => {
          switch (condition?.toLowerCase()) {
            case "new":
              return "bg-green-100 text-green-800";
            case "good":
              return "bg-blue-100 text-blue-800";
            case "worn":
              return "bg-yellow-100 text-yellow-800";
            case "needs replacement":
              return "bg-red-100 text-red-800";
            default:
              return "bg-gray-100 text-gray-800";
          }
        };
        return value ? (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(
              value
            )}`}
          >
            {value}
          </span>
        ) : (
          "N/A"
        );
      },
    },
    {
      header: "Purchase Amount",
      accessor: "purchase_amount",
      sortable: true,
      cell: (value: number | undefined) =>
        value ? `Ksh.${value.toLocaleString()}` : "N/A",
    },
    {
      header: "Net Book Value",
      accessor: "net_book_value",
      sortable: true,
      cell: (value: number | undefined) =>
        value ? `Ksh.${value.toLocaleString()}` : "N/A",
    },
    {
      header: "Acquisition Date",
      accessor: "delivery_installation_date",
      sortable: true,
      cell: (value: string | undefined) =>
        value ? format(new Date(value), "MMM dd, yyyy") : "N/A",
    },
  ];

  const renderActions = (item: IctAsset) => (
    <div className="flex space-x-1 sm:space-x-2">
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-blue-600 rounded transition-colors hover:text-blue-800 hover:bg-blue-100"
        title="View Item Details"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/categories/ict-assets/${item.id}`);
        }}
      >
        <Eye size={16} className="sm:w-4 sm:h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-green-600 rounded transition-colors hover:text-green-800 hover:bg-green-100"
        title="Edit Item"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/categories/ict-assets/${item.id}/edit`);
        }}
      >
        <Edit size={16} className="sm:w-4 sm:h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-purple-600 rounded transition-colors hover:text-purple-800 hover:bg-purple-100"
        title="Transfer Asset"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/categories/ict-assets/${item.id}/transfer`);
        }}
      >
        <ArrowRightLeft size={16} className="sm:w-4 sm:h-4" />
      </Button>
    </div>
  );

  const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({
    data,
    color,
  }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <div className="flex items-end h-8 gap-0.5">
        {data.map((value, index) => {
          const height = ((value - min) / range) * 100;
          return (
            <div
              key={index}
              className={`flex-1 ${color} rounded-sm transition-all`}
              style={{ height: `${height}%`, minHeight: "2px" }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 flex flex-row justify-between items-center px-2 py-2">
        <div className="flex items-center space-x-2">
          <Package className="w-6 h-6 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900 sm:text-1xl">
            ICT Assets
          </h1>
          {hasActiveFilters && (
            <span className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full">
              {Object.values(activeFilters).filter(Boolean).length} filter
              {Object.values(activeFilters).filter(Boolean).length > 1
                ? "s"
                : ""}{" "}
              active
            </span>
          )}
        </div>

        {/* Compact mobile button row */}
        <div className="flex flex-row gap-1">
          {/* Filter Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex flex-col items-center justify-center p-1 rounded-md border text-[10px] font-normal transition-colors w-14 sm:flex-row sm:space-x-1 sm:px-2 sm:py-1 sm:text-xs sm:w-auto ${
              hasActiveFilters
                ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-3 h-3 mb-0.5 sm:mb-0 sm:w-3 sm:h-3" />
            <span className="sm:block">Filter</span>
          </button>

          {/* Add ICT Asset Button */}
          <button
            onClick={() => navigate("/categories/ict-assets/new")}
            className="flex flex-col items-center justify-center p-1 rounded-md bg-purple-600 text-white hover:bg-purple-700 text-[10px] font-normal transition-colors w-14 sm:flex-row sm:space-x-1 sm:px-2 sm:py-1 sm:text-xs sm:w-auto"
          >
            <Plus className="w-3 h-3 mb-0.5 sm:mb-0 sm:w-3 sm:h-3" />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:block">Add ICT Asset</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 px-2 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Assets Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg shadow-lg transition-transform hover:scale-105">
          <div className="p-6 text-white">
            <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Package className="w-6 h-6" />
            </div>
            <div className="mt-16">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-3xl font-bold">{statistics.total.value}</h3>
                <div
                  className={`flex items-center text-sm font-medium ${
                    statistics.total.trend >= 0
                      ? "text-green-200"
                      : "text-red-200"
                  }`}
                >
                  {statistics.total.trend >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(statistics.total.trend)}%
                </div>
              </div>
              <p className="text-sm text-emerald-100 mb-3">
                {hasActiveFilters ? "Filtered" : "Total"} Assets
              </p>
              <p className="text-xs text-emerald-200 mb-2">
                {statistics.total.subtitle}
              </p>
              <MiniSparkline
                data={statistics.total.sparkline}
                color="bg-white/30"
              />
            </div>
          </div>
        </div>

        {/* New Assets Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-lg transition-transform hover:scale-105">
          <div className="p-6 text-white">
            <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="mt-16">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-3xl font-bold">{statistics.new.value}</h3>
                <div
                  className={`flex items-center text-sm font-medium ${
                    statistics.new.trend >= 0
                      ? "text-green-200"
                      : "text-red-200"
                  }`}
                >
                  {statistics.new.trend >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(statistics.new.trend)}%
                </div>
              </div>
              <p className="text-sm text-green-100 mb-3">New Condition</p>
              <p className="text-xs text-green-200 mb-2">
                {statistics.new.subtitle}
              </p>
              <MiniSparkline
                data={statistics.new.sparkline}
                color="bg-white/30"
              />
            </div>
          </div>
        </div>

        {/* Good Condition Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg transition-transform hover:scale-105">
          <div className="p-6 text-white">
            <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="mt-16">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-3xl font-bold">{statistics.good.value}</h3>
                <div
                  className={`flex items-center text-sm font-medium ${
                    statistics.good.trend >= 0
                      ? "text-green-200"
                      : "text-red-200"
                  }`}
                >
                  {statistics.good.trend >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(statistics.good.trend)}%
                </div>
              </div>
              <p className="text-sm text-blue-100 mb-3">Good Condition</p>
              <p className="text-xs text-blue-200 mb-2">
                {statistics.good.subtitle}
              </p>
              <MiniSparkline
                data={statistics.good.sparkline}
                color="bg-white/30"
              />
            </div>
          </div>
        </div>

        {/* Needs Replacement Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-red-700 rounded-lg shadow-lg transition-transform hover:scale-105">
          <div className="p-6 text-white">
            <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="mt-16">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-3xl font-bold">
                  {statistics.needsReplacement.value}
                </h3>
                <div
                  className={`flex items-center text-sm font-medium ${
                    statistics.needsReplacement.trend >= 0
                      ? "text-red-200"
                      : "text-green-200"
                  }`}
                >
                  {statistics.needsReplacement.trend >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(statistics.needsReplacement.trend)}%
                </div>
              </div>
              <p className="text-sm text-red-100 mb-3">Need Replacement</p>
              <p className="text-xs text-red-200 mb-2">
                {statistics.needsReplacement.subtitle}
              </p>
              <MiniSparkline
                data={statistics.needsReplacement.sparkline}
                color="bg-white/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading / Empty / Data Table */}
      <div className="px-3 sm:px-2">
        {isLoading ? (
          <div className="flex justify-center items-center py-8 space-x-2 text-gray-500">
            <svg
              className="w-5 h-5 text-gray-500 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                className="opacity-25"
              />
              <path
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                fill="currentColor"
                className="opacity-75"
              />
            </svg>
            <span className="text-sm sm:text-base">Loading ICT assets...</span>
          </div>
        ) : filteredData.length === 0 && ictAssets.length > 0 ? (
          <Card className="p-6 text-center sm:p-8">
            <Filter className="mx-auto mb-4 w-10 h-10 text-gray-400 sm:w-12 sm:h-12" />
            <h3 className="mb-2 text-base font-medium text-gray-900 sm:text-lg">
              No assets match your filters
            </h3>
            <p className="mb-4 text-sm text-gray-500 sm:text-base">
              Try adjusting your filter criteria to see more results.
            </p>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-center">
              <Button
                variant="secondary"
                onClick={handleClearAllFilters}
                className="w-full sm:w-auto"
              >
                Clear Filters
              </Button>
              <Button
                variant="primary"
                className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto"
                onClick={() => setIsFilterModalOpen(true)}
              >
                Adjust Filters
              </Button>
            </div>
          </Card>
        ) : ictAssets.length === 0 ? (
          <Card className="p-6 text-center sm:p-8">
            <Package className="mx-auto mb-4 w-10 h-10 text-gray-400 sm:w-12 sm:h-12" />
            <h3 className="mb-2 text-base font-medium text-gray-900 sm:text-lg">
              No ICT assets found
            </h3>
            <p className="mb-4 text-sm text-gray-500 sm:text-base">
              Get started by adding your first ICT asset.
            </p>
            <Button
              variant="primary"
              className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto"
              leftIcon={<Plus size={16} />}
              onClick={() => navigate("/categories/ict-assets/new")}
            >
              Add ICT Asset
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <DataTable<IctAsset>
                data={filteredData}
                columns={columns}
                keyField="id"
                onRowClick={(item) =>
                  navigate(`/categories/ict-assets/${item.id}`)
                }
                actions={renderActions}
                pagination
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                className="min-w-full"
              />
            </div>
          </Card>
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAllFilters}
        hasActiveFilters={hasActiveFilters}
        filteredData={filteredData}
        columns={columns.map((col) => ({
          header: col.header,
          accessor:
            typeof col.accessor === "function"
              ? col.accessor
              : (col.accessor as string),
          cell: col.cell,
        }))}
        exportTitle="ICT Assets"
      />
    </div>
  );
};

export default IctAssetsList;
