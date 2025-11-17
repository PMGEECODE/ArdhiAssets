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
  ArrowLeft,
  ArrowRightLeft,
} from "lucide-react";
import axios from "axios";
import { useIctAssetsStore } from "../../../../shared/store/ictAssetsStore";
import { useCookieAuthStore } from "../../../../shared/store/cookieAuthStore";
import type { IctAsset } from "../../../../shared/store/ictAssetsStore";
import Button from "../../../../shared/components/ui/Button";
import Input from "../../../../shared/components/ui/Input";
import Card from "../../../../shared/components/ui/Card";
import { API_URL } from "../../../../shared/config/constants";
import SuccessModal from "../../../../shared/components/ui/SuccessModal";

interface IctAssetTransfer {
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

const IctAssetTransferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedIctAsset, getIctAssetById } = useIctAssetsStore();
  const { csrfToken, isAuthenticated, checkAuthStatus, getCsrfToken } =
    useCookieAuthStore();

  const [asset, setAsset] = useState<IctAsset | null>(null);
  const [transferHistory, setTransferHistory] = useState<IctAssetTransfer[]>(
    []
  );
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
        const fetchedAsset = await getIctAssetById(id);
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
  }, [id, getIctAssetById]);

  const fetchTransferHistory = async (assetId: string) => {
    setIsLoadingTransfers(true);
    setTransferError(null);
    try {
      const csrf = getCsrfToken();
      const response = await axios.get(
        `${API_URL}/ict-assets/${assetId}/transfers/`,
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
    navigate("/categories/ict-assets");
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
      const csrf = getCsrfToken();
      const response = await axios.post(
        `${API_URL}/ict-assets/${asset.id}/transfer`,
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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/categories/ict-assets");
    }
  };

  if (!asset) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-3 rounded-full border-b-2 border-accent-600 animate-spin"></div>
          <p className="text-sm text-primary-600 dark:text-primary-400">
            Loading asset...
          </p>
        </div>
      </div>
    );
  }

  const displayedTransfers = showAll
    ? transferHistory
    : transferHistory.slice(0, 3);

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-primary-800 border-b border-primary-200 dark:border-primary-700 shadow-sm transition-colors duration-200">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-1.5"
              >
                <ArrowLeft
                  size={16}
                  className="text-primary-600 dark:text-primary-400"
                />
              </Button>
              <h1 className="text-lg font-bold text-primary-900 dark:text-primary-50">
                ICT Asset Transfer
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-4 space-y-4">
        {/* Current Asset Information Card */}
        <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <FileText
                size={16}
                className="text-accent-600 dark:text-accent-400 mr-2"
              />
              <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
                Current ICT Asset Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Asset Description
                </p>
                <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                  {asset.asset_description}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Current Responsible Officer
                </p>
                <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                  {asset.responsible_officer || "Not assigned"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Current Location
                </p>
                <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                  {asset.current_location || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Serial Number
                </p>
                <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                  {asset.serial_number || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Transfer History Card */}
        <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <History
                  size={16}
                  className="text-purple-600 dark:text-purple-400 mr-2"
                />
                <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
                  Transfer History
                </h2>
              </div>
              {transferHistory.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-purple-600 dark:text-purple-400">
                    {transferHistory.length} transfer
                    {transferHistory.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            {isLoadingTransfers ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 rounded-full border-b-2 border-accent-600 animate-spin mr-2"></div>
                <span className="text-xs text-primary-600 dark:text-primary-400">
                  Loading...
                </span>
              </div>
            ) : transferError ? (
              <div className="p-4 text-center bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 rounded-lg">
                <p className="text-sm text-error-800 dark:text-error-300">
                  {transferError}
                </p>
              </div>
            ) : transferHistory.length === 0 ? (
              <div className="p-4 text-center bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-lg">
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  No transfer history found
                </p>
                <p className="text-xs text-primary-500 dark:text-primary-500 mt-1">
                  This asset has not been transferred yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedTransfers.map((transfer, index) => (
                  <div
                    key={transfer.id}
                    className={`relative p-3 rounded-lg border transition-all duration-200 ${
                      index === 0
                        ? "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950 shadow-sm"
                        : "border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex flex-col items-center mt-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            index === 0 ? "bg-purple-600" : "bg-primary-400"
                          }`}
                        ></div>
                        {index < displayedTransfers.length - 1 && (
                          <div className="w-px h-full bg-primary-200 dark:bg-primary-700 mt-1"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Clock
                              size={14}
                              className="text-primary-500 dark:text-primary-400"
                            />
                            <span className="text-xs font-medium text-primary-900 dark:text-primary-100">
                              {format(
                                new Date(transfer.transfer_date),
                                "MMM dd, yyyy HH:mm"
                              )}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full">
                                Latest
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center space-x-2">
                            <User
                              size={12}
                              className="text-primary-500 dark:text-primary-400 flex-shrink-0"
                            />
                            <div className="flex items-center space-x-1 min-w-0">
                              {transfer.previous_owner && (
                                <>
                                  <span className="text-primary-600 dark:text-primary-400 truncate">
                                    {transfer.previous_owner}
                                  </span>
                                  <ArrowRight
                                    size={12}
                                    className="text-primary-400 flex-shrink-0"
                                  />
                                </>
                              )}
                              <span className="font-medium text-primary-900 dark:text-primary-100 truncate">
                                {transfer.assigned_to}
                              </span>
                            </div>
                          </div>

                          {transfer.transfer_location && (
                            <div className="flex items-center space-x-2">
                              <MapPin
                                size={12}
                                className="text-primary-500 dark:text-primary-400 flex-shrink-0"
                              />
                              <span className="font-medium text-primary-900 dark:text-primary-100 truncate">
                                {transfer.transfer_location}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 space-y-1 text-xs">
                          {transfer.transfer_department && (
                            <div className="flex items-center space-x-1">
                              <Building
                                size={12}
                                className="text-primary-400"
                              />
                              <span className="text-primary-600 dark:text-primary-400">
                                Dept:
                              </span>
                              <span className="text-primary-900 dark:text-primary-100 font-medium">
                                {transfer.transfer_department}
                              </span>
                            </div>
                          )}
                          {transfer.transfer_room_or_floor && (
                            <div className="flex items-center space-x-1">
                              <MapPin size={12} className="text-primary-400" />
                              <span className="text-primary-600 dark:text-primary-400">
                                Room:
                              </span>
                              <span className="text-primary-900 dark:text-primary-100 font-medium">
                                {transfer.transfer_room_or_floor}
                              </span>
                            </div>
                          )}
                        </div>

                        {transfer.transfer_reason && (
                          <div className="mt-2 p-2 bg-primary-50 dark:bg-primary-900 rounded-md border border-primary-200 dark:border-primary-700">
                            <div className="flex items-start space-x-1.5">
                              <FileText
                                size={12}
                                className="text-primary-400 mt-0.5 flex-shrink-0"
                              />
                              <div>
                                <span className="text-primary-600 dark:text-primary-400 font-medium">
                                  Reason:
                                </span>
                                <p className="text-xs text-primary-900 dark:text-primary-100 mt-0.5">
                                  {transfer.transfer_reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {transferHistory.length > 3 && (
                  <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-700 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAll(!showAll)}
                      className="text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300"
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

        {/* Transfer Form Card */}
        <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <ArrowRightLeft
                size={16}
                className="text-success-600 dark:text-success-400 mr-2"
              />
              <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
                Transfer Information
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                    New Responsible Officer{" "}
                    <span className="text-error-600">*</span>
                  </label>
                  <Input
                    value={transferData.assignedTo}
                    onChange={(e) => handleChange("assignedTo", e.target.value)}
                    placeholder="Enter new responsible officer"
                    className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                    Transfer Date <span className="text-error-600">*</span>
                  </label>
                  <Input
                    type="date"
                    value={transferData.transferDate}
                    onChange={(e) =>
                      handleChange("transferDate", e.target.value)
                    }
                    className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Transfer Reason
                </label>
                <Input
                  value={transferData.transferReason}
                  onChange={(e) =>
                    handleChange("transferReason", e.target.value)
                  }
                  placeholder="Reason for transfer"
                  className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                    Transfer Department
                  </label>
                  <Input
                    value={transferData.transferDepartment}
                    onChange={(e) =>
                      handleChange("transferDepartment", e.target.value)
                    }
                    placeholder="Target department"
                    className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                    Transfer Location
                  </label>
                  <Input
                    value={transferData.transferLocation}
                    onChange={(e) =>
                      handleChange("transferLocation", e.target.value)
                    }
                    placeholder="Target location"
                    className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Transfer Room/Floor
                </label>
                <Input
                  value={transferData.transferRoomOrFloor}
                  onChange={(e) =>
                    handleChange("transferRoomOrFloor", e.target.value)
                  }
                  placeholder="Room or floor in new location"
                  className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <Button
            variant="success"
            size="sm"
            onClick={handleTransfer}
            disabled={
              loading ||
              !transferData.assignedTo.trim() ||
              !transferData.transferDate.trim()
            }
            className="flex items-center space-x-2 px-4 py-2 text-sm"
            isLoading={loading}
          >
            <span>Confirm Transfer</span>
          </Button>
        </div>
      </div>

      {showSuccessModal && (
        <SuccessModal
          message="The ICT asset transfer was completed successfully."
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default IctAssetTransferPage;
