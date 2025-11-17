// src/components/ui/DataTable.tsx

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import Button from "./Button";

export interface DataTableColumn<T> {
  header: string;
  accessor: keyof T | ((row: T, rowIndex?: number) => React.ReactNode);
  sortable?: boolean;
  cell?: (value: any, row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  searchable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

function DataTable<T extends object>({
  data = [],
  columns,
  keyField,
  onRowClick,
  actions,
  searchable = true,
  pagination = true,
  pageSize = 10,
  currentPage: externalCurrentPage,
  onPageChange,
  className = "",
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);

  // Use external pagination state if provided, otherwise use internal state
  const currentPage =
    externalCurrentPage !== undefined
      ? externalCurrentPage
      : internalCurrentPage;
  const setCurrentPage = onPageChange || setInternalCurrentPage;

  const handleSort = (accessor: keyof T | ((row: T) => React.ReactNode)) => {
    if (typeof accessor === "function") return;
    if (sortField === accessor) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(accessor);
      setSortDirection("asc");
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      return (
        !searchQuery.trim() ||
        Object.keys(item).some((key) => {
          const value = item[key as keyof T];
          return (
            value != null &&
            String(value).toLowerCase().includes(searchQuery.toLowerCase())
          );
        })
      );
    });
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === bValue) return 0;
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = pagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData;

  return (
    <div className={`w-full fullwin ${className}`}>
      {(searchable || columns.length > 0) && (
        <div className="flex items-center mb-4">
          {searchable && (
            <div className="relative w-full">
              <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
                <Search size={16} className="text-primary-400" />
              </div>
              <input
                type="text"
                className="bg-white border border-primary-200 text-primary-900 text-sm rounded-lg focus:ring-accent-500 focus:border-accent-500 block w-full pl-10 p-2.5"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto relative border border-primary-200 rounded-lg">
        <table className="min-w-full divide-y divide-primary-200 relative">
          <thead className="bg-primary-50 relative z-30">
            <tr>
              {columns.map((column, index) => {
                return (
                  <th
                    key={index}
                    className="px-6 py-3.5 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {column.sortable && (
                        <button
                          onClick={() => handleSort(column.accessor)}
                          className="ml-1 p-1 hover:bg-primary-100 rounded transition-colors"
                        >
                          {sortField === column.accessor ? (
                            sortDirection === "asc" ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
              {actions && (
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-primary-200 relative z-10">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-6 py-4 text-sm text-center text-primary-500"
                >
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={String(row[keyField])}
                  className={`${
                    onRowClick ? "cursor-pointer hover:bg-primary-50" : ""
                  } ${rowIndex % 2 === 0 ? "bg-white" : "bg-primary-50"}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column, colIndex) => {
                    const value =
                      typeof column.accessor === "function"
                        ? column.accessor(row, rowIndex)
                        : column.cell
                        ? column.cell(row[column.accessor], row)
                        : String(row[column.accessor] ?? "");

                    const rowBgColor =
                      rowIndex % 2 === 0 ? "bg-white" : "bg-primary-50";
                    return (
                      <td
                        key={colIndex}
                        className={`px-2 py-2 text-sm whitespace-nowrap text-primary-900 ${rowBgColor}`}
                      >
                        {value}
                      </td>
                    );
                  })}
                  {actions && (
                    <td
                      className={`px-2 py-2 text-sm font-medium text-right whitespace-nowrap ${
                        rowIndex % 2 === 0 ? "bg-white" : "bg-primary-50"
                      }`}
                    >
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-primary-500">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
            {sortedData.length} results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(currentPage + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
