"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, Filter } from "lucide-react";
import DataTable from "../../../../shared/components/ui/DataTable";
import Card from "../../../../shared/components/ui/Card";
import Button from "../../../../shared/components/ui/Button";
import Modal from "../../../../shared/components/ui/Modal";
import { useAuditStore } from "../../../../shared/store/auditStore";
import { format, parseISO } from "date-fns";
import type { AuditLog } from "../../../../shared/store/auditStore";
import { DATE_FORMAT } from "../../../../shared/config/constants";

type Filters = {
  start_date?: string;
  end_date?: string;
  action?: string;
  entity_type?: string;
  status?: string;
  event_category?: string;
  user_id?: string;
};

const DEFAULT_DATE_FORMAT = "dd MMM yyyy, hh:mm a";

const AuditLogs: React.FC = () => {
  const { auditLogs, fetchAuditLogs, exportAuditLogs, isLoading, error } =
    useAuditStore((s) => ({
      auditLogs: s.auditLogs,
      fetchAuditLogs: s.fetchAuditLogs,
      exportAuditLogs: s.exportAuditLogs,
      isLoading: s.isLoading,
      error: s.error,
    }));

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({});

  useEffect(() => {
    void fetchAuditLogs();
  }, []);

  const handleExport = async (fmt: "csv" | "pdf") => {
    try {
      const blob = await exportAuditLogs(fmt);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const normalizeUsername = (row: AuditLog): string => {
    return (
      (row.username as string) ||
      (row.user_name as string) ||
      (row.user_id as string) ||
      "SYSTEM"
    );
  };

  const formatTimestamp = (value?: string): string => {
    if (!value) return "";
    try {
      const dt = parseISO(value);
      const fmt = DATE_FORMAT?.trim() || DEFAULT_DATE_FORMAT;
      return format(dt, fmt);
    } catch {
      return value;
    }
  };

  const columns = useMemo(
    () => [
      {
        header: "Timestamp",
        accessor: (row: AuditLog) => row.timestamp_display,
        cell: (value: string) => (
          <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
            {formatTimestamp(value)}
          </span>
        ),
        sortable: true,
      },
      {
        header: "Username",
        accessor: (row: AuditLog) => normalizeUsername(row),
        cell: (value: string) => (
          <span className="font-medium text-primary-900 dark:text-primary-100">
            {value}
          </span>
        ),
        sortable: true,
      },
      {
        header: "User ID",
        accessor: "user_id",
        cell: (value: string) => (
          <code className="text-xs text-primary-600 dark:text-primary-400 font-mono">
            {value}
          </code>
        ),
        sortable: true,
      },
      {
        header: "Action",
        accessor: "action",
        cell: (value: string) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-accent-100 dark:bg-accent-900 text-accent-800 dark:text-accent-300">
            {value}
          </span>
        ),
        sortable: true,
      },
      {
        header: "Entity Type",
        accessor: "entity_type",
        cell: (value: string) => (
          <span className="text-xs text-primary-600 dark:text-primary-400">
            {value}
          </span>
        ),
        sortable: true,
      },
      {
        header: "Entity ID",
        accessor: "entity_id",
        cell: (value: string) => (
          <code className="text-xs text-primary-500 dark:text-primary-500 font-mono">
            {value}
          </code>
        ),
      },
      {
        header: "Event Category",
        accessor: "event_category",
        cell: (value: string) => (
          <span className="text-xs capitalize text-primary-600 dark:text-primary-400">
            {value?.toLowerCase()}
          </span>
        ),
      },
      {
        header: "Role",
        accessor: "role",
        cell: (value: string) => (
          <span className="text-xs font-medium text-primary-700 dark:text-primary-300 capitalize">
            {value}
          </span>
        ),
      },
      {
        header: "Status",
        accessor: "status",
        cell: (value: string) => {
          const isSuccess = value?.toLowerCase() === "success";
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                isSuccess
                  ? "bg-success-100 dark:bg-success-900 text-success-800 dark:text-success-300"
                  : "bg-error-100 dark:bg-error-900 text-error-800 dark:text-error-300"
              }`}
            >
              {value}
            </span>
          );
        },
      },
      {
        header: "Details",
        accessor: "details",
        cell: (value: string) => (
          <p className="text-xs text-primary-600 dark:text-primary-400 line-clamp-2">
            {value || "—"}
          </p>
        ),
      },
      {
        header: "IP Address",
        accessor: "ip_address",
        cell: (value: string) => (
          <code className="text-xs text-primary-500 dark:text-primary-500 font-mono">
            {value}
          </code>
        ),
      },
      {
        header: "User Agent",
        accessor: "user_agent",
        cell: (value: string) => (
          <p className="text-xs text-primary-500 dark:text-primary-500 line-clamp-1">
            {value || "—"}
          </p>
        ),
      },
    ],
    []
  );

  const applyFilters = () => {
    const cleaned: Filters = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v && String(v).trim()) cleaned[k as keyof Filters] = v;
    });
    void fetchAuditLogs(cleaned);
    setIsFilterModalOpen(false);
  };

  const clearFilters = () => {
    setFilters({});
    void fetchAuditLogs();
    setIsFilterModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary-900 dark:text-primary-50">
            Audit Logs
          </h1>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            View and filter all system activity and security events
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setIsFilterModalOpen(true)}
          >
            Filter
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => void handleExport("csv")}
            disabled={isLoading}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700 overflow-hidden">
        {/* Loading / Error */}
        {isLoading && (
          <div className="p-4 text-center text-sm text-primary-600 dark:text-primary-400">
            Loading audit logs...
          </div>
        )}
        {error && (
          <div className="p-4 text-center text-sm text-error-600 dark:text-error-400">
            Error: {String(error)}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <DataTable<AuditLog>
            data={auditLogs}
            columns={columns}
            keyField="id"
            searchable
            pagination
            // Remove alternating row background
            rowClassName="border-b border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-800 transition-colors"
            headerClassName="bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 font-medium text-xs uppercase tracking-wider"
            cellClassName="px-3 py-2.5 text-sm"
          />
        </div>
      </Card>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Audit Logs"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFilterModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={applyFilters}
              disabled={isLoading}
            >
              Apply Filters
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.start_date ?? ""}
              onChange={(e) =>
                setFilters((s) => ({ ...s, start_date: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.end_date ?? ""}
              onChange={(e) =>
                setFilters((s) => ({ ...s, end_date: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
              Action
            </label>
            <input
              type="text"
              placeholder="e.g. LOGIN_FAILED"
              value={filters.action ?? ""}
              onChange={(e) =>
                setFilters((s) => ({ ...s, action: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 placeholder:text-primary-500 dark:placeholder:text-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
              Entity Type
            </label>
            <input
              type="text"
              placeholder="e.g. user, device"
              value={filters.entity_type ?? ""}
              onChange={(e) =>
                setFilters((s) => ({ ...s, entity_type: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 placeholder:text-primary-500 dark:placeholder:text-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
              Status
            </label>
            <select
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters((s) => ({ ...s, status: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
              User ID
            </label>
            <input
              type="text"
              placeholder="e.g. usr_123"
              value={filters.user_id ?? ""}
              onChange={(e) =>
                setFilters((s) => ({ ...s, user_id: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 placeholder:text-primary-500 dark:placeholder:text-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AuditLogs;
