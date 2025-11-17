"use client";

import type React from "react";
import { useEffect, useState } from "react";
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
} from "lucide-react";
import axios from "axios";
import { usePortableItemsStore } from "../../../../shared/store/portableItemsStore";
import type { PortableItem } from "../../../../shared/store/portableItemsStore";
import { useCookieAuthStore } from "../../../../shared/store/cookieAuthStore";
import Button from "../../../../shared/components/ui/Button";
import Input from "../../../../shared/components/ui/Input";
import Card from "../../../../shared/components/ui/Card";
import { API_URL } from "../../../../shared/config/constants";
import SuccessModal from "../../../../shared/components/ui/SuccessModal";

interface PortableItemTransfer {
  id: string;
  asset_id: string;
  previous_owner?: string;
  assigned_to: string;
  transfer_date: string;
  transfer_reason?: string;
  transfer_department?: string;
  transfer_location: string;
  transfer_room_or_floor?: string;
  created_at: string;
  updated_at: string;
}

const PortableItemsTransferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedPortableItem, getPortableItemById } = usePortableItemsStore();
  const { csrfToken, isAuthenticated, checkAuthStatus, getCsrfToken } =
    useCookieAuthStore();

  const [asset, setAsset] = useState<PortableItem | null>(null);
  const [transferHistory, setTransferHistory] = useState<
    PortableItemTransfer[]
  >([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [transferData, setTransferData] = useState({
    previousOwner: "",
    transferDate: "",
    transferReason: "",
    transferDepartment: "",
    transferLocation: "",
    transferRoomOrFloor: "",
    assignedTo: "",
  });

  // 🔒 Ensure authentication
  useEffect(() => {
    (async () => {
      if (!isAuthenticated) {
        const valid = await checkAuthStatus();
        if (!valid) {
          navigate("/login");
          return;
        }
      }
    })();
  }, [isAuthenticated, checkAuthStatus, navigate]);

  useEffect(() => {
    const loadAsset = async () => {
      if (id) {
        const fetchedAsset = await getPortableItemById(id);
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
  }, [id, getPortableItemById]);

  // ✅ Fetch transfer history via cookies + CSRF
  const fetchTransferHistory = async (assetId: string) => {
    setIsLoadingTransfers(true);
    setTransferError(null);
    try {
      const csrf = getCsrfToken();
      const response = await axios.get(
        `${API_URL}/portable-items/${assetId}/transfers/`,
        {
          withCredentials: true,
          headers: csrf ? { "X-CSRF-Token": csrf } : {},
        }
      );
      setTransferHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch transfer history:", error);
      setTransferError("Failed to fetch transfer history");
    } finally {
      setIsLoadingTransfers(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigate("/categories/portable-items");
  };

  const handleChange = (field: keyof typeof transferData, value: string) => {
    setTransferData((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ Handle Transfer with Cookie Auth
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
      const csrf = getCsrfToken();
      const response = await axios.post(
        `${API_URL}/portable-items/${asset.id}/transfer`,
        payload,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            ...(csrf ? { "X-CSRF-Token": csrf } : {}),
          },
        }
      );

      if (id) {
        await fetchTransferHistory(id);
      }
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Error submitting transfer:", error);
      alert("Error submitting transfer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const Spinner = () => (
    <svg
      className="inline-block mr-2 w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin"
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
    if (window.history.length > 1) navigate(-1);
    else navigate("/categories/portable-items");
  };

  if (!asset) {
    return (
      <div className="text-center text-gray-500 text-sm sm:text-base">
        Portable Item not found
      </div>
    );
  }

  const displayedTransfers = showAll
    ? transferHistory
    : transferHistory.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header - Mobile First */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-3 sm:px-4 sm:py-4 mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="secondary"
                onClick={handleBack}
                className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2"
              >
                ← Return
              </Button>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                Portable Item Transfer
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile First */}
      <div className="px-3 py-3 sm:px-4 sm:py-4 mx-auto">
        <div className="space-y-4 sm:space-y-6">
          {/* Current Asset Information Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-2 sm:p-2">
              <h2 className="pb-2 mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-100">
                Current Portable Item Information
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Asset Description
                  </p>
                  <p className="text-sm sm:text-base text-gray-900">
                    {asset.asset_description}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Current Responsible Officer
                  </p>
                  <p className="text-sm sm:text-base text-gray-900">
                    {asset.responsible_officer || "Not assigned"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Current Location
                  </p>
                  <p className="text-sm sm:text-base text-gray-900">
                    {asset.current_location || "Not specified"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    Serial Number
                  </p>
                  <p className="text-sm sm:text-base text-gray-900">
                    {asset.serial_number || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Transfer History Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-2 sm:p-2">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  Transfer History
                </h2>
                {transferHistory.length > 0 && (
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <History
                      size={14}
                      className="sm:w-4 sm:h-4 text-primary-500"
                    />
                    <span className="text-xs sm:text-sm text-primary-600">
                      {transferHistory.length} transfer
                      {transferHistory.length !== 1 ? "s" : ""} recorded
                    </span>
                  </div>
                )}
              </div>

              {isLoadingTransfers ? (
                <div className="flex justify-center items-center py-6 sm:py-8">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-b-2 animate-spin border-primary-600"></div>
                  <span className="ml-2 text-xs sm:text-sm text-primary-600">
                    Loading transfer history...
                  </span>
                </div>
              ) : transferError ? (
                <div className="py-6 sm:py-8 text-center">
                  <div className="text-error-600 mb-2 text-sm sm:text-base">
                    Failed to load transfer history
                  </div>
                  <div className="text-xs sm:text-sm text-primary-500">
                    {transferError}
                  </div>
                </div>
              ) : transferHistory.length === 0 ? (
                <div className="py-6 sm:py-8 text-center">
                  <div className="text-primary-500 mb-2 text-sm sm:text-base">
                    No transfer history found
                  </div>
                  <div className="text-xs sm:text-sm text-primary-400">
                    This portable item has not been transferred yet.
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {displayedTransfers.map((transfer, index) => (
                    <div
                      key={transfer.id}
                      className={`relative p-3 sm:p-4 rounded-lg border transition-colors hover:bg-primary-25 ${
                        index === 0
                          ? "border-primary-200 bg-primary-50"
                          : "border-primary-100"
                      }`}
                    >
                      {/* Transfer Timeline Indicator */}
                      <div className="absolute left-0 top-3 sm:top-4 w-1 h-full bg-primary-200 rounded-full"></div>
                      <div
                        className={`absolute left-0 top-3 sm:top-4 w-1 h-6 sm:h-8 rounded-full ${
                          index === 0 ? "bg-primary-500" : "bg-primary-300"
                        }`}
                      ></div>

                      <div className="ml-4 sm:ml-6">
                        {/* Transfer Header */}
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <Clock
                              size={14}
                              className="sm:w-4 sm:h-4 text-primary-500"
                            />
                            <span className="text-xs sm:text-sm font-medium text-primary-900">
                              {format(
                                new Date(transfer.transfer_date),
                                "MMM dd, yyyy HH:mm"
                              )}
                            </span>
                            {index === 0 && (
                              <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                                Latest
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Transfer Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-2 sm:mb-3">
                          {/* Owner Transfer */}
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <User
                              size={14}
                              className="sm:w-4 sm:h-4 text-primary-400 flex-shrink-0"
                            />
                            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                              {transfer.previous_owner && (
                                <>
                                  <span className="text-xs sm:text-sm text-primary-600 truncate">
                                    {transfer.previous_owner}
                                  </span>
                                  <ArrowRight
                                    size={12}
                                    className="sm:w-3.5 sm:h-3.5 text-primary-400 flex-shrink-0"
                                  />
                                </>
                              )}
                              <span className="text-xs sm:text-sm font-medium text-primary-900 truncate">
                                {transfer.assigned_to}
                              </span>
                            </div>
                          </div>

                          {/* Location Transfer */}
                          {transfer.transfer_location && (
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <MapPin
                                size={14}
                                className="sm:w-4 sm:h-4 text-primary-400 flex-shrink-0"
                              />
                              <span className="text-xs sm:text-sm font-medium text-primary-900 truncate">
                                {transfer.transfer_location}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Additional Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                          {/* Department */}
                          {transfer.transfer_department && (
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                              <Building
                                size={12}
                                className="sm:w-3.5 sm:h-3.5 text-primary-400"
                              />
                              <span className="text-primary-600">
                                Department:
                              </span>
                              <span className="text-primary-900 font-medium">
                                {transfer.transfer_department}
                              </span>
                            </div>
                          )}

                          {/* Room/Floor */}
                          {transfer.transfer_room_or_floor && (
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                              <MapPin
                                size={12}
                                className="sm:w-3.5 sm:h-3.5 text-primary-400"
                              />
                              <span className="text-primary-600">
                                Room/Floor:
                              </span>
                              <span className="text-primary-900 font-medium">
                                {transfer.transfer_room_or_floor}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Transfer Reason */}
                        {transfer.transfer_reason && (
                          <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-primary-25 rounded-md border border-primary-100">
                            <div className="flex items-start space-x-1.5 sm:space-x-2">
                              <FileText
                                size={12}
                                className="sm:w-3.5 sm:h-3.5 text-primary-400 mt-0.5 flex-shrink-0"
                              />
                              <div>
                                <span className="text-xs sm:text-sm text-primary-600 font-medium">
                                  Reason:
                                </span>
                                <p className="text-xs sm:text-sm text-primary-900 mt-1">
                                  {transfer.transfer_reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Show More/Less Footer */}
                  {transferHistory.length > 3 && (
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-primary-100 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAll(!showAll)}
                        className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 px-2 py-1 sm:px-3 sm:py-2"
                      >
                        {showAll
                          ? "Show Less"
                          : `View ${transferHistory.length - 3} More Transfer${
                              transferHistory.length - 3 !== 1 ? "s" : ""
                            }`}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Transfer Information Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-2 sm:p-2">
              <h2 className="pb-2 mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-100">
                Transfer Information
              </h2>
              <div className="space-y-4 sm:space-y-6">
                {/* Basic Transfer Info */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700">
                      New Responsible Officer{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={transferData.assignedTo}
                      onChange={(e) =>
                        handleChange("assignedTo", e.target.value)
                      }
                      placeholder="Enter new responsible officer"
                      className="w-full text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700">
                      Transfer Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={transferData.transferDate}
                      onChange={(e) =>
                        handleChange("transferDate", e.target.value)
                      }
                      className="w-full text-sm"
                    />
                  </div>
                </div>

                {/* Transfer Reason */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Transfer Reason
                  </label>
                  <Input
                    value={transferData.transferReason}
                    onChange={(e) =>
                      handleChange("transferReason", e.target.value)
                    }
                    placeholder="Reason for transfer"
                    className="w-full text-sm"
                  />
                </div>

                {/* Department and Location */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700">
                      Transfer Department
                    </label>
                    <Input
                      value={transferData.transferDepartment}
                      onChange={(e) =>
                        handleChange("transferDepartment", e.target.value)
                      }
                      placeholder="Target department"
                      className="w-full text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700">
                      Transfer Location
                    </label>
                    <Input
                      value={transferData.transferLocation}
                      onChange={(e) =>
                        handleChange("transferLocation", e.target.value)
                      }
                      placeholder="Target location"
                      className="w-full text-sm"
                    />
                  </div>
                </div>

                {/* Room/Floor */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Transfer Room/Floor
                  </label>
                  <Input
                    value={transferData.transferRoomOrFloor}
                    onChange={(e) =>
                      handleChange("transferRoomOrFloor", e.target.value)
                    }
                    placeholder="Room or floor in new location"
                    className="w-full text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end pt-3 sm:pt-4">
            <Button
              variant="primary"
              onClick={handleTransfer}
              disabled={
                loading ||
                !transferData.assignedTo.trim() ||
                !transferData.transferDate.trim()
              }
              className="px-4 py-2 sm:px-8 sm:py-2 text-sm sm:text-base"
            >
              {loading && <Spinner />}
              Confirm Transfer
            </Button>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <SuccessModal
          message="The portable item transfer was completed successfully."
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default PortableItemsTransferPage;
