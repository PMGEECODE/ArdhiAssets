"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import {
  User,
  MapPin,
  Building,
  FileText,
  X,
  History,
  Computer,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import Button from "./Button";
import type { IctAssetTransfer } from "../../store/ictAssetsStore";
import { API_URL } from "../../../shared/config/constants";

interface IctAssetTransferHistoryModalProps {
  assetId: string;
  assetDescription: string;
  isOpen: boolean;
  onClose: () => void;
}

const IctAssetTransferHistoryModal: React.FC<
  IctAssetTransferHistoryModalProps
> = ({ assetId, assetDescription, isOpen, onClose }) => {
  const [transfers, setTransfers] = useState<IctAssetTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Read more state for reasons
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!isOpen || !assetId) return;

    const fetchTransferHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const storedAuth = localStorage.getItem("auth-storage");
        const authData = storedAuth ? JSON.parse(storedAuth) : null;
        const token = authData?.state?.token;

        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(
          `${API_URL}/ict-assets/${assetId}/transfers`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch transfer history");
        }

        const transferData = await response.json();
        setTransfers(transferData);
      } catch (err) {
        console.error("Error fetching transfer history:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load transfer history"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransferHistory();
  }, [assetId, isOpen]);

  // Filter and search logic
  const filteredTransfers = useMemo(() => {
    let filtered = [...transfers];

    // Search filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (transfer) =>
          transfer.assigned_to?.toLowerCase().includes(lowerSearchTerm) ||
          transfer.previous_owner?.toLowerCase().includes(lowerSearchTerm) ||
          transfer.transfer_location?.toLowerCase().includes(lowerSearchTerm) ||
          transfer.transfer_department
            ?.toLowerCase()
            .includes(lowerSearchTerm) ||
          transfer.transfer_reason?.toLowerCase().includes(lowerSearchTerm) ||
          transfer.approved_by?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((transfer) => {
        const status = (transfer.status || "pending approval").toLowerCase();
        return status === statusFilter.toLowerCase();
      });
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      now.setHours(23, 59, 59, 999); // Set to end of today for proper comparison

      filtered = filtered.filter((transfer) => {
        const transferDate = new Date(transfer.transfer_date);
        switch (dateFilter) {
          case "today":
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            return transferDate >= today && transferDate <= endOfToday;
          case "week":
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            weekAgo.setHours(0, 0, 0, 0);
            return transferDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            monthAgo.setHours(0, 0, 0, 0);
            return transferDate >= monthAgo;
          case "year":
            const yearAgo = new Date(now);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            yearAgo.setHours(0, 0, 0, 0);
            return transferDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.transfer_date).getTime() -
        new Date(a.transfer_date).getTime()
    );
  }, [transfers, searchTerm, statusFilter, dateFilter]);

  if (!isOpen) return null;

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return (
          <CheckCircle
            size={12}
            className="text-success-600 dark:text-success-400"
          />
        );
      case "pending approval":
        return (
          <AlertCircle
            size={12}
            className="text-warning-600 dark:text-warning-400"
          />
        );
      default:
        return (
          <AlertCircle
            size={12}
            className="text-primary-500 dark:text-primary-400"
          />
        );
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-success-50 text-success-700 border border-success-200 dark:bg-success-900/30 dark:text-success-300 dark:border-success-700";
      case "pending approval":
        return "bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-900/30 dark:text-warning-300 dark:border-warning-700";
      default:
        return "bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-700";
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("all");
    setShowFilters(false);
  };

  const toggleReasonExpansion = (transferId: string) => {
    const newExpanded = new Set(expandedReasons);
    if (newExpanded.has(transferId)) {
      newExpanded.delete(transferId);
    } else {
      newExpanded.add(transferId);
    }
    setExpandedReasons(newExpanded);
  };

  const isReasonExpanded = (transferId: string) =>
    expandedReasons.has(transferId);

  const shouldShowReadMore = (reason: string) => reason && reason.length > 50;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 pt-2 pb-2 backdrop-blur-sm">
      <div className="bg-white dark:bg-primary-900 rounded-lg shadow-xl w-full max-w-7xl h-[95vh] overflow-hidden flex flex-col border border-primary-200 dark:border-primary-800">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-3 sm:p-4 border-b border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/50 flex-shrink-0">
          <div className="flex items-start space-x-2 flex-1 min-w-0">
            <div className="p-1 bg-accent-100 dark:bg-accent-900/30 rounded-md flex-shrink-0">
              <Computer
                className="text-accent-600 dark:text-accent-400"
                size={16}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-primary-900 dark:text-primary-100 leading-tight">
                Transfer History
              </h2>
              <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 mt-0.5 break-words">
                {assetDescription}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 flex-shrink-0 ml-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 flex-shrink-0">
          <div className="flex flex-col gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-3 text-primary-400 dark:text-primary-500"
              />
              <input
                type="text"
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-primary-300 dark:border-primary-700 rounded-md bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 placeholder-primary-500 dark:placeholder-primary-400 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 dark:focus:ring-accent-400 dark:focus:border-accent-400 transition-colors"
              />
            </div>

            {/* Filter Toggle and Clear */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800/30"
              >
                <Filter size={14} />
                <span className="text-sm">Filters</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </Button>

              {(searchTerm ||
                statusFilter !== "all" ||
                dateFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-sm py-2.5 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                >
                  Clear All Filters
                </Button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="p-3 border border-primary-300 dark:border-primary-700 rounded-md bg-white dark:bg-primary-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-primary-300 dark:border-primary-700 rounded-md bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 dark:focus:ring-accent-400 dark:focus:border-accent-400 transition-colors"
                    >
                      <option value="all">All Status</option>
                      <option value="approved">Approved</option>
                      <option value="pending approval">Pending Approval</option>
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                      Date Range
                    </label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-primary-300 dark:border-primary-700 rounded-md bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 dark:focus:ring-accent-400 dark:focus:border-accent-400 transition-colors"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                      <option value="year">Last Year</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className="text-xs sm:text-sm text-primary-600 dark:text-primary-400">
              Showing {filteredTransfers.length} of {transfers.length} transfers
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-primary-900">
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-t-accent-600 border-primary-200 animate-spin dark:border-t-accent-400 dark:border-primary-700"></div>
              <span className="ml-3 text-accent-600 dark:text-accent-400 text-sm">
                Loading transfer history...
              </span>
            </div>
          )}

          {error && (
            <div className="py-12 text-center px-4">
              <div className="text-error-600 dark:text-error-400 mb-2 font-medium text-base">
                Failed to load transfer history
              </div>
              <div className="text-sm text-primary-500 dark:text-primary-400">
                {error}
              </div>
            </div>
          )}

          {!isLoading &&
            !error &&
            filteredTransfers.length === 0 &&
            transfers.length === 0 && (
              <div className="py-12 text-center px-4">
                <div className="p-3 bg-primary-100 dark:bg-primary-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <History
                    className="text-primary-400 dark:text-primary-500"
                    size={32}
                  />
                </div>
                <div className="text-primary-700 dark:text-primary-300 mb-2 font-medium text-base">
                  No transfer history found
                </div>
                <div className="text-sm text-primary-500 dark:text-primary-400">
                  This ICT asset has not been transferred yet.
                </div>
              </div>
            )}

          {!isLoading &&
            !error &&
            filteredTransfers.length === 0 &&
            transfers.length > 0 && (
              <div className="py-12 text-center px-4">
                <div className="p-3 bg-primary-100 dark:bg-primary-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Search
                    className="text-primary-400 dark:text-primary-500"
                    size={32}
                  />
                </div>
                <div className="text-primary-700 dark:text-primary-300 mb-2 font-medium text-base">
                  No transfers match your filters
                </div>
                <div className="text-sm text-primary-500 dark:text-primary-400">
                  Try adjusting your search or filter criteria.
                </div>
              </div>
            )}

          {!isLoading && !error && filteredTransfers.length > 0 && (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden">
                <div className="p-3 space-y-3">
                  {filteredTransfers.map((transfer, index) => (
                    <div
                      key={transfer.id}
                      className={`border rounded-lg p-4 ${
                        index === 0
                          ? "border-accent-300 bg-accent-50 dark:border-accent-700 dark:bg-accent-900/30"
                          : "border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900"
                      }`}
                    >
                      {/* Header with date and status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-primary-900 dark:text-primary-100 text-sm">
                            {format(
                              new Date(transfer.transfer_date),
                              "MMM dd, yyyy"
                            )}
                          </div>
                          <div className="text-xs text-primary-500 dark:text-primary-400">
                            {format(new Date(transfer.transfer_date), "HH:mm")}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusStyle(
                              transfer.status || "pending approval"
                            )}`}
                          >
                            {getStatusIcon(
                              transfer.status || "pending approval"
                            )}
                            <span>{transfer.status || "Pending Approval"}</span>
                          </div>
                          {index === 0 && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-accent-100 text-accent-700 rounded-full dark:bg-accent-900/30 dark:text-accent-300">
                              Latest
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Transfer details */}
                      <div className="space-y-2">
                        {/* From → To */}
                        <div className="flex items-start space-x-2">
                          <User
                            size={14}
                            className="text-primary-400 dark:text-primary-500 mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            {transfer.previous_owner && (
                              <div className="text-xs text-primary-600 dark:text-primary-400 mb-1">
                                <span className="font-medium">From:</span>{" "}
                                {transfer.previous_owner}
                              </div>
                            )}
                            <div className="text-sm text-primary-900 dark:text-primary-100">
                              <span className="font-medium">To:</span>{" "}
                              {transfer.assigned_to}
                            </div>
                          </div>
                        </div>

                        {/* Location */}
                        {transfer.transfer_location && (
                          <div className="flex items-start space-x-2">
                            <MapPin
                              size={14}
                              className="text-primary-400 dark:text-primary-500 mt-0.5 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-primary-900 dark:text-primary-100">
                                {transfer.transfer_location}
                              </div>
                              {transfer.transfer_room_or_floor && (
                                <div className="text-xs text-primary-600 dark:text-primary-400">
                                  {transfer.transfer_room_or_floor}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Department */}
                        {transfer.transfer_department && (
                          <div className="flex items-center space-x-2">
                            <Building
                              size={14}
                              className="text-primary-400 dark:text-primary-500 flex-shrink-0"
                            />
                            <span className="text-sm text-primary-900 dark:text-primary-100">
                              {transfer.transfer_department}
                            </span>
                          </div>
                        )}

                        {/* Approved By */}
                        {transfer.approved_by && (
                          <div className="flex items-center space-x-2">
                            <UserCheck
                              size={14}
                              className="text-success-600 dark:text-success-400 flex-shrink-0"
                            />
                            <span className="text-sm text-primary-900 dark:text-primary-100">
                              <span className="font-medium">Approved by:</span>{" "}
                              {transfer.approved_by}
                            </span>
                          </div>
                        )}

                        {/* Reason */}
                        {transfer.transfer_reason && (
                          <div className="flex items-start space-x-2">
                            <FileText
                              size={14}
                              className="text-primary-400 dark:text-primary-500 mt-0.5 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-primary-900 dark:text-primary-100">
                                {shouldShowReadMore(
                                  transfer.transfer_reason
                                ) ? (
                                  <>
                                    {isReasonExpanded(transfer.id)
                                      ? transfer.transfer_reason
                                      : `${transfer.transfer_reason.substring(
                                          0,
                                          50
                                        )}...`}
                                    <button
                                      onClick={() =>
                                        toggleReasonExpansion(transfer.id)
                                      }
                                      className="ml-2 text-accent-600 hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300 text-xs font-medium underline"
                                    >
                                      {isReasonExpanded(transfer.id)
                                        ? "Read Less"
                                        : "Read More"}
                                    </button>
                                  </>
                                ) : (
                                  transfer.transfer_reason
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-primary-50 dark:bg-primary-900/50 border-b border-primary-200 dark:border-primary-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-primary-700 dark:text-primary-300 min-w-[120px]">
                        <div className="flex items-center space-x-1">
                          <Calendar
                            size={12}
                            className="text-primary-500 dark:text-primary-400"
                          />
                          <span>Date</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-primary-700 dark:text-primary-300 min-w-[100px]">
                        <div className="flex items-center space-x-1">
                          <CheckCircle
                            size={12}
                            className="text-primary-500 dark:text-primary-400"
                          />
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-primary-700 dark:text-primary-300 min-w-[150px]">
                        <div className="flex items-center space-x-1">
                          <User
                            size={12}
                            className="text-primary-500 dark:text-primary-400"
                          />
                          <span>From → To</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-primary-700 dark:text-primary-300 min-w-[120px]">
                        <div className="flex items-center space-x-1">
                          <MapPin
                            size={12}
                            className="text-primary-500 dark:text-primary-400"
                          />
                          <span>Location</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-primary-700 dark:text-primary-300 min-w-[100px]">
                        <div className="flex items-center space-x-1">
                          <Building
                            size={12}
                            className="text-primary-500 dark:text-primary-400"
                          />
                          <span>Department</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-primary-700 dark:text-primary-300 min-w-[120px]">
                        <div className="flex items-center space-x-1">
                          <UserCheck
                            size={12}
                            className="text-primary-500 dark:text-primary-400"
                          />
                          <span>Approved By</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-primary-700 dark:text-primary-300 min-w-[200px]">
                        <div className="flex items-center space-x-1">
                          <FileText
                            size={12}
                            className="text-primary-500 dark:text-primary-400"
                          />
                          <span>Reason</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-200 dark:divide-primary-800">
                    {filteredTransfers.map((transfer, index) => (
                      <tr
                        key={transfer.id}
                        className={`hover:bg-primary-50 dark:hover:bg-primary-800/30 ${
                          index === 0
                            ? "bg-accent-50 dark:bg-accent-900/30"
                            : ""
                        }`}
                      >
                        {/* Date */}
                        <td className="px-4 py-3 text-primary-900 dark:text-primary-100">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {format(
                                new Date(transfer.transfer_date),
                                "MMM dd, yyyy"
                              )}
                            </div>
                            <div className="text-xs text-primary-500 dark:text-primary-400">
                              {format(
                                new Date(transfer.transfer_date),
                                "HH:mm"
                              )}
                            </div>
                            {index === 0 && (
                              <span className="inline-block px-2 py-0.5 text-xs font-medium bg-accent-100 text-accent-700 rounded-full dark:bg-accent-900/30 dark:text-accent-300">
                                Latest
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div
                            className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusStyle(
                              transfer.status || "pending approval"
                            )}`}
                          >
                            {getStatusIcon(
                              transfer.status || "pending approval"
                            )}
                            <span className="truncate">
                              {transfer.status || "Pending Approval"}
                            </span>
                          </div>
                        </td>

                        {/* From → To */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {transfer.previous_owner && (
                              <div className="flex items-center space-x-1 text-primary-600 dark:text-primary-400">
                                <span className="text-xs">From:</span>
                                <span className="font-medium">
                                  {transfer.previous_owner}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1 text-primary-900 dark:text-primary-100">
                              <span className="text-xs">To:</span>
                              <span className="font-medium">
                                {transfer.assigned_to}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="font-medium text-primary-900 dark:text-primary-100">
                              {transfer.transfer_location || "Not specified"}
                            </div>
                            {transfer.transfer_room_or_floor && (
                              <div className="text-xs text-primary-600 dark:text-primary-400">
                                {transfer.transfer_room_or_floor}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3">
                          <span className="text-primary-900 dark:text-primary-100">
                            {transfer.transfer_department || "-"}
                          </span>
                        </td>

                        {/* Approved By */}
                        <td className="px-4 py-3">
                          {transfer.approved_by ? (
                            <div className="flex items-center space-x-1 text-success-900 dark:text-success-300">
                              <UserCheck
                                size={12}
                                className="text-success-600 dark:text-success-400"
                              />
                              <span className="font-medium">
                                {transfer.approved_by}
                              </span>
                            </div>
                          ) : (
                            <span className="text-primary-400 dark:text-primary-500 text-xs">
                              -
                            </span>
                          )}
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-3">
                          {transfer.transfer_reason ? (
                            <div className="max-w-[200px]">
                              <div className="text-primary-900 dark:text-primary-100">
                                {shouldShowReadMore(
                                  transfer.transfer_reason
                                ) ? (
                                  <>
                                    {isReasonExpanded(transfer.id)
                                      ? transfer.transfer_reason
                                      : `${transfer.transfer_reason.substring(
                                          0,
                                          50
                                        )}...`}
                                    <button
                                      onClick={() =>
                                        toggleReasonExpansion(transfer.id)
                                      }
                                      className="ml-2 text-accent-600 hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300 text-xs font-medium underline inline-flex items-center"
                                    >
                                      {isReasonExpanded(transfer.id) ? (
                                        <>
                                          <ChevronUp
                                            size={10}
                                            className="mr-1"
                                          />
                                          Less
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown
                                            size={10}
                                            className="mr-1"
                                          />
                                          More
                                        </>
                                      )}
                                    </button>
                                  </>
                                ) : (
                                  transfer.transfer_reason
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-primary-400 dark:text-primary-500 text-xs">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-3 sm:p-4 border-t border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 flex-shrink-0">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto text-sm py-2.5 px-6 text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-800/30"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IctAssetTransferHistoryModal;
