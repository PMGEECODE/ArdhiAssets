"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Download,
  Eye,
  Edit,
  Truck,
  Filter,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Car,
} from "lucide-react";
import { toast } from "react-toastify";

import { useVehicleStore } from "../../../../shared/store/vehicleStore";
import type { Vehicle } from "../../../../shared/store/vehicleStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import DataTable from "../../../../shared/components/ui/DataTable";
import FilterModal from "../../../../shared/components/ui/FilterModal";
import { logCategoryVisit } from "../../../../shared/utils/categoryTracker";

const VehicleList: React.FC = () => {
  const navigate = useNavigate();
  const { vehicles, fetchVehicles, isLoading } = useVehicleStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Record<string, string | undefined>
  >({});

  useEffect(() => {
    logCategoryVisit("MOTOR_VEHICLES_REGISTER", "Motor Vehicles", {
      vehicleCount: vehicles?.length || 0,
    });

    fetchVehicles();
  }, []);

  const filterOptions = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return [];

    const conditions = Array.from(
      new Set(
        vehicles.map((vehicle) => vehicle.asset_condition).filter(Boolean)
      )
    ).sort();

    const locations = Array.from(
      new Set(
        vehicles.map((vehicle) => vehicle.current_location).filter(Boolean)
      )
    ).sort();

    const years = Array.from(
      new Set(
        vehicles.map((vehicle) => vehicle.year_of_purchase).filter(Boolean)
      )
    )
      .sort((a, b) => b - a)
      .map((year) => year.toString());

    const makeModels = Array.from(
      new Set(vehicles.map((vehicle) => vehicle.make_model).filter(Boolean))
    ).sort();

    const responsibleOfficers = Array.from(
      new Set(
        vehicles.map((vehicle) => vehicle.responsible_officer).filter(Boolean)
      )
    ).sort();

    const amountRanges = [
      "Under Ksh 500K",
      "Ksh 500K - 1M",
      "Ksh 1M - 2M",
      "Ksh 2M - 5M",
      "Over Ksh 5M",
    ];

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
        key: "year",
        label: "Year of Purchase",
        options: years,
      },
      {
        key: "makeModel",
        label: "Make & Model",
        options: makeModels,
      },
      {
        key: "responsibleOfficer",
        label: "Responsible Officer",
        options: responsibleOfficers,
      },
      {
        key: "amountRange",
        label: "Amount Range",
        options: amountRanges,
      },
    ];
  }, [vehicles]);

  const filteredData = useMemo(() => {
    if (!vehicles) return [];

    return vehicles.filter((vehicle) => {
      // Condition filter
      if (
        activeFilters.condition &&
        vehicle.asset_condition !== activeFilters.condition
      ) {
        return false;
      }

      // Location filter
      if (
        activeFilters.location &&
        vehicle.current_location !== activeFilters.location
      ) {
        return false;
      }

      // Year filter
      if (activeFilters.year && vehicle.year_of_purchase) {
        const vehicleYear = vehicle.year_of_purchase.toString();
        if (vehicleYear !== activeFilters.year) {
          return false;
        }
      } else if (activeFilters.year && !vehicle.year_of_purchase) {
        return false;
      }

      // Make/Model filter
      if (
        activeFilters.makeModel &&
        vehicle.make_model !== activeFilters.makeModel
      ) {
        return false;
      }

      // Responsible Officer filter
      if (
        activeFilters.responsibleOfficer &&
        vehicle.responsible_officer !== activeFilters.responsibleOfficer
      ) {
        return false;
      }

      // Amount Range filter
      if (activeFilters.amountRange) {
        const amount = vehicle.amount || 0;
        switch (activeFilters.amountRange) {
          case "Under Ksh 500K":
            if (amount >= 500000) return false;
            break;
          case "Ksh 500K - 1M":
            if (amount < 500000 || amount >= 1000000) return false;
            break;
          case "Ksh 1M - 2M":
            if (amount < 1000000 || amount >= 2000000) return false;
            break;
          case "Ksh 2M - 5M":
            if (amount < 2000000 || amount >= 5000000) return false;
            break;
          case "Over Ksh 5M":
            if (amount < 5000000) return false;
            break;
        }
      }

      return true;
    });
  }, [vehicles, activeFilters]);

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

  const handleViewVehicle = (vehicle: Vehicle) => {
    navigate(`/categories/vehicles/${vehicle.id}`);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    navigate(`/categories/vehicles/${vehicle.id}/edit`);
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  type Column = {
    header: string;
    accessor:
      | keyof Vehicle
      | ((row: Vehicle, rowIndex?: number) => React.ReactNode);
    sortable?: boolean;
    cell?: (value: any) => React.ReactNode;
  };

  const columns: Column[] = [
    {
      header: "#",
      accessor: (row: Vehicle, rowIndex?: number) =>
        rowIndex !== undefined
          ? (currentPage - 1) * pageSize + rowIndex + 1
          : filteredData.indexOf(row) + 1,
      sortable: false,
    },
    {
      header: "Vehicle Reg No.",
      accessor: "registration_number",
      sortable: true,
    },
    { header: "Make & Model", accessor: "make_model", sortable: true },
    {
      header: "Year of Purchase",
      accessor: "year_of_purchase",
      sortable: true,
    },
    {
      header: "Amount",
      accessor: "amount",
      sortable: true,
      cell: (value: number) =>
        value ? `Ksh.${value.toLocaleString()}` : "N/A",
    },
    {
      header: "Current Location",
      accessor: "current_location",
      sortable: true,
    },
    {
      header: "Asset Condition",
      accessor: "asset_condition",
      sortable: true,
      cell: (value: string) => {
        const getConditionColor = (cond: string) => {
          switch (cond?.toLowerCase()) {
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
      header: "Responsible Officer",
      accessor: "responsible_officer",
      sortable: true,
    },
  ];

  const renderActions = (vehicle: Vehicle) => (
    <div className="flex space-x-1 sm:space-x-2">
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-blue-600 rounded hover:text-blue-800 hover:bg-blue-100"
        title="View Vehicle"
        onClick={(e) => {
          e.stopPropagation();
          handleViewVehicle(vehicle);
        }}
      >
        <Eye size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-green-600 rounded hover:text-green-800 hover:bg-green-100"
        title="Edit Vehicle"
        onClick={(e) => {
          e.stopPropagation();
          handleEditVehicle(vehicle);
        }}
      >
        <Edit size={16} />
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

  const statistics = useMemo(() => {
    const total = filteredData.length;
    const newVehicles = filteredData.filter(
      (v) => v.asset_condition?.toLowerCase() === "new"
    ).length;
    const goodVehicles = filteredData.filter(
      (v) => v.asset_condition?.toLowerCase() === "good"
    ).length;
    const needsReplacement = filteredData.filter(
      (v) => v.asset_condition?.toLowerCase() === "needs replacement"
    ).length;

    // Mock trend calculations (in production, compare with previous period data)
    const totalTrend = 4.2;
    const newTrend = 12.5;
    const goodTrend = -3.1;
    const replacementTrend = 8.9;

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
        subtitle: `${
          total > 0 ? ((newVehicles / total) * 100).toFixed(1) : 0
        }% are new vehicles`,
        sparkline: generateSparklineData(total, total * 0.1),
      },
      new: {
        value: newVehicles,
        trend: newTrend,
        subtitle: `${
          total > 0 ? ((newVehicles / total) * 100).toFixed(1) : 0
        }% of total vehicles`,
        sparkline: generateSparklineData(newVehicles, newVehicles * 0.2),
      },
      good: {
        value: goodVehicles,
        trend: goodTrend,
        subtitle: `${
          total > 0 ? ((goodVehicles / total) * 100).toFixed(1) : 0
        }% of total vehicles`,
        sparkline: generateSparklineData(goodVehicles, goodVehicles * 0.15),
      },
      replacement: {
        value: needsReplacement,
        trend: replacementTrend,
        subtitle: `${
          total > 0 ? ((needsReplacement / total) * 100).toFixed(1) : 0
        }% of total vehicles`,
        sparkline: generateSparklineData(
          needsReplacement,
          needsReplacement * 0.3
        ),
      },
    };
  }, [filteredData]);

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header - Row layout for mobile */}
      <div className="px-2 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
          <h1 className="text-lg font-bold text-gray-900 sm:text-2xl">
            Vehicles
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
        <div className="flex space-x-1 sm:space-x-2">
          <Button
            variant="secondary"
            onClick={() => setIsFilterModalOpen(true)}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 ${
              hasActiveFilters
                ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                : ""
            }`}
            title="Filter"
          >
            <Filter size={16} />
            <span className="hidden sm:inline ml-2">Filter</span>
          </Button>
          {/* Mobile: Icon only, Desktop: Icon + Text */}
          <Button
            variant="secondary"
            onClick={handleExport}
            className="px-2 py-1.5 sm:px-4 sm:py-2"
            title="Export"
          >
            <Download size={16} />
            <span className="hidden sm:inline ml-2">Export</span>
          </Button>
          <Button
            variant="primary"
            className="px-2 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700"
            onClick={() => navigate("/categories/vehicles/new")}
            title="Add Vehicle"
          >
            <Plus size={16} />
            <span className="hidden sm:inline ml-2">Add Vehicle</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-lg transition-transform hover:scale-105">
          <div className="p-6 text-white">
            <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Truck className="w-6 h-6" />
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
                {hasActiveFilters ? "Filtered" : "Total"} Vehicles
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
              <p className="text-sm text-green-100 mb-3">New</p>
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

        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg transition-transform hover:scale-105">
          <div className="p-6 text-white">
            <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Car className="w-6 h-6" />
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
              <p className="text-sm text-blue-100 mb-3">Good</p>
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

        <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-red-700 rounded-lg shadow-lg transition-transform hover:scale-105">
          <div className="p-6 text-white">
            <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="mt-16">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-3xl font-bold">
                  {statistics.replacement.value}
                </h3>
                <div
                  className={`flex items-center text-sm font-medium ${
                    statistics.replacement.trend >= 0
                      ? "text-red-200"
                      : "text-green-200"
                  }`}
                >
                  {statistics.replacement.trend >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(statistics.replacement.trend)}%
                </div>
              </div>
              <p className="text-sm text-red-100 mb-3">Need Replacement</p>
              <p className="text-xs text-red-200 mb-2">
                {statistics.replacement.subtitle}
              </p>
              <MiniSparkline
                data={statistics.replacement.sparkline}
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
          <span className="text-sm sm:text-base">Loading vehicles...</span>
        </div>
      ) : filteredData.length === 0 && vehicles.length > 0 ? (
        <Card className="p-2 sm:p-8 text-center">
          <Filter className="mx-auto mb-4 w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
          <h3 className="mb-2 text-base sm:text-lg font-medium text-gray-900">
            No vehicles match your filters
          </h3>
          <p className="mb-4 text-sm sm:text-base text-gray-500">
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
      ) : vehicles.length === 0 ? (
        <Card className="p-2 sm:p-8 text-center">
          <Truck className="mx-auto mb-4 w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
          <h3 className="mb-2 text-base sm:text-lg font-medium text-gray-900">
            No vehicles found
          </h3>
          <p className="mb-4 text-sm sm:text-base text-gray-500">
            Get started by adding your first vehicle.
          </p>
          <Button
            variant="primary"
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2"
            onClick={() => navigate("/categories/vehicles/new")}
          >
            <Plus size={16} className="mr-2" />
            Add Vehicle
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <DataTable<Vehicle>
              data={filteredData}
              columns={columns}
              keyField="id"
              onRowClick={handleViewVehicle}
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
        exportTitle="Vehicles"
      />
    </div>
  );
};

export default VehicleList;
