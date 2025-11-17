"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus,
  Download,
  Edit,
  Eye,
  ChevronRight,
  Home,
  Filter,
  Building2,
  Landmark,
  Key,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { useBuildingStore } from "../../../../shared/store/buildingStore";
import type { BuildingType } from "../../../../shared/types";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import DataTable from "../../../../shared/components/ui/DataTable";
import FilterModal from "../../../../shared/components/ui/FilterModal";
import { logCategoryVisit } from "../../../../shared/utils/categoryTracker";

const BuildingList: React.FC = () => {
  const navigate = useNavigate();
  const { buildings, fetchBuildings, isLoading } = useBuildingStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Record<string, string | undefined>
  >({});

  useEffect(() => {
    logCategoryVisit("BUILDINGS_REGISTER", "Buildings Register", {
      buildingCount: buildings?.length || 0,
    });

    fetchBuildings();
  }, [fetchBuildings]);

  const filterOptions = useMemo(() => {
    if (!buildings || buildings.length === 0) return [];

    const isString = (v: any): v is string =>
      v !== undefined && v !== null && v !== "";

    const locations = Array.from(
      new Set(buildings.map((building) => building.location).filter(isString))
    ).sort();

    const buildingTypes = Array.from(
      new Set(
        buildings.map((building) => building.type_of_building).filter(isString)
      )
    ).sort();

    const ownerships = Array.from(
      new Set(
        buildings
          .map((building) => building.building_ownership)
          .filter(isString)
      )
    ).sort();

    return [
      { key: "location", label: "Location", options: locations },
      { key: "buildingType", label: "Building Type", options: buildingTypes },
      { key: "ownership", label: "Ownership", options: ownerships },
    ];
  }, [buildings]);

  const filteredData = useMemo(() => {
    if (!buildings) return [];

    return buildings.filter((building) => {
      if (
        activeFilters.location &&
        building.location !== activeFilters.location
      )
        return false;
      if (
        activeFilters.buildingType &&
        building.type_of_building !== activeFilters.buildingType
      )
        return false;
      if (
        activeFilters.ownership &&
        building.building_ownership !== activeFilters.ownership
      )
        return false;
      return true;
    });
  }, [buildings, activeFilters]);

  const statistics = useMemo(() => {
    const total = filteredData.length;
    const government = filteredData.filter(
      (building) => building.building_ownership?.toLowerCase() === "government"
    ).length;
    const privateOwned = filteredData.filter(
      (building) => building.building_ownership?.toLowerCase() === "private"
    ).length;
    const leased = filteredData.filter(
      (building) => building.building_ownership?.toLowerCase() === "leased"
    ).length;

    const totalValue = filteredData.reduce(
      (sum, building) => sum + (building.net_book_value || 0),
      0
    );

    const totalTrend = 4.2;
    const governmentTrend = 6.8;
    const privateTrend = 3.5;
    const leasedTrend = -1.2;

    const generateSparklineData = (baseValue: number, variance: number) =>
      Array.from({ length: 7 }, () =>
        Math.max(0, baseValue + (Math.random() - 0.5) * variance)
      );

    return {
      total: {
        value: total,
        trend: totalTrend,
        subtitle: `Ksh ${totalValue.toLocaleString()} total value`,
        sparkline: generateSparklineData(total, total * 0.1),
      },
      government: {
        value: government,
        trend: governmentTrend,
        subtitle: `${
          total > 0 ? ((government / total) * 100).toFixed(1) : 0
        }% of total buildings`,
        sparkline: generateSparklineData(government, government * 0.2),
      },
      private: {
        value: privateOwned,
        trend: privateTrend,
        subtitle: `${
          total > 0 ? ((privateOwned / total) * 100).toFixed(1) : 0
        }% of total buildings`,
        sparkline: generateSparklineData(privateOwned, privateOwned * 0.15),
      },
      leased: {
        value: leased,
        trend: leasedTrend,
        subtitle: `${
          total > 0 ? ((leased / total) * 100).toFixed(1) : 0
        }% of total buildings`,
        sparkline: generateSparklineData(leased, leased * 0.3),
      },
    };
  }, [filteredData]);

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  const handleFilterChange = (
    filterType: string,
    value: string | undefined
  ) => {
    setActiveFilters((prev) => ({ ...prev, [filterType]: value }));
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setActiveFilters({});
    setCurrentPage(1);
  };

  const handleViewBuilding = (building: BuildingType) => {
    navigate(`/categories/buildings/${building.id}`);
  };

  const handleEditBuilding = (building: BuildingType) => {
    navigate(`/categories/buildings/${building.id}/edit`);
  };

  type Column = {
    header: string;
    accessor:
      | keyof BuildingType
      | ((row: BuildingType, rowIndex?: number) => React.ReactNode);
    sortable?: boolean;
    cell?: (value: any) => React.ReactNode;
  };

  const columns: Column[] = [
    {
      header: "#",
      accessor: (_: any, rowIndex?: number) =>
        rowIndex !== undefined
          ? (currentPage - 1) * pageSize + rowIndex + 1
          : 0,
      sortable: false,
    },
    {
      header: "Building Name",
      accessor: "description_name_of_building",
      sortable: true,
    },
    {
      header: "Location",
      accessor: "location",
      sortable: true,
      cell: (value: string) => value || "N/A",
    },
    {
      header: "Land Area (ha)",
      accessor: "size_of_land_ha",
      sortable: true,
      cell: (value: number) => (value ? `${value} ha` : "N/A"),
    },
    {
      header: "Building Area (m²)",
      accessor: "plinth_area",
      sortable: true,
      cell: (value: number) => (value ? `${value} m²` : "N/A"),
    },
    {
      header: "Building Type",
      accessor: "type_of_building",
      sortable: true,
      cell: (value: string) => value || "N/A",
    },
    {
      header: "Ownership",
      accessor: "building_ownership",
      sortable: true,
      cell: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === "Government"
              ? "bg-blue-100 text-blue-800"
              : value === "Private"
              ? "bg-green-100 text-green-800"
              : value === "Leased"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value || "N/A"}
        </span>
      ),
    },
    {
      header: "Net Book Value",
      accessor: "net_book_value",
      sortable: true,
      cell: (value: number) =>
        value ? `Ksh. ${value.toLocaleString()}` : "N/A",
    },
  ];

  const renderActions = (building: BuildingType) => (
    <div className="flex space-x-2">
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-accent-600 rounded transition-colors hover:text-accent-800 hover:bg-accent-100 dark:hover:bg-accent-900/20"
        title="View Building Details"
        onClick={(e) => {
          e.stopPropagation();
          handleViewBuilding(building);
        }}
      >
        <Eye size={18} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-success-600 rounded transition-colors hover:text-success-800 hover:bg-success-100 dark:hover:bg-success-900/20"
        title="Edit Building"
        onClick={(e) => {
          e.stopPropagation();
          handleEditBuilding(building);
        }}
      >
        <Edit size={18} />
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
    <div className="min-h-screen bg-primary-50 dark:bg-primary-950">
      <div>
        {/* Breadcrumb */}
        <nav className="sticky top-0 z-10 bg-white border-b border-primary-200 shadow-sm dark:bg-primary-900 dark:border-primary-800">
          <div className="px-2 sm:px-4 lg:px-6">
            <div className="flex items-center py-2 space-x-2 text-sm text-primary-600 dark:text-primary-400">
              <Link
                to="/"
                className="flex items-center transition-colors hover:text-accent-600 dark:hover:text-accent-400"
              >
                <Home size={16} className="mr-1" />
                Home
              </Link>
              <ChevronRight size={16} />
              <Link
                to="/asset-categories"
                className="transition-colors hover:text-accent-600 dark:hover:text-accent-400"
              >
                Asset Categories
              </Link>
              <ChevronRight size={16} />
              <span className="flex items-center font-medium text-primary-900 dark:text-primary-100">
                Buildings Register
              </span>
            </div>
          </div>
        </nav>

        {/* Header */}
        <header className="bg-white border-b border-primary-200 shadow-sm dark:bg-primary-900 dark:border-primary-800">
          <div className="px-2 sm:px-4 lg:px-6">
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center space-x-3">
                <Building2 className="w-8 h-8 text-accent-600 dark:text-accent-400" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-primary-900 dark:text-primary-100">
                    Buildings Register
                  </h1>
                  <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400">
                    Manage and track all building assets
                  </p>
                </div>
                {hasActiveFilters && (
                  <span className="px-2 py-1 text-xs font-medium text-accent-700 bg-accent-50 border border-accent-200 rounded-full dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-700">
                    {Object.values(activeFilters).filter(Boolean).length} filter
                    {Object.values(activeFilters).filter(Boolean).length > 1
                      ? "s"
                      : ""}{" "}
                    active
                  </span>
                )}
              </div>

              <div className="flex space-x-2">
                {/* Filter Button */}
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Filter size={14} />}
                  onClick={() => setIsFilterModalOpen(true)}
                  className={`hidden sm:flex ${
                    hasActiveFilters
                      ? "bg-accent-50 text-accent-700 border border-accent-200 hover:bg-accent-100 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-700 dark:hover:bg-accent-800/30"
                      : "text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-800/30"
                  }`}
                >
                  Filter
                </Button>

                {/* Filter icon-only (mobile) */}
                <Button
                  variant="secondary"
                  size="sm"
                  className={`sm:hidden h-10 w-10 p-2 flex items-center justify-center ${
                    hasActiveFilters
                      ? "bg-accent-50 text-accent-700 border border-accent-200 hover:bg-accent-100 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-700 dark:hover:bg-accent-800/30"
                      : "text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-800/30"
                  }`}
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  <Filter size={18} />
                </Button>

                {/* Export Button (desktop) */}
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download size={14} />}
                  className="hidden sm:flex text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-800/30"
                >
                  Export
                </Button>

                {/* Export icon-only (mobile) */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="sm:hidden h-10 w-10 p-2 flex items-center justify-center text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-800/30"
                >
                  <Download size={18} />
                </Button>

                {/* Add Building Button (desktop) */}
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={() => navigate("/categories/buildings/new")}
                  className="hidden sm:flex bg-success-600 hover:bg-success-700 text-white dark:bg-success-500 dark:hover:bg-success-600"
                >
                  Add Building
                </Button>

                {/* Add Building icon-only (mobile) */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate("/categories/buildings/new")}
                  className="sm:hidden h-10 w-10 p-2 flex items-center justify-center bg-success-600 hover:bg-success-700 text-white dark:bg-success-500 dark:hover:bg-success-600"
                >
                  <Plus size={18} />
                </Button>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <div className="space-y-6">
          {/* Stats Cards - UNTOUCHED */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-lg transition-transform hover:scale-105">
              <div className="p-6 text-white">
                <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="mt-16">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-3xl font-bold">
                      {statistics.total.value}
                    </h3>
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
                  <p className="text-sm text-green-100 mb-3">
                    {hasActiveFilters ? "Filtered" : "Total"} Buildings
                  </p>
                  <p className="text-xs text-green-200 mb-2">
                    {statistics.total.subtitle}
                  </p>
                  <MiniSparkline
                    data={statistics.total.sparkline}
                    color="bg-white/30"
                  />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg transition-transform hover:scale-105">
              <div className="p-6 text-white">
                <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Landmark className="w-6 h-6" />
                </div>
                <div className="mt-16">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-3xl font-bold">
                      {statistics.government.value}
                    </h3>
                    <div
                      className={`flex items-center text-sm font-medium ${
                        statistics.government.trend >= 0
                          ? "text-green-200"
                          : "text-red-200"
                      }`}
                    >
                      {statistics.government.trend >= 0 ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(statistics.government.trend)}%
                    </div>
                  </div>
                  <p className="text-sm text-blue-100 mb-3">Government</p>
                  <p className="text-xs text-blue-200 mb-2">
                    {statistics.government.subtitle}
                  </p>
                  <MiniSparkline
                    data={statistics.government.sparkline}
                    color="bg-white/30"
                  />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg shadow-lg transition-transform hover:scale-105">
              <div className="p-6 text-white">
                <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Home className="w-6 h-6" />
                </div>
                <div className="mt-16">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-3xl font-bold">
                      {statistics.private.value}
                    </h3>
                    <div
                      className={`flex items-center text-sm font-medium ${
                        statistics.private.trend >= 0
                          ? "text-green-200"
                          : "text-red-200"
                      }`}
                    >
                      {statistics.private.trend >= 0 ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(statistics.private.trend)}%
                    </div>
                  </div>
                  <p className="text-sm text-emerald-100 mb-3">Private</p>
                  <p className="text-xs text-emerald-200 mb-2">
                    {statistics.private.subtitle}
                  </p>
                  <MiniSparkline
                    data={statistics.private.sparkline}
                    color="bg-white/30"
                  />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-lg shadow-lg transition-transform hover:scale-105">
              <div className="p-6 text-white">
                <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Key className="w-6 h-6" />
                </div>
                <div className="mt-16">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-3xl font-bold">
                      {statistics.leased.value}
                    </h3>
                    <div
                      className={`flex items-center text-sm font-medium ${
                        statistics.leased.trend >= 0
                          ? "text-green-200"
                          : "text-red-200"
                      }`}
                    >
                      {statistics.leased.trend >= 0 ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(statistics.leased.trend)}%
                    </div>
                  </div>
                  <p className="text-sm text-yellow-100 mb-3">Leased</p>
                  <p className="text-xs text-yellow-200 mb-2">
                    {statistics.leased.subtitle}
                  </p>
                  <MiniSparkline
                    data={statistics.leased.sparkline}
                    color="bg-white/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Loading or Table */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12 space-x-2 text-primary-600 dark:text-primary-400">
              <svg
                className="w-5 h-5 text-accent-600 animate-spin dark:text-accent-400"
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
              <span className="text-sm font-medium">Loading buildings...</span>
            </div>
          ) : (
            <Card className="p-2 sm:p-3">
              <DataTable<BuildingType>
                data={filteredData}
                columns={columns}
                keyField="id"
                onRowClick={handleViewBuilding}
                actions={renderActions}
                searchable
                pagination
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </Card>
          )}
        </div>
      </main>

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
        exportTitle="Buildings Register"
      />
    </div>
  );
};

export default BuildingList;
