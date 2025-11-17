"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Download,
  Eye,
  Package,
  Edit,
  Send,
  Filter,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-toastify";

import { usePortableItemsStore } from "../../../../shared/store/portableItemsStore";
import type { PortableItem } from "../../../../shared/store/portableItemsStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import DataTable from "../../../../shared/components/ui/DataTable";
import FilterModal from "../../../../shared/components/ui/FilterModal";

const PortableItemsList: React.FC = () => {
  const navigate = useNavigate();
  const { portableItems, fetchPortableItems, isLoading } =
    usePortableItemsStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Record<string, string | undefined>
  >({});

  // Fetch items on mount
  useEffect(() => {
    fetchPortableItems();
  }, [fetchPortableItems]);

  const filterOptions = useMemo(() => {
    if (!portableItems || portableItems.length === 0) return [];

    const conditions = Array.from(
      new Set(portableItems.map((item) => item.asset_condition).filter(Boolean))
    ).sort();

    const locations = Array.from(
      new Set(
        portableItems.map((item) => item.current_location).filter(Boolean)
      )
    ).sort();

    const makeModels = Array.from(
      new Set(portableItems.map((item) => item.make_model).filter(Boolean))
    ).sort();

    const years = Array.from(
      new Set(
        portableItems
          .map((item) => item.delivery_installation_date)
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
  }, [portableItems]);

  const filteredData = useMemo(() => {
    if (!portableItems) return [];

    return portableItems.filter((item) => {
      // Condition filter
      if (
        activeFilters.condition &&
        item.asset_condition !== activeFilters.condition
      ) {
        return false;
      }

      // Location filter
      if (
        activeFilters.location &&
        item.current_location !== activeFilters.location
      ) {
        return false;
      }

      // Make/Model filter
      if (
        activeFilters.makeModel &&
        item.make_model !== activeFilters.makeModel
      ) {
        return false;
      }

      // Year filter
      if (activeFilters.year && item.delivery_installation_date) {
        const itemYear = new Date(item.delivery_installation_date)
          .getFullYear()
          .toString();
        if (itemYear !== activeFilters.year) {
          return false;
        }
      } else if (activeFilters.year && !item.delivery_installation_date) {
        return false;
      }

      return true;
    });
  }, [portableItems, activeFilters]);

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
      (sum, item) => sum + (item.net_book_value || 0),
      0
    );

    // Calculate items added this week (mock trend - in production, compare with historical data)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentItems = filteredData.filter((item) => {
      if (!item.delivery_installation_date) return false;
      return new Date(item.delivery_installation_date) >= oneWeekAgo;
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
        }% of total items`,
        sparkline: generateSparklineData(newItems, newItems * 0.2),
      },
      good: {
        value: goodItems,
        trend: goodTrend,
        subtitle: `${
          total > 0 ? ((goodItems / total) * 100).toFixed(1) : 0
        }% of total items`,
        sparkline: generateSparklineData(goodItems, goodItems * 0.15),
      },
      needsReplacement: {
        value: needsReplacement,
        trend: replacementTrend,
        subtitle:
          needsReplacement > 0
            ? `${needsReplacement} require immediate attention`
            : "All items in good condition",
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

  const handleViewItem = (item: PortableItem) => {
    navigate(`/categories/portable-items/${item.id}`);
  };

  const handleEditItem = (item: PortableItem) => {
    navigate(`/categories/portable-items/${item.id}?edit=true`);
  };

  const handleTransferItem = (item: PortableItem) => {
    navigate(`/categories/portable-items/${item.id}/transfer`);
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  type Column = {
    header: string;
    accessor:
      | keyof PortableItem
      | ((row: PortableItem, rowIndex?: number) => React.ReactNode);
    sortable?: boolean;
    cell?: (value: any) => React.ReactNode;
  };

  const columns: Column[] = [
    {
      header: "#",
      accessor: (row: PortableItem, rowIndex?: number) =>
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

  const renderActions = (item: PortableItem) => (
    <div className="flex space-x-1 sm:space-x-2">
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-blue-600 rounded transition-colors hover:text-blue-800 hover:bg-blue-100"
        title="View Item Details"
        onClick={(e) => {
          e.stopPropagation();
          handleViewItem(item);
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
          handleEditItem(item);
        }}
      >
        <Edit size={16} className="sm:w-4 sm:h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-purple-600 rounded transition-colors hover:text-purple-800 hover:bg-purple-100"
        title="Transfer Item"
        onClick={(e) => {
          e.stopPropagation();
          handleTransferItem(item);
        }}
      >
        <Send className="h-4 w-4" />
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
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center px-2 py-2 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Package className="w-6 h-6 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Portable & Attractive Items
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
        {/* Action Buttons - Left aligned with icons only on mobile */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button
            variant="secondary"
            leftIcon={<Filter size={16} />}
            onClick={() => setIsFilterModalOpen(true)}
            className={`w-full sm:w-auto ${
              hasActiveFilters
                ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                : ""
            }`}
          >
            Filter
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Download size={16} />}
            onClick={handleExport}
            className="w-full sm:w-auto"
          >
            Export
          </Button>
          <Button
            variant="primary"
            className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto"
            leftIcon={<Plus size={16} />}
            onClick={() => navigate("/categories/portable-items/new")}
          >
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-2 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Items Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-lg transition-transform hover:scale-105">
          <div className="p-2 text-white">
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
              <p className="text-sm text-purple-100 mb-3">
                {hasActiveFilters ? "Filtered" : "Total"} Items
              </p>
              <p className="text-xs text-purple-200 mb-2">
                {statistics.total.subtitle}
              </p>
              <MiniSparkline
                data={statistics.total.sparkline}
                color="bg-white/30"
              />
            </div>
          </div>
        </div>

        {/* New Items Card */}
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

        {/* Good Items Card */}
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
      {isLoading ? (
        <div className="flex justify-center items-center py-8 space-x-2 text-gray-500">
          <svg
            className="w-5 h-5 text-gray-500 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span>Loading portable items...</span>
        </div>
      ) : filteredData.length === 0 && portableItems.length > 0 ? (
        <Card className="p-8 text-center">
          <Filter className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No items match your filters
          </h3>
          <p className="mb-4 text-gray-500">
            Try adjusting your filter criteria to see more results.
          </p>
          <Button
            variant="secondary"
            onClick={handleClearAllFilters}
            className="mr-2"
          >
            Clear Filters
          </Button>
          <Button
            variant="primary"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => setIsFilterModalOpen(true)}
          >
            Adjust Filters
          </Button>
        </Card>
      ) : portableItems.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No portable items found
          </h3>
          <p className="mb-4 text-gray-500">
            Get started by adding your first portable item.
          </p>
          <Button
            variant="primary"
            className="bg-purple-600 hover:bg-purple-700"
            leftIcon={<Plus size={16} />}
            onClick={() => navigate("/categories/portable-items/new")}
          >
            Add Item
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <DataTable<PortableItem>
              data={filteredData}
              columns={columns}
              keyField="id"
              onRowClick={handleViewItem}
              actions={renderActions}
              searchable
              pagination
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              className="min-w-full"
            />
          </div>
        </Card>
      )}

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
        exportTitle="Portable & Attractive Items"
      />
    </div>
  );
};

export default PortableItemsList;
