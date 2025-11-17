"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Download,
  Eye,
  Monitor,
  Edit,
  ArrowRightLeft,
  Filter,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-toastify";

import { useOfficeEquipmentStore } from "../../../../shared/store/officeEquipmentStore";
import type { OfficeEquipment } from "../../../../shared/store/officeEquipmentStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import DataTable from "../../../../shared/components/ui/DataTable";
import FilterModal from "../../../../shared/components/ui/FilterModal";
import { logCategoryVisit } from "../../../../shared/utils/categoryTracker";

const OfficeEquipmentList: React.FC = () => {
  const navigate = useNavigate();
  const { officeEquipment, fetchOfficeEquipment, isLoading } =
    useOfficeEquipmentStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Record<string, string | undefined>
  >({});

  // Fetch items on mount
  useEffect(() => {
    logCategoryVisit("OFFICE_EQUIPMENT", "Office Equipment", {
      equipmentCount: officeEquipment?.length || 0,
    });

    fetchOfficeEquipment();
  }, []);

  const filterOptions = useMemo(() => {
    if (!officeEquipment || officeEquipment.length === 0) return [];

    const conditions = Array.from(
      new Set(
        officeEquipment
          .map((equipment) => equipment.asset_condition)
          .filter(Boolean)
      )
    ).sort();

    const locations = Array.from(
      new Set(
        officeEquipment
          .map((equipment) => equipment.current_location)
          .filter(Boolean)
      )
    ).sort();

    const makeModels = Array.from(
      new Set(
        officeEquipment.map((equipment) => equipment.make_model).filter(Boolean)
      )
    ).sort();

    const years = Array.from(
      new Set(
        officeEquipment
          .map((equipment) => equipment.delivery_installation_date)
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
        label: "Delivery Year",
        options: years,
      },
    ];
  }, [officeEquipment]);

  const filteredData = useMemo(() => {
    if (!officeEquipment) return [];

    return officeEquipment.filter((equipment) => {
      // Condition filter
      if (
        activeFilters.condition &&
        equipment.asset_condition !== activeFilters.condition
      ) {
        return false;
      }

      // Location filter
      if (
        activeFilters.location &&
        equipment.current_location !== activeFilters.location
      ) {
        return false;
      }

      // Make/Model filter
      if (
        activeFilters.makeModel &&
        equipment.make_model !== activeFilters.makeModel
      ) {
        return false;
      }

      // Year filter
      if (activeFilters.year && equipment.delivery_installation_date) {
        const equipmentYear = new Date(equipment.delivery_installation_date)
          .getFullYear()
          .toString();
        if (equipmentYear !== activeFilters.year) {
          return false;
        }
      } else if (activeFilters.year && !equipment.delivery_installation_date) {
        return false;
      }

      return true;
    });
  }, [officeEquipment, activeFilters]);

  const statistics = useMemo(() => {
    const total = filteredData.length;
    const excellentItems = filteredData.filter(
      (eq) => eq.asset_condition?.toLowerCase() === "excellent"
    ).length;
    const goodItems = filteredData.filter(
      (eq) => eq.asset_condition?.toLowerCase() === "good"
    ).length;
    const needsRepair = filteredData.filter(
      (eq) => eq.asset_condition?.toLowerCase() === "needs repair"
    ).length;

    // Calculate total value
    const totalValue = filteredData.reduce(
      (sum, equipment) => sum + (equipment.net_book_value || 0),
      0
    );

    // Mock trend calculations (in production, compare with previous period data)
    const totalTrend = 5.3;
    const excellentTrend = 8.7;
    const goodTrend = -2.1;
    const repairTrend = 12.4;

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
      excellent: {
        value: excellentItems,
        trend: excellentTrend,
        subtitle: `${
          total > 0 ? ((excellentItems / total) * 100).toFixed(1) : 0
        }% of total equipment`,
        sparkline: generateSparklineData(excellentItems, excellentItems * 0.2),
      },
      good: {
        value: goodItems,
        trend: goodTrend,
        subtitle: `${
          total > 0 ? ((goodItems / total) * 100).toFixed(1) : 0
        }% of total equipment`,
        sparkline: generateSparklineData(goodItems, goodItems * 0.15),
      },
      needsRepair: {
        value: needsRepair,
        trend: repairTrend,
        subtitle:
          needsRepair > 0
            ? `${needsRepair} require immediate attention`
            : "All equipment in good condition",
        sparkline: generateSparklineData(needsRepair, needsRepair * 0.3),
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
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearAllFilters = () => {
    setActiveFilters({});
    setCurrentPage(1);
  };

  const handleViewItem = (item: OfficeEquipment) => {
    navigate(`/categories/office-equipment/${item.id}`);
  };

  const handleEditItem = (item: OfficeEquipment) => {
    navigate(`/categories/office-equipment/${item.id}?edit=true`);
  };

  const handleTransferItem = (item: OfficeEquipment) => {
    navigate(`/categories/office-equipment/${item.id}/transfer`);
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  type Column = {
    header: string;
    accessor:
      | keyof OfficeEquipment
      | ((row: OfficeEquipment, rowIndex?: number) => React.ReactNode);
    sortable?: boolean;
    cell?: (value: any) => React.ReactNode;
  };

  const columns: Column[] = [
    {
      header: "#",
      accessor: (row: OfficeEquipment, rowIndex?: number) =>
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
            case "excellent":
              return "bg-green-100 text-green-800";
            case "good":
              return "bg-blue-100 text-blue-800";
            case "fair":
              return "bg-yellow-100 text-yellow-800";
            case "poor":
              return "bg-orange-100 text-orange-800";
            case "needs repair":
              return "bg-red-100 text-red-800";
            case "disposed":
              return "bg-gray-100 text-gray-800";
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
      header: "Delivery Date",
      accessor: "delivery_installation_date",
      sortable: true,
      cell: (value: string | undefined) =>
        value ? format(new Date(value), "MMM dd, yyyy") : "N/A",
    },
  ];

  const renderActions = (item: OfficeEquipment) => (
    <div className="flex space-x-1 sm:space-x-2">
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-blue-600 rounded transition-colors hover:text-blue-800 hover:bg-blue-100"
        title="View Equipment Details"
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
        title="Edit Equipment"
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
        title="Transfer Equipment"
        onClick={(e) => {
          e.stopPropagation();
          handleTransferItem(item);
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
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Monitor className="w-6 h-6 text-orange-600" />
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Office Equipment
          </h1>
          {hasActiveFilters && (
            <span className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-100 rounded-full">
              {Object.values(activeFilters).filter(Boolean).length} filter
              {Object.values(activeFilters).filter(Boolean).length > 1
                ? "s"
                : ""}{" "}
              active
            </span>
          )}
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button
            variant="secondary"
            leftIcon={<Filter size={16} />}
            onClick={() => setIsFilterModalOpen(true)}
            className={`w-full sm:w-auto ${
              hasActiveFilters
                ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
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
            className="w-full bg-orange-600 hover:bg-orange-700 sm:w-auto"
            leftIcon={<Plus size={16} />}
            onClick={() => navigate("/categories/office-equipment/new")}
          >
            Add Equipment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Equipment Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg shadow-lg transition-transform hover:scale-105">
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
                      ? "text-orange-200"
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
              <p className="text-sm text-orange-100 mb-3">
                {hasActiveFilters ? "Filtered" : "Total"} Equipment
              </p>
              <p className="text-xs text-orange-200 mb-2">
                {statistics.total.subtitle}
              </p>
              <MiniSparkline
                data={statistics.total.sparkline}
                color="bg-white/30"
              />
            </div>
          </div>
        </div>

        {/* Excellent Condition Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-lg transition-transform hover:scale-105">
          <div className="p-6 text-white">
            <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="mt-16">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-3xl font-bold">
                  {statistics.excellent.value}
                </h3>
                <div
                  className={`flex items-center text-sm font-medium ${
                    statistics.excellent.trend >= 0
                      ? "text-green-200"
                      : "text-red-200"
                  }`}
                >
                  {statistics.excellent.trend >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(statistics.excellent.trend)}%
                </div>
              </div>
              <p className="text-sm text-green-100 mb-3">Excellent Condition</p>
              <p className="text-xs text-green-200 mb-2">
                {statistics.excellent.subtitle}
              </p>
              <MiniSparkline
                data={statistics.excellent.sparkline}
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
                      ? "text-blue-200"
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

        {/* Needs Repair Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-red-700 rounded-lg shadow-lg transition-transform hover:scale-105">
          <div className="p-6 text-white">
            <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="mt-16">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-3xl font-bold">
                  {statistics.needsRepair.value}
                </h3>
                <div
                  className={`flex items-center text-sm font-medium ${
                    statistics.needsRepair.trend >= 0
                      ? "text-red-200"
                      : "text-green-200"
                  }`}
                >
                  {statistics.needsRepair.trend >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(statistics.needsRepair.trend)}%
                </div>
              </div>
              <p className="text-sm text-red-100 mb-3">Need Repair</p>
              <p className="text-xs text-red-200 mb-2">
                {statistics.needsRepair.subtitle}
              </p>
              <MiniSparkline
                data={statistics.needsRepair.sparkline}
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
          <span>Loading office equipment...</span>
        </div>
      ) : filteredData.length === 0 && officeEquipment.length > 0 ? (
        <Card className="p-8 text-center">
          <Filter className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No equipment matches your filters
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
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => setIsFilterModalOpen(true)}
          >
            Adjust Filters
          </Button>
        </Card>
      ) : officeEquipment.length === 0 ? (
        <Card className="p-8 text-center">
          <Monitor className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No office equipment found
          </h3>
          <p className="mb-4 text-gray-500">
            Get started by adding your first office equipment.
          </p>
          <Button
            variant="primary"
            className="bg-orange-600 hover:bg-orange-700"
            leftIcon={<Plus size={16} />}
            onClick={() => navigate("/categories/office-equipment/new")}
          >
            Add Equipment
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <DataTable<OfficeEquipment>
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
        exportTitle="Office Equipment"
      />
    </div>
  );
};

export default OfficeEquipmentList;
