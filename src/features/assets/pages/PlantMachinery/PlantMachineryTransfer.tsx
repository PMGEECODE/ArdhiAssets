"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Clock,
  User,
  MapPin,
  Building,
  FileText,
  ArrowRight,
  History,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { usePlantMachineryStore } from "../../../../shared/store/plantMachineryStore";
import type { PlantMachinery } from "../../../../shared/store/plantMachineryStore";
import Button from "../../../../shared/components/ui/Button";
import Input from "../../../../shared/components/ui/Input";
import Card from "../../../../shared/components/ui/Card";
import axios from "axios";
import { API_URL } from "../../../../shared/config/constants";
import SuccessModal from "../../../../shared/components/ui/SuccessModal";

interface PlantMachineryTransfer {
  id: string;
  asset_id: string;
  previous_owner?: string;
  assigned_to: string;
  transfer_date: string;
  transfer_reason?: string;
  transfer_department?: string;
  transfer_location: string;
  transfer_room_or_floor?: string;
  status?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

const PlantMachineryTransferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedPlantMachinery, getPlantMachineryById } =
    usePlantMachineryStore();

  const [asset, setAsset] = useState<PlantMachinery | null>(null);
  const [transferHistory, setTransferHistory] = useState<
    PlantMachineryTransfer[]
  >([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Read more state for reasons
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(
    new Set()
  );

  // Transfer fields (editable)
  const [transferData, setTransferData] = useState({
    previousOwner: "",
    transferDate: "",
    transferReason: "",
    transferDepartment: "",
    transferLocation: "",
    transferRoomOrFloor: "",
    assignedTo: "",
  });

  useEffect(() => {
    const loadAsset = async () => {
      if (id) {
        const fetchedAsset = await getPlantMachineryById(id);
        if (fetchedAsset) {
          setAsset(fetchedAsset);
          setTransferData((prev) => ({
            ...prev,
            previousOwner: fetchedAsset.responsible_officer || "",
            assignedTo: "",
          }));
          await fetchTransferHistory(id);
        }
      }
    };
    loadAsset();
  }, [id, getPlantMachineryById]);

  const fetchTransferHistory = async (assetId: string) => {
    setIsLoadingTransfers(true);
    setTransferError(null);
    try {
      const response = await axios.get(
        `${API_URL}/plant-machinery/${assetId}/transfers/`
      );
      setTransferHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch transfer history:", error);
      setTransferError("Failed to fetch transfer history");
    } finally {
      setIsLoadingTransfers(false);
    }
  };

  // Filter and search logic
  const filteredTransfers = useMemo(() => {
    let filtered = [...transferHistory];

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
        const status = (transfer.status || "approved").toLowerCase();
        return status === statusFilter.toLowerCase();
      });
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      now.setHours(23, 59, 59, 999);

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
  }, [transferHistory, searchTerm, statusFilter, dateFilter]);

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigate("/categories/plant-machinery");
  };

  const handleChange = (field: keyof typeof transferData, value: string) => {
    setTransferData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTransfer = async () => {
    if (!asset) return;
    setLoading(true);

    const payload = {
      asset_id: asset.id,
      previous_owner: transferData.previousOwner,
      assigned_to: transferData.assignedTo,
      transfer_date: transferData.transferDate,
      transfer_reason: transferData.transferReason,
      transfer_department: transferData.transferDepartment,
      transfer_location: transferData.transferLocation,
      transfer_room_or_floor: transferData.transferRoomOrFloor,
    };

    try {
      const response = await axios.post(
        `${API_URL}/plant-machinery/${asset.id}/transfer`,
        payload
      );
      console.log("Transfer successful:", response.data);
      if (id) {
        await fetchTransferHistory(id);
      }
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting transfer:", error);
      alert("Error submitting transfer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <CheckCircle size={12} className="text-green-600" />;
      case "pending approval":
        return <AlertCircle size={12} className="text-amber-600" />;
      default:
        return <CheckCircle size={12} className="text-green-600" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending approval":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
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

  const Spinner = () => (
    <svg
      className="inline-block mr-2 w-5 h-5 text-white animate-spin"
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
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      ></path>
    </svg>
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/categories/plant-machinery");
    }
  };

  if (!asset) {
    return (
      <div className="text-center text-gray-500">Plant Machinery not found</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-2 py-2 mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="secondary" onClick={handleBack}>
                ← Return
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                Plant Machinery Transfer
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-2 py-2 mx-auto">
        <div className="space-y-6">
          {/* Current Asset Information Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-2">
              <h2 className="pb-2 mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100">
                Current Plant Machinery Information
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Asset Description
                  </p>
                  <p className="text-base text-gray-900">
                    {asset.asset_description}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Current Responsible Officer
                  </p>
                  <p className="text-base text-gray-900">
                    {asset.responsible_officer || "Not assigned"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Current Location
                  </p>
                  <p className="text-base text-gray-900">
                    {asset.current_location || "Not specified"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Serial Number
                  </p>
                  <p className="text-base text-gray-900">
                    {asset.serial_number || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Transfer Information Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-2">
              <h2 className="pb-2 mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100">
                Transfer Information
              </h2>
              <div className="space-y-6">
                {/* Basic Transfer Info */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      New Responsible Officer{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={transferData.assignedTo}
                      onChange={(e) =>
                        handleChange("assignedTo", e.target.value)
                      }
                      placeholder="Enter new responsible officer"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Transfer Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={transferData.transferDate}
                      onChange={(e) =>
                        handleChange("transferDate", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Transfer Reason */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Transfer Reason
                  </label>
                  <Input
                    value={transferData.transferReason}
                    onChange={(e) =>
                      handleChange("transferReason", e.target.value)
                    }
                    placeholder="Reason for transfer"
                    className="w-full"
                  />
                </div>

                {/* Department and Location */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Transfer Department
                    </label>
                    <Input
                      value={transferData.transferDepartment}
                      onChange={(e) =>
                        handleChange("transferDepartment", e.target.value)
                      }
                      placeholder="Target department"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Transfer Location
                    </label>
                    <Input
                      value={transferData.transferLocation}
                      onChange={(e) =>
                        handleChange("transferLocation", e.target.value)
                      }
                      placeholder="Target location"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Room/Floor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Transfer Room/Floor
                  </label>
                  <Input
                    value={transferData.transferRoomOrFloor}
                    onChange={(e) =>
                      handleChange("transferRoomOrFloor", e.target.value)
                    }
                    placeholder="Room or floor in new location"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Transfer History Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Transfer History
                </h2>
                {transferHistory.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <History size={16} className="text-primary-500" />
                    <span className="text-sm text-primary-600">
                      {transferHistory.length} transfer
                      {transferHistory.length !== 1 ? "s" : ""} recorded
                    </span>
                  </div>
                )}
              </div>

              {/* Search and Filter Bar */}
              {transferHistory.length > 0 && (
                <div className="p-3 sm:p-4 border border-gray-200 bg-gray-50 rounded-md mb-4">
                  <div className="flex flex-col gap-3">
                    {/* Search Input */}
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-3 text-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Search transfers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Filter Toggle and Clear */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center justify-center space-x-2 px-4 py-2.5"
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
                          className="text-sm py-2.5"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>

                    {/* Filter Options */}
                    {showFilters && (
                      <div className="p-3 border border-gray-200 rounded-md bg-white">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Status Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Status
                            </label>
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="all">All Status</option>
                              <option value="approved">Approved</option>
                              <option value="pending approval">
                                Pending Approval
                              </option>
                            </select>
                          </div>

                          {/* Date Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Date Range
                            </label>
                            <select
                              value={dateFilter}
                              onChange={(e) => setDateFilter(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    <div className="text-xs sm:text-sm text-gray-600">
                      Showing {filteredTransfers.length} of{" "}
                      {transferHistory.length} transfers
                    </div>
                  </div>
                </div>
              )}

              {isLoadingTransfers ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-6 h-6 rounded-full border-b-2 animate-spin border-primary-600"></div>
                  <span className="ml-2 text-primary-600">
                    Loading transfer history...
                  </span>
                </div>
              ) : transferError ? (
                <div className="py-8 text-center">
                  <div className="text-error-600 mb-2">
                    Failed to load transfer history
                  </div>
                  <div className="text-sm text-primary-500">
                    {transferError}
                  </div>
                </div>
              ) : transferHistory.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <History className="text-gray-400" size={32} />
                  </div>
                  <div className="text-primary-500 mb-2">
                    No transfer history found
                  </div>
                  <div className="text-sm text-primary-400">
                    This plant machinery has not been transferred yet.
                  </div>
                </div>
              ) : filteredTransfers.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Search className="text-gray-400" size={32} />
                  </div>
                  <div className="text-gray-600 mb-2 font-medium text-base">
                    No transfers match your filters
                  </div>
                  <div className="text-sm text-gray-500">
                    Try adjusting your search or filter criteria.
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden">
                    <div className="space-y-3">
                      {filteredTransfers.map((transfer, index) => (
                        <div
                          key={transfer.id}
                          className={`border rounded-lg p-4 ${
                            index === 0
                              ? "border-indigo-200 bg-indigo-50"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          {/* Header with date and status */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm">
                                {format(
                                  new Date(transfer.transfer_date),
                                  "MMM dd, yyyy"
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(
                                  new Date(transfer.transfer_date),
                                  "HH:mm"
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div
                                className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusStyle(
                                  transfer.status || "approved"
                                )}`}
                              >
                                {getStatusIcon(transfer.status || "approved")}
                                <span>{transfer.status || "Approved"}</span>
                              </div>
                              {index === 0 && (
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
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
                                className="text-gray-400 mt-0.5 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                {transfer.previous_owner && (
                                  <div className="text-xs text-gray-600 mb-1">
                                    <span className="font-medium">From:</span>{" "}
                                    {transfer.previous_owner}
                                  </div>
                                )}
                                <div className="text-sm text-gray-900">
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
                                  className="text-gray-400 mt-0.5 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-gray-900">
                                    {transfer.transfer_location}
                                  </div>
                                  {transfer.transfer_room_or_floor && (
                                    <div className="text-xs text-gray-600">
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
                                  className="text-gray-400 flex-shrink-0"
                                />
                                <span className="text-sm text-gray-900">
                                  {transfer.transfer_department}
                                </span>
                              </div>
                            )}

                            {/* Reason */}
                            {transfer.transfer_reason && (
                              <div className="flex items-start space-x-2">
                                <FileText
                                  size={14}
                                  className="text-gray-400 mt-0.5 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-gray-900">
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
                                          className="ml-2 text-indigo-600 hover:text-indigo-800 text-xs font-medium underline"
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
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 min-w-[120px]">
                            <div className="flex items-center space-x-1">
                              <Calendar size={12} />
                              <span>Date</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 min-w-[100px]">
                            <div className="flex items-center space-x-1">
                              <CheckCircle size={12} />
                              <span>Status</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 min-w-[150px]">
                            <div className="flex items-center space-x-1">
                              <User size={12} />
                              <span>From → To</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 min-w-[120px]">
                            <div className="flex items-center space-x-1">
                              <MapPin size={12} />
                              <span>Location</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 min-w-[100px]">
                            <div className="flex items-center space-x-1">
                              <Building size={12} />
                              <span>Department</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 min-w-[200px]">
                            <div className="flex items-center space-x-1">
                              <FileText size={12} />
                              <span>Reason</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredTransfers.map((transfer, index) => (
                          <tr
                            key={transfer.id}
                            className={`hover:bg-gray-50 ${
                              index === 0 ? "bg-indigo-50" : ""
                            }`}
                          >
                            {/* Date */}
                            <td className="px-4 py-3 text-gray-900">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {format(
                                    new Date(transfer.transfer_date),
                                    "MMM dd, yyyy"
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {format(
                                    new Date(transfer.transfer_date),
                                    "HH:mm"
                                  )}
                                </div>
                                {index === 0 && (
                                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                                    Latest
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <div
                                className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusStyle(
                                  transfer.status || "approved"
                                )}`}
                              >
                                {getStatusIcon(transfer.status || "approved")}
                                <span className="truncate">
                                  {transfer.status || "Approved"}
                                </span>
                              </div>
                            </td>

                            {/* From → To */}
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                {transfer.previous_owner && (
                                  <div className="flex items-center space-x-1 text-gray-600">
                                    <span className="text-xs">From:</span>
                                    <span className="font-medium">
                                      {transfer.previous_owner}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1 text-indigo-900">
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
                                <div className="font-medium text-gray-900">
                                  {transfer.transfer_location ||
                                    "Not specified"}
                                </div>
                                {transfer.transfer_room_or_floor && (
                                  <div className="text-xs text-gray-600">
                                    {transfer.transfer_room_or_floor}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Department */}
                            <td className="px-4 py-3">
                              <span className="text-gray-900">
                                {transfer.transfer_department || "-"}
                              </span>
                            </td>

                            {/* Reason */}
                            <td className="px-4 py-3">
                              {transfer.transfer_reason ? (
                                <div className="max-w-[200px]">
                                  <div className="text-gray-900">
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
                                          className="ml-2 text-indigo-600 hover:text-indigo-800 text-xs font-medium underline inline-flex items-center"
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
                                <span className="text-gray-400 text-xs">-</span>
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
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              onClick={handleTransfer}
              disabled={
                loading ||
                !transferData.assignedTo.trim() ||
                !transferData.transferDate.trim()
              }
              className="px-8 py-2"
            >
              {loading && <Spinner />}
              Confirm Transfer
            </Button>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <SuccessModal
          message="The plant machinery transfer was completed successfully."
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default PlantMachineryTransferPage;
