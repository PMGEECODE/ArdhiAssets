"use client";

import type React from "react";
import { useState } from "react";
import {
  X,
  Filter,
  Printer,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from "lucide-react";
import Button from "./Button";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportLogger } from "../../utils/exportLogger";

import coa from "../../../assets/coa-2.png";

interface FilterOption {
  key: string;
  label: string;
  options: string[];
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterOptions: FilterOption[];
  activeFilters: Record<string, string | undefined>;
  onFilterChange: (filterType: string, value: string | undefined) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  // New props for export functionality
  filteredData?: any[];
  columns?: Array<{
    header: string;
    accessor: string | ((row: any) => any);
    cell?: (value: any) => any;
  }>;
  exportTitle?: string;
}

// Custom Select Component
interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select option",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent flex items-center justify-between"
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown options */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                  value === option.value
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filterOptions,
  activeFilters,
  onFilterChange,
  onClearAll,
  hasActiveFilters,
  filteredData = [],
  columns = [],
  exportTitle = "Filtered Data",
}) => {
  const handleExportToExcel = async () => {
    if (!filteredData.length || !columns.length) {
      console.warn("No data or columns available for export");
      return;
    }

    const startTime = performance.now();
    await exportLogger.logExport(
      "EXCEL",
      exportTitle,
      filteredData.length,
      columns.length,
      "STARTED"
    );

    try {
      const exportData = filteredData.map((row) => {
        const exportRow: any = {};

        columns.forEach((column) => {
          let value;

          if (typeof column.accessor === "function") {
            value = column.accessor(row);
          } else {
            value = row[column.accessor];
          }

          // Apply cell formatting if available
          if (column.cell && typeof column.cell === "function") {
            const cellResult = column.cell(value);
            // Extract text content from React elements
            if (typeof cellResult === "object" && cellResult?.props?.children) {
              value = cellResult.props.children;
            } else if (
              typeof cellResult === "string" ||
              typeof cellResult === "number"
            ) {
              value = cellResult;
            }
          }

          // Clean up the value for Excel
          if (typeof value === "object" && value !== null) {
            value = String(value);
          }

          exportRow[column.header] = value || "";
        });

        return exportRow;
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const colWidths = columns.map((col) => ({
        wch: Math.max(col.header.length, 15),
      }));
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, exportTitle);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${exportTitle.replace(/\s+/g, "_")}_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);

      const duration = performance.now() - startTime;
      await exportLogger.logExport(
        "EXCEL",
        exportTitle,
        filteredData.length,
        columns.length,
        "SUCCESS",
        {
          duration: Math.round(duration),
          filters: activeFilters,
        }
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      await exportLogger.logExport(
        "EXCEL",
        exportTitle,
        filteredData.length,
        columns.length,
        "FAILED",
        {
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          duration: Math.round(duration),
          filters: activeFilters,
        }
      );
      console.error("[v0] Excel export failed:", error);
    }
  };

  const handleExportToPDF = async () => {
    if (!filteredData.length || !columns.length) {
      console.warn("No data or columns available for export");
      return;
    }

    const startTime = performance.now();
    await exportLogger.logExport(
      "PDF",
      exportTitle,
      filteredData.length,
      columns.length,
      "STARTED"
    );

    try {
      const pdf = new jsPDF("l", "mm", "a4");

      // 🔹 Add Coat of Arms (x=14mm, y=8mm, size ~20mm)
      pdf.addImage(coa, "PNG", 14, 8, 20, 20);

      // 🔹 Title (shifted right to avoid logo)
      pdf.setFontSize(16);
      pdf.text(exportTitle, 40, 20);

      // 🔹 Export date
      pdf.setFontSize(10);
      pdf.text(`Exported on: ${new Date().toLocaleDateString()}`, 40, 28);

      // Prepare table
      const tableHeaders = columns.map((col) => col.header);
      const tableData = filteredData.map((row) =>
        columns.map((column) => {
          let value =
            typeof column.accessor === "function"
              ? column.accessor(row)
              : row[column.accessor];

          if (column.cell && typeof column.cell === "function") {
            const cellResult = column.cell(value);
            value =
              typeof cellResult === "object" && cellResult?.props?.children
                ? cellResult.props.children
                : cellResult;
          }

          if (typeof value === "object" && value !== null) {
            value = String(value);
          }

          return String(value || "");
        })
      );

      // Table (starts lower so it doesn't overlap logo)
      autoTable(pdf, {
        head: [tableHeaders],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [147, 51, 234] },
        margin: { top: 40 },
      });

      // Save file
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${exportTitle.replace(/\s+/g, "_")}_${timestamp}.pdf`;
      pdf.save(filename);

      const duration = performance.now() - startTime;
      await exportLogger.logExport(
        "PDF",
        exportTitle,
        filteredData.length,
        columns.length,
        "SUCCESS",
        {
          duration: Math.round(duration),
          filters: activeFilters,
        }
      );
    } catch (error) {
      const duration = performance.now() - startTime;
      await exportLogger.logExport(
        "PDF",
        exportTitle,
        filteredData.length,
        columns.length,
        "FAILED",
        {
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          duration: Math.round(duration),
          filters: activeFilters,
        }
      );
      console.error("[v0] PDF export failed:", error);
    }
  };

  const handlePrint = async () => {
    if (!filteredData.length || !columns.length) {
      console.warn("No data or columns available for printing");
      return;
    }

    const startTime = performance.now();
    await exportLogger.logExport(
      "PRINT",
      exportTitle,
      filteredData.length,
      columns.length,
      "STARTED"
    );

    try {
      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        console.error("Failed to open print window");
        await exportLogger.logExport(
          "PRINT",
          exportTitle,
          filteredData.length,
          columns.length,
          "FAILED",
          {
            errorMessage: "Failed to open print window",
            filters: activeFilters,
          }
        );
        return;
      }

      // Generate HTML content for printing
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${exportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #7c3aed; margin-bottom: 10px; }
            .export-info { margin-bottom: 20px; font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #7c3aed; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${exportTitle}</h1>
          <div class="export-info">
            <p>Exported on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Total records: ${filteredData.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                ${columns.map((col) => `<th>${col.header}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
      `;

      // Add table rows
      filteredData.forEach((row) => {
        htmlContent += "<tr>";
        columns.forEach((column) => {
          let value;

          if (typeof column.accessor === "function") {
            value = column.accessor(row);
          } else {
            value = row[column.accessor];
          }

          // Apply cell formatting if available
          if (column.cell && typeof column.cell === "function") {
            const cellResult = column.cell(value);
            // Extract text content from React elements
            if (typeof cellResult === "object" && cellResult?.props?.children) {
              value = cellResult.props.children;
            } else if (
              typeof cellResult === "string" ||
              typeof cellResult === "number"
            ) {
              value = cellResult;
            }
          }

          // Clean up the value for HTML
          if (typeof value === "object" && value !== null) {
            value = String(value);
          }

          htmlContent += `<td>${String(value || "")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</td>`;
        });
        htmlContent += "</tr>";
      });

      htmlContent += `
            </tbody>
          </table>
        </body>
        </html>
      `;

      // Write content and print
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = async () => {
        printWindow.print();
        printWindow.close();

        const duration = performance.now() - startTime;
        await exportLogger.logExport(
          "PRINT",
          exportTitle,
          filteredData.length,
          columns.length,
          "SUCCESS",
          {
            duration: Math.round(duration),
            filters: activeFilters,
          }
        );
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      await exportLogger.logExport(
        "PRINT",
        exportTitle,
        filteredData.length,
        columns.length,
        "FAILED",
        {
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          duration: Math.round(duration),
          filters: activeFilters,
        }
      );
      console.error("[v0] Print failed:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 filterModal"
        onClick={onClose}
      />

      {/* Filter Modal - Mobile First Design with rounded top-left corner */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-80 lg:w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col filterModal rounded-tl-lg">
        {/* Header - Compact for mobile */}
        <div className="flex items-center justify-between p-2 sm:p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">
              <span className="hidden sm:inline">Filters & Export</span>
              <span className="sm:hidden">Filters</span>
            </h2>
          </div>
          <div className="flex items-center space-x-1">
            {/* Export buttons aligned right */}
            {filteredData.length > 0 && columns.length > 0 && (
              <div className="flex space-x-1 print_export">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrint}
                  className="p-1 sm:p-1.5 hover:bg-gray-100 rounded"
                >
                  <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportToExcel}
                  className="p-1 sm:p-1.5 hover:bg-gray-100 rounded"
                >
                  <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportToPDF}
                  className="p-1 sm:p-1.5 hover:bg-gray-100 rounded"
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-3 sm:space-y-4">
          {/* Filter Options - Compact for mobile */}
          {filterOptions.map((filterOption) => (
            <div key={filterOption.key} className="space-y-1 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                {filterOption.label}
              </label>
              <CustomSelect
                value={activeFilters[filterOption.key] || ""}
                onChange={(value) =>
                  onFilterChange(filterOption.key, value || undefined)
                }
                options={[
                  { value: "", label: `All ${filterOption.label}` },
                  ...filterOption.options.map((option) => ({
                    value: option,
                    label: option,
                  })),
                ]}
                placeholder={`All ${filterOption.label}`}
              />
            </div>
          ))}

          {/* Active Filters Display - Compact for mobile */}
          {hasActiveFilters && (
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700">
                Active Filters
              </h3>
              <div className="space-y-1">
                {Object.entries(activeFilters).map(([key, value]) => {
                  if (!value) return null;
                  const filterOption = filterOptions.find((f) => f.key === key);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-1.5 sm:p-2 bg-purple-50 rounded-md"
                    >
                      <span className="text-xs sm:text-sm text-purple-800 truncate pr-2">
                        {filterOption?.label}: {value}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFilterChange(key, undefined)}
                        className="p-0.5 sm:p-1 text-purple-600 hover:text-purple-800 flex-shrink-0"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Compact for mobile */}
        <div className="p-2 sm:p-3 border-t border-gray-200 space-y-2 flex-shrink-0">
          {hasActiveFilters && (
            <Button
              variant="secondary"
              onClick={onClearAll}
              className="w-full text-xs sm:text-sm py-1.5 sm:py-2"
            >
              Clear All Filters
            </Button>
          )}
          <Button
            variant="primary"
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm py-1.5 sm:py-2"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
};

export default FilterModal;
