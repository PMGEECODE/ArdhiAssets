import React, { useState } from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import Button from "./Button";
import CustomSelect from "./CustomSelect";

interface FilterOption {
  label: string;
  value: string;
}

interface MobileFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: {
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }[];
  onClearFilters?: () => void;
}

const MobileFilters: React.FC<MobileFiltersProps> = ({
  searchValue,
  onSearchChange,
  filters = [],
  onClearFilters,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<number | null>(null);

  const hasActiveFilters = filters.some((filter) => filter.value !== "");

  return (
    <div className="space-y-3">
      {/* Search Bar - Full width on mobile */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search vehicles..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 text-base border border-gray-300 rounded-lg 
                   focus:ring-2 focus:ring-purple-500 focus:border-transparent
                   placeholder-gray-500 bg-white shadow-sm
                   sm:text-sm sm:py-2"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Filter Toggle Button - Mobile */}
      {filters.length > 0 && (
        <div className="sm:hidden">
          <Button
            variant="secondary"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full justify-between py-3 text-base"
          >
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">
                  {filters.filter((f) => f.value !== "").length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                isFilterOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
        </div>
      )}

      {/* Desktop Filters - Horizontal */}
      <div className="hidden sm:flex sm:flex-wrap sm:gap-3">
        {filters.map((filter, index) => (
          <div key={index} className="min-w-0 flex-1">
            <CustomSelect
              options={filter.options}
              value={filter.value}
              onChange={filter.onChange}
              placeholder={filter.label}
              className="text-sm"
            />
          </div>
        ))}
        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            onClick={onClearFilters}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Mobile Filter Panel */}
      {isFilterOpen && (
        <div className="sm:hidden bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-4">
          {filters.map((filter, index) => (
            <div key={index}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {filter.label}
              </label>
              <CustomSelect
                options={filter.options}
                value={filter.value}
                onChange={filter.onChange}
                placeholder={`All ${filter.label}`}
              />
            </div>
          ))}

          {hasActiveFilters && onClearFilters && (
            <div className="pt-2 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={() => {
                  onClearFilters();
                  setIsFilterOpen(false);
                }}
                className="w-full justify-center py-3 text-base text-gray-600 hover:text-gray-800"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileFilters;
