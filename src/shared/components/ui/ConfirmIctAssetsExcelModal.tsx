"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Info,
  Edit3,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ConfirmIctAssetsExcelModalProps {
  show: boolean;
  data: any[];
  onConfirm: (data: any[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ROW_HEIGHT = 40; // px
const BUFFER_ROWS = 10; // extra rows to render above/below viewport

const ConfirmIctAssetsExcelModal: React.FC<ConfirmIctAssetsExcelModalProps> = ({
  show,
  data,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  const [editedData, setEditedData] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const editInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const prevDataRef = useRef<any[]>([]);

  const REQUIRED_FIELDS = [
    "serial_number",
    "asset_description",
    "financed_by",
    "purchase_amount",
    "asset_type",
  ];

  const COLUMNS = [
    { key: "serial_number", label: "Serial Number *", type: "text" as const },
    {
      key: "asset_description",
      label: "Asset Description *",
      type: "text" as const,
    },
    { key: "tag_number", label: "Tag Number", type: "text" as const },
    { key: "make_model", label: "Make/Model", type: "text" as const },
    {
      key: "financed_by",
      label: "Financed By *",
      type: "select" as const,
      options: [
        "Government",
        "Donor",
        "Internal Funds",
        "Grant",
        "Loan",
        "Other",
      ],
    },
    {
      key: "purchase_amount",
      label: "Purchase Amount *",
      type: "number" as const,
    },
    {
      key: "asset_type",
      label: "Asset Type *",
      type: "select" as const,
      options: [
        "Computer",
        "Printer",
        "Scanner",
        "Server",
        "Network Equipment",
        "Telephone",
        "Projector",
        "Other",
      ],
    },
    {
      key: "current_location",
      label: "Current Location",
      type: "text" as const,
    },
    {
      key: "delivery_installation_date",
      label: "Delivery Date",
      type: "date" as const,
    },
    { key: "notes", label: "Notes", type: "text" as const },
  ];

  // === Data Sync ===
  useEffect(() => {
    if (data !== prevDataRef.current) {
      setEditedData([...data]);
      setSelectedRows(new Set());
      setFocusedCell(null);
      setScrollTop(0);
      prevDataRef.current = data;
    }
  }, [data]);

  // === Focus Input ===
  useEffect(() => {
    if (editInputRef.current) {
      editInputRef.current.focus();
      if ("select" in editInputRef.current) editInputRef.current.select();
    }
  }, [editingIndex, editingField]);

  // === Virtual Scrolling Logic ===
  const { startIndex, endIndex, paddingTop, paddingBottom } = useMemo(() => {
    if (!tableContainerRef.current || editedData.length === 0) {
      return { startIndex: 0, endIndex: 0, paddingTop: 0, paddingBottom: 0 };
    }

    const containerHeight = tableContainerRef.current.clientHeight;
    const totalHeight = editedData.length * ROW_HEIGHT;
    const visibleRows = Math.ceil(containerHeight / ROW_HEIGHT);

    const scrollTopVal = tableContainerRef.current.scrollTop;
    let start = Math.max(
      0,
      Math.floor(scrollTopVal / ROW_HEIGHT) - BUFFER_ROWS
    );
    let end = Math.min(
      editedData.length,
      start + visibleRows + BUFFER_ROWS * 2
    );

    // Clamp
    start = Math.max(0, start);
    end = Math.min(editedData.length, end);

    return {
      startIndex: start,
      endIndex: end,
      paddingTop: start * ROW_HEIGHT,
      paddingBottom: (editedData.length - end) * ROW_HEIGHT,
    };
  }, [scrollTop, editedData.length]);

  // === Scroll Handler (Throttled) ===
  const handleScroll = useCallback(() => {
    if (tableContainerRef.current) {
      setScrollTop(tableContainerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setScrollTop(container.scrollTop);
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // === Keyboard Navigation (Optimized for Virtual) ===
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        !show ||
        editingIndex !== null ||
        editedData.length === 0 ||
        !focusedCell
      )
        return;

      const { row, col } = focusedCell;
      const maxRow = editedData.length - 1;
      let nextRow = row;
      let nextCol = col;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          nextRow = Math.max(0, row - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          nextRow = Math.min(maxRow, row + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          nextCol = Math.max(1, col - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          nextCol = Math.min(COLUMNS.length, col + 1);
          break;
        case "Enter":
          e.preventDefault();
          setEditingIndex(row);
          setEditingField(COLUMNS[col - 1].key);
          return;
        case " ":
          e.preventDefault();
          setSelectedRows((prev) => {
            const next = new Set(prev);
            next.has(row) ? next.delete(row) : next.add(row);
            return next;
          });
          return;
        default:
          return;
      }

      setFocusedCell({ row: nextRow, col: nextCol });

      // Auto-scroll into view
      const container = tableContainerRef.current;
      if (container) {
        const rowTop = nextRow * ROW_HEIGHT;
        const rowBottom = rowTop + ROW_HEIGHT;
        const viewportTop = container.scrollTop;
        const viewportBottom = viewportTop + container.clientHeight;

        if (rowTop < viewportTop) {
          container.scrollTop = rowTop - BUFFER_ROWS * ROW_HEIGHT;
        } else if (rowBottom > viewportBottom) {
          container.scrollTop =
            rowBottom - container.clientHeight + BUFFER_ROWS * ROW_HEIGHT;
        }
      }
    },
    [show, editingIndex, editedData.length, focusedCell]
  );

  useEffect(() => {
    if (show) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [show, handleKeyDown]);

  // === Edit & Selection Handlers ===
  const handleEdit = useCallback((index: number, field: string, value: any) => {
    setEditedData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const startEditing = useCallback((index: number, field: string) => {
    setEditingIndex(index);
    setEditingField(field);
  }, []);

  const stopEditing = useCallback(() => {
    setEditingIndex(null);
    setEditingField(null);
  }, []);

  const toggleRowSelection = useCallback((index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedRows(new Set(editedData.map((_, i) => i)));
  }, [editedData]);

  const deselectAll = useCallback(() => setSelectedRows(new Set()), []);

  const deleteSelected = useCallback(() => {
    setEditedData((prev) => prev.filter((_, i) => !selectedRows.has(i)));
    setSelectedRows(new Set());
  }, [selectedRows]);

  // === Validation ===
  const isRowValid = useCallback(
    (asset: any) =>
      REQUIRED_FIELDS.every((f) => {
        const v = asset[f];
        return v != null && String(v).trim() !== "";
      }),
    []
  );

  const validCount = editedData.filter(isRowValid).length;
  const invalidCount = editedData.length - validCount;
  const selectedCount = selectedRows.size;

  // === Render Field ===
  const renderEditableField = useCallback(
    (value: any, rowIdx: number, colIdx: number) => {
      const column = COLUMNS[colIdx - 1];
      const field = column.key;
      const isEditing = editingIndex === rowIdx && editingField === field;
      const isMissing =
        REQUIRED_FIELDS.includes(field) &&
        (!value || String(value).trim() === "");
      const isFocused =
        focusedCell?.row === rowIdx && focusedCell?.col === colIdx;

      if (isEditing) {
        if (column.type === "select") {
          return (
            <select
              ref={editInputRef as React.RefObject<HTMLSelectElement>}
              value={value || ""}
              onChange={(e) => handleEdit(rowIdx, field, e.target.value)}
              onBlur={stopEditing}
              className="w-full px-2 py-1 text-xs border border-accent-500 bg-white dark:bg-primary-800 rounded focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              <option value="">Select...</option>
              {column.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          );
        }

        return (
          <input
            ref={editInputRef as React.RefObject<HTMLInputElement>}
            type={column.type}
            value={value || ""}
            onChange={(e) => handleEdit(rowIdx, field, e.target.value)}
            onBlur={stopEditing}
            className="w-full px-2 py-1 text-xs border border-accent-500 bg-white dark:bg-primary-800 rounded focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        );
      }

      return (
        <div
          tabIndex={0}
          onFocus={() => setFocusedCell({ row: rowIdx, col: colIdx })}
          onClick={() => startEditing(rowIdx, field)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              startEditing(rowIdx, field);
            }
          }}
          className={`group px-2 py-1 text-xs rounded cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
            isFocused ? "ring-2 ring-accent-500" : ""
          } ${
            isMissing
              ? "bg-error-50 dark:bg-error-950 border border-error-300 dark:border-error-700"
              : "hover:bg-primary-100 dark:hover:bg-primary-700"
          }`}
        >
          <span className="group-hover:hidden text-primary-900 dark:text-primary-100">
            {value || "—"}
          </span>
          <span className="hidden group-hover:inline-flex items-center gap-1 text-accent-600 dark:text-accent-400">
            <Edit3 size={12} />
            {value || "Edit"}
          </span>
        </div>
      );
    },
    [
      editingIndex,
      editingField,
      focusedCell,
      handleEdit,
      startEditing,
      stopEditing,
    ]
  );

  if (!show) return null;

  const visibleData = editedData.slice(startIndex, endIndex);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-primary-800 rounded-lg shadow-xl w-full max-w-[96vw] max-h-[96vh] flex flex-col overflow-hidden border border-primary-200 dark:border-primary-700">
        {/* Header */}
        <div className="sticky top-0 z-20 p-5 pb-3 bg-white dark:bg-primary-800 border-b border-primary-200 dark:border-primary-700">
          <h3 className="text-lg font-bold text-primary-900 dark:text-primary-50">
            Confirm ICT Assets Excel Data
          </h3>
          <p className="mt-1 text-xs text-primary-600 dark:text-primary-400">
            Arrow keys to navigate • Enter to edit • Space to select
          </p>
          <div className="flex items-center gap-2 mt-3 p-2 bg-accent-50 dark:bg-accent-950 rounded-md border border-accent-200 dark:border-accent-800">
            <Info size={14} className="text-accent-600 dark:text-accent-400" />
            <span className="text-xs text-accent-700 dark:text-accent-300">
              Required: Serial Number, Asset Description, Financed By, Purchase
              Amount, Asset Type
            </span>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <div className="sticky top-[104px] z-20 px-5 py-2 bg-primary-100 dark:bg-primary-700 border-b border-primary-200 dark:border-primary-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                {selectedCount} selected
              </span>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900 rounded-md hover:bg-error-100 dark:hover:bg-error-800 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
            <button
              onClick={deselectAll}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Validation Summary */}
        <div className="px-5 pt-3 pb-2">
          <div className="flex gap-4 p-3 bg-primary-50 dark:bg-primary-900 rounded-md border border-primary-200 dark:border-primary-700">
            <div className="text-center">
              <div className="text-base font-bold text-success-600 dark:text-success-400 flex items-center gap-1">
                <CheckCircle size={16} />
                {validCount}
              </div>
              <div className="text-xs text-primary-600 dark:text-primary-400">
                Valid
              </div>
            </div>
            {invalidCount > 0 && (
              <div className="text-center">
                <div className="text-base font-bold text-error-600 dark:text-error-400 flex items-center gap-1">
                  <XCircle size={16} />
                  {invalidCount}
                </div>
                <div className="text-xs text-primary-600 dark:text-primary-400">
                  Missing
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Virtual Table */}
        <div ref={tableContainerRef} className="flex-1 overflow-auto p-5 pt-0">
          <div className="overflow-x-auto rounded-md border border-primary-200 dark:border-primary-700">
            <table ref={tableRef} className="min-w-full table-auto">
              <thead className="sticky top-0 z-10 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold text-left text-primary-700 dark:text-primary-300 w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedCount === editedData.length &&
                        editedData.length > 0
                      }
                      onChange={(e) =>
                        e.target.checked ? selectAll() : deselectAll()
                      }
                      className="w-4 h-4 text-accent-600 rounded border-primary-300 focus:ring-accent-500"
                    />
                  </th>
                  {COLUMNS.map(({ label }) => (
                    <th
                      key={label}
                      className="px-3 py-2 text-xs font-semibold text-left text-primary-700 dark:text-primary-300 whitespace-nowrap"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ height: editedData.length * ROW_HEIGHT }}>
                {/* Padding Top */}
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    style={{ height: paddingTop }}
                  />
                </tr>

                {/* Visible Rows */}
                {visibleData.map((asset, idx) => {
                  const rowIdx = startIndex + idx;
                  const isValid = isRowValid(asset);
                  const isSelected = selectedRows.has(rowIdx);

                  return (
                    <tr
                      key={rowIdx}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-accent-50 dark:bg-accent-950"
                          : !isValid
                          ? "bg-error-50 dark:bg-error-950"
                          : "hover:bg-primary-50 dark:hover:bg-primary-900"
                      }`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(rowIdx)}
                            className="w-4 h-4 text-accent-600 rounded border-primary-300 focus:ring-accent-500"
                          />
                          <button
                            onClick={() => {
                              setEditedData((prev) =>
                                prev.filter((_, i) => i !== rowIdx)
                              );
                              setSelectedRows((s) => {
                                const n = new Set(s);
                                n.delete(rowIdx);
                                return n;
                              });
                            }}
                            className="p-1.5 text-error-600 dark:text-error-400 rounded hover:bg-error-100 dark:hover:bg-error-900"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      {COLUMNS.map((_, colIdx) => (
                        <td key={colIdx} className="px-3 py-2 min-w-[120px]">
                          {renderEditableField(
                            asset[_.key],
                            rowIdx,
                            colIdx + 1
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                {/* Padding Bottom */}
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    style={{ height: paddingBottom }}
                  />
                </tr>
              </tbody>
            </table>

            {editedData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-primary-500 dark:text-primary-400">
                <AlertTriangle size={36} className="mb-2" />
                <p className="text-sm">No data to display</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-5 bg-white dark:bg-primary-800 border-t border-primary-200 dark:border-primary-700">
          <div className="flex items-center justify-between">
            <div className="text-xs text-primary-600 dark:text-primary-400">
              {validCount} of {editedData.length} ready
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-700 rounded-md hover:bg-primary-200 dark:hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(editedData)}
                disabled={isLoading || invalidCount > 0}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                  isLoading || invalidCount > 0
                    ? "bg-primary-300 dark:bg-primary-700 text-primary-500 cursor-not-allowed"
                    : "bg-success-600 dark:bg-success-500 text-white hover:bg-success-700 dark:hover:bg-success-400"
                }`}
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {isLoading ? "Uploading..." : "Confirm Upload"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmIctAssetsExcelModal;
