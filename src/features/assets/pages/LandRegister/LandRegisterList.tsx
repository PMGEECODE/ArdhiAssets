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
  MapPin,
  Filter,
  TrendingUp,
  TrendingDown,
  Building2,
  Landmark,
  CheckCircle,
} from "lucide-react";

import { useLandRegisterStore } from "../../../../shared/store/landRegisterStore";
import type { LandRegister } from "../../../../shared/store/landRegisterStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import DataTable from "../../../../shared/components/ui/DataTable";
import FilterModal from "../../../../shared/components/ui/FilterModal";
import { logCategoryVisit } from "../../../../shared/utils/categoryTracker";

const LandRegisterList: React.FC = () => {
  const navigate = useNavigate();
  const { landRegisters, fetchLandRegisters, isLoading } =
    useLandRegisterStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Record<string, string | undefined>
  >({});

  useEffect(() => {
    logCategoryVisit("LAND_REGISTER", "Land Register", {
      landCount: landRegisters?.length || 0,
    });
    fetchLandRegisters();
  }, [fetchLandRegisters]);

  const filterOptions = useMemo(() => {
    if (!landRegisters || landRegisters.length === 0) return [];

    const counties = Array.from(
      new Set(landRegisters.map((land) => land.county).filter(Boolean))
    ).sort();
    const categories = Array.from(
      new Set(landRegisters.map((land) => land.category).filter(Boolean))
    ).sort();
    const landTenures = Array.from(
      new Set(landRegisters.map((land) => land.land_tenure).filter(Boolean))
    ).sort();
    const surveyedStatuses = Array.from(
      new Set(landRegisters.map((land) => land.surveyed).filter(Boolean))
    ).sort();
    const disputedStatuses = Array.from(
      new Set(landRegisters.map((land) => land.disputed).filter(Boolean))
    ).sort();
    const acquisitionModes = Array.from(
      new Set(
        landRegisters.map((land) => land.mode_of_acquisition).filter(Boolean)
      )
    ).sort();

    return [
      { key: "county", label: "County", options: counties },
      { key: "category", label: "Category", options: categories },
      { key: "landTenure", label: "Land Tenure", options: landTenures },
      { key: "surveyed", label: "Survey Status", options: surveyedStatuses },
      { key: "disputed", label: "Disputed Status", options: disputedStatuses },
      {
        key: "acquisitionMode",
        label: "Mode of Acquisition",
        options: acquisitionModes,
      },
    ];
  }, [landRegisters]);

  const filteredData = useMemo(() => {
    if (!landRegisters) return [];

    return landRegisters.filter((land) => {
      if (activeFilters.county && land.county !== activeFilters.county)
        return false;
      if (activeFilters.category && land.category !== activeFilters.category)
        return false;
      if (
        activeFilters.landTenure &&
        land.land_tenure !== activeFilters.landTenure
      )
        return false;
      if (activeFilters.surveyed && land.surveyed !== activeFilters.surveyed)
        return false;
      if (activeFilters.disputed && land.disputed !== activeFilters.disputed)
        return false;
      if (
        activeFilters.acquisitionMode &&
        land.mode_of_acquisition !== activeFilters.acquisitionMode
      )
        return false;
      return true;
    });
  }, [landRegisters, activeFilters]);

  const statistics = useMemo(() => {
    const total = filteredData.length;
    const landCategory = filteredData.filter(
      (land) => land.category?.toLowerCase() === "land"
    ).length;
    const investmentProperty = filteredData.filter(
      (land) => land.category?.toLowerCase() === "investment property"
    ).length;
    const freeholdTenure = filteredData.filter(
      (land) => land.land_tenure?.toLowerCase() === "freehold"
    ).length;

    const totalValue = filteredData.reduce(
      (sum, land) => sum + (land.fair_value || 0),
      0
    );

    const totalTrend = 5.3;
    const landTrend = 8.7;
    const investmentTrend = -2.4;
    const freeholdTrend = 6.1;

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
      land: {
        value: landCategory,
        trend: landTrend,
        subtitle: `${
          total > 0 ? ((landCategory / total) * 100).toFixed(1) : 0
        }% of total records`,
        sparkline: generateSparklineData(landCategory, landCategory * 0.2),
      },
      investment: {
        value: investmentProperty,
        trend: investmentTrend,
        subtitle: `${
          total > 0 ? ((investmentProperty / total) * 100).toFixed(1) : 0
        }% of total records`,
        sparkline: generateSparklineData(
          investmentProperty,
          investmentProperty * 0.15
        ),
      },
      freehold: {
        value: freeholdTenure,
        trend: freeholdTrend,
        subtitle: `${
          total > 0 ? ((freeholdTenure / total) * 100).toFixed(1) : 0
        }% of total records`,
        sparkline: generateSparklineData(freeholdTenure, freeholdTenure * 0.3),
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

  const handleViewLandRegister = (landRegister: LandRegister) => {
    navigate(`/categories/land-register/${landRegister.id}`);
  };

  const handleEditLandRegister = (landRegister: LandRegister) => {
    navigate(`/categories/land-register/${landRegister.id}?edit=true`);
  };

  type Column = {
    header: string;
    accessor:
      | keyof LandRegister
      | ((row: LandRegister, rowIndex?: number) => React.ReactNode);
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
      header: "Description",
      accessor: "description_of_land",
      sortable: true,
      cell: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      ),
    },
    {
      header: "Location",
      accessor: (row: LandRegister) =>
        `${row.location || ""} ${row.county ? `, ${row.county}` : ""}`.trim() ||
        "N/A",
      cell: (value: string) => value,
    },
    {
      header: "LR Certificate No.",
      accessor: "lr_certificate_no",
      sortable: true,
      cell: (value: string) => value || "N/A",
    },
    {
      header: "Size (ha)",
      accessor: "size_ha",
      sortable: true,
      cell: (value: number) => (value ? `${value} ha` : "N/A"),
    },
    {
      header: "Category",
      accessor: "category",
      sortable: true,
      cell: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === "Land"
              ? "bg-green-100 text-green-800"
              : value === "Investment Property"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value || "N/A"}
        </span>
      ),
    },
    {
      header: "Land Tenure",
      accessor: "land_tenure",
      sortable: true,
      cell: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === "Freehold"
              ? "bg-emerald-100 text-emerald-800"
              : value === "Leasehold"
              ? "bg-orange-100 text-orange-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value || "N/A"}
        </span>
      ),
    },
    {
      header: "Fair Value",
      accessor: "fair_value",
      sortable: true,
      cell: (value: number) =>
        value ? `Ksh.${value.toLocaleString()}` : "N/A",
    },
    {
      header: "Mode of Acquisition",
      accessor: "mode_of_acquisition",
      sortable: true,
      cell: (value: string) => value || "N/A",
    },
    {
      header: "Survey Status",
      accessor: "surveyed",
      sortable: true,
      cell: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === "Surveyed"
              ? "bg-green-100 text-green-800"
              : value === "Not Surveyed"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value || "N/A"}
        </span>
      ),
    },
    {
      header: "Disputed Status",
      accessor: "disputed",
      sortable: true,
      cell: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === "Undisputed"
              ? "bg-green-100 text-green-800"
              : value === "Disputed"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value || "N/A"}
        </span>
      ),
    },
  ];

  const renderActions = (landRegister: LandRegister) => (
    <div className="flex space-x-2">
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-accent-600 rounded transition-colors hover:text-accent-800 hover:bg-accent-100 dark:hover:bg-accent-900/20"
        title="View Land Register Details"
        onClick={(e) => {
          e.stopPropagation();
          handleViewLandRegister(landRegister);
        }}
      >
        <Eye size={18} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-success-600 rounded transition-colors hover:text-success-800 hover:bg-success-100 dark:hover:bg-success-900/20"
        title="Edit Land Register"
        onClick={(e) => {
          e.stopPropagation();
          handleEditLandRegister(landRegister);
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
                <MapPin size={16} className="mr-1" />
                Land Register
              </span>
            </div>
          </div>
        </nav>

        {/* Header */}
        <header className="bg-white border-b border-primary-200 shadow-sm dark:bg-primary-900 dark:border-primary-800">
          <div className="px-2 sm:px-4 lg:px-6">
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-8 h-8 text-accent-600 dark:text-accent-400" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-primary-900 dark:text-primary-100">
                    Land Register
                  </h1>
                  <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400">
                    Manage and track all land assets
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
                  className={`${
                    hasActiveFilters
                      ? "bg-accent-50 text-accent-700 border border-accent-200 hover:bg-accent-100 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-700 dark:hover:bg-accent-800/30"
                      : "text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-800/30"
                  }`}
                >
                  <span className="hidden sm:inline ml-1">Filter</span>
                </Button>

                {/* Export Button */}
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download size={14} />}
                  className="text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-800/30"
                >
                  <span className="hidden sm:inline ml-1">Export</span>
                </Button>

                {/* Add Land Record Button */}
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={() => navigate("/categories/land-register/new")}
                  className="bg-success-600 hover:bg-success-700 text-white dark:bg-success-500 dark:hover:bg-success-600"
                >
                  <span className="hidden sm:inline ml-1">Add Land Record</span>
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
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg shadow-lg transition-transform hover:scale-105">
              <div className="p-6 text-white">
                <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <MapPin className="w-6 h-6" />
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
                  <p className="text-sm text-emerald-100 mb-3">
                    {hasActiveFilters ? "Filtered" : "Total"} Land Records
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

            <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-lg transition-transform hover:scale-105">
              <div className="p-6 text-white">
                <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Landmark className="w-6 h-6" />
                </div>
                <div className="mt-16">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-3xl font-bold">
                      {statistics.land.value}
                    </h3>
                    <div
                      className={`flex items-center text-sm font-medium ${
                        statistics.land.trend >= 0
                          ? "text-green-200"
                          : "text-red-200"
                      }`}
                    >
                      {statistics.land.trend >= 0 ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(statistics.land.trend)}%
                    </div>
                  </div>
                  <p className="text-sm text-green-100 mb-3">Land</p>
                  <p className="text-xs text-green-200 mb-2">
                    {statistics.land.subtitle}
                  </p>
                  <MiniSparkline
                    data={statistics.land.sparkline}
                    color="bg-white/30"
                  />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg transition-transform hover:scale-105">
              <div className="p-6 text-white">
                <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="mt-16">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-3xl font-bold">
                      {statistics.investment.value}
                    </h3>
                    <div
                      className={`flex items-center text-sm font-medium ${
                        statistics.investment.trend >= 0
                          ? "text-green-200"
                          : "text-red-200"
                      }`}
                    >
                      {statistics.investment.trend >= 0 ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(statistics.investment.trend)}%
                    </div>
                  </div>
                  <p className="text-sm text-blue-100 mb-3">
                    Investment Property
                  </p>
                  <p className="text-xs text-blue-200 mb-2">
                    {statistics.investment.subtitle}
                  </p>
                  <MiniSparkline
                    data={statistics.investment.sparkline}
                    color="bg-white/30"
                  />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 to-teal-700 rounded-lg shadow-lg transition-transform hover:scale-105">
              <div className="p-6 text-white">
                <div className="absolute top-4 left-4 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="mt-16">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-3xl font-bold">
                      {statistics.freehold.value}
                    </h3>
                    <div
                      className={`flex items-center text-sm font-medium ${
                        statistics.freehold.trend >= 0
                          ? "text-green-200"
                          : "text-red-200"
                      }`}
                    >
                      {statistics.freehold.trend >= 0 ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(statistics.freehold.trend)}%
                    </div>
                  </div>
                  <p className="text-sm text-teal-100 mb-3">Freehold</p>
                  <p className="text-xs text-teal-200 mb-2">
                    {statistics.freehold.subtitle}
                  </p>
                  <MiniSparkline
                    data={statistics.freehold.sparkline}
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
              <span className="text-sm font-medium">
                Loading land registers...
              </span>
            </div>
          ) : (
            <Card className="p-2 sm:p-3">
              <DataTable<LandRegister>
                data={filteredData}
                columns={columns}
                keyField="id"
                onRowClick={handleViewLandRegister}
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
        exportTitle="Land Register"
      />
    </div>
  );
};

export default LandRegisterList;
