"use client";

import type React from "react";
import { Filter } from "lucide-react";
import Card from "../../../../../../shared/components/ui/Card";
import type { ReportFilters as Filters, StatusOption } from "../types";

interface ReportFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  locations: string[];
  statusOptions: StatusOption[];
  departments?: string[];
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  locations,
  statusOptions,
  departments = [],
}) => {
  const handleDateChange = (field: "start" | "end", value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value,
      },
    });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value,
    });
  };

  const handleLocationChange = (value: string) => {
    onFiltersChange({
      ...filters,
      location: value,
    });
  };

  const handleDepartmentChange = (value: string) => {
    onFiltersChange({
      ...filters,
      department: value,
    });
  };

  return (
    <Card className="w-full">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-primary" />
          <h3 className="font-semibold text-lg">Report Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date Range Start */}
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => handleDateChange("start", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Report start date"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => handleDateChange("end", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Report end date"
            />
          </div>

          {/* Status/Condition Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Status/Condition
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Filter by status or condition"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <select
              value={filters.location}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Filter by location"
            >
              <option value="all">All Locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter (if available) */}
          {departments.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Department
              </label>
              <select
                value={filters.department || "all"}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Filter by department"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Active Filters Summary */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing data from {filters.dateRange.start} to{" "}
            {filters.dateRange.end}
            {filters.status !== "all" && ` • Status: ${filters.status}`}
            {filters.location !== "all" && ` • Location: ${filters.location}`}
            {filters.department &&
              filters.department !== "all" &&
              ` • Department: ${filters.department}`}
          </p>
        </div>
      </div>
    </Card>
  );
};
