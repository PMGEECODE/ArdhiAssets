"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDeviceStore } from "../../store/deviceStore";
import type { Device } from "../../types";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Card from "../../components/ui/Card";
import { API_URL } from "../../config";
import SuccessModal from "../../components/ui/SuccessModal";

const DeviceTransfer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    devices,
    transferHistory,
    isLoadingTransfers,
    transferError,
    fetchTransferHistory,
    clearTransferHistory,
  } = useDeviceStore();

  const [device, setDevice] = useState<Device | null>(null);

  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Transfer fields (editable)
  const [transferData, setTransferData] = useState({
    previousOwner: "",
    transferDate: "",
    transferReason: "",
    transferDepartment: "",
    transferLocation: "",
    transferRoomOrFloor: "",
    assignedTo: "",
    previousLocation: "",
    previousRoomFloor: "",
  });

  useEffect(() => {
    const found = devices.find((d) => String(d.id) === id);
    if (found) {
      setDevice(found);
      setTransferData((prev) => ({
        ...prev,
        previousOwner: found.assigned_to,
        assignedTo: "",
      }));
      if (id) {
        fetchTransferHistory(id);
      }
    } else {
      const fetchDevice = async () => {
        try {
          const storedAuth = localStorage.getItem("auth-storage");
          const authData = storedAuth ? JSON.parse(storedAuth) : null;
          const token = authData?.state?.token;

          const response = await fetch(`${API_URL}/devices/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) throw new Error("Failed to fetch device");

          const fetched = await response.json();
          setDevice(fetched);
          setTransferData((prev) => ({
            ...prev,
            previousOwner: fetched.assigned_to,
            assignedTo: "",
          }));
          if (id) {
            fetchTransferHistory(id);
          }
        } catch (error) {
          console.error("Failed to fetch device:", error);
        }
      };

      fetchDevice();
    }
  }, [id, devices, fetchTransferHistory]);

  useEffect(() => {
    return () => {
      clearTransferHistory();
    };
  }, [clearTransferHistory]);

  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        handleCloseModal();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigate("/devices");
  };

  const handleChange = (field: keyof typeof transferData, value: string) => {
    setTransferData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTransfer = async () => {
    if (!device) return;
    setLoading(true);

    const payload = {
      device_id: device.id,
      previous_owner: transferData.previousOwner,
      assigned_to: transferData.assignedTo,
      transfer_date: transferData.transferDate,
      transfer_reason: transferData.transferReason,
      transfer_department: transferData.transferDepartment,
      transfer_location: transferData.transferLocation,
      transfer_room_or_floor: transferData.transferRoomOrFloor,
    };

    const storedAuth = localStorage.getItem("auth-storage");
    const authData = storedAuth ? JSON.parse(storedAuth) : null;
    const token = authData?.state?.token;

    if (!token) {
      alert("No auth token found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/devices/${device.id}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Backend error:", errorData || response.statusText);
        throw new Error("Failed to submit transfer");
      }

      const data = await response.json();
      console.log("Transfer successful:", data);
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
      navigate("/devices");
    }
  };

  if (!device) {
    return <div className="text-center text-gray-500">Device not found</div>;
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
                Device Transfer
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-0 py-2 mx-auto">
        <div className="space-y-6">
          {/* Current Device Information Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-6">
              <h2 className="pb-2 mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100">
                Current Device Information
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Hostname</p>
                  <p className="text-base text-gray-900">{device.hostname}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Current Owner
                  </p>
                  <p className="text-base text-gray-900">
                    {device.assigned_to}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Location</p>
                  <p className="text-base text-gray-900">{device.location}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Room/Floor
                  </p>
                  <p className="text-base text-gray-900">
                    {device.room_or_floor}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Transfer History Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-6">
              <h2 className="pb-2 mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100">
                Transfer History
              </h2>
              {isLoadingTransfers ? (
                <div className="py-4 text-center text-gray-500">
                  Loading transfer history...
                </div>
              ) : transferError ? (
                <div className="py-4 text-center text-red-500">
                  Error loading transfer history: {transferError}
                </div>
              ) : transferHistory.length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  No transfer history found for this device.
                </div>
              ) : (
                <div className="space-y-4">
                  {transferHistory.map((transfer, index) => (
                    <div
                      key={transfer.id || index}
                      className="py-2 pl-4 border-l-4 border-blue-500"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Transfer Date
                          </p>
                          <p className="text-base text-gray-900">
                            {new Date(
                              transfer.transfer_date
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            From → To
                          </p>
                          <p className="text-base text-gray-900">
                            {transfer.previous_owner} → {transfer.assigned_to}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Location
                          </p>
                          <p className="text-base text-gray-900">
                            {transfer.transfer_location || "N/A"}
                          </p>
                        </div>
                      </div>
                      {transfer.transfer_reason && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-600">
                            Reason
                          </p>
                          <p className="text-base text-gray-900">
                            {transfer.transfer_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Transfer Information Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-6">
              <h2 className="pb-2 mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100">
                Transfer Information
              </h2>
              <div className="space-y-6">
                {/* Basic Transfer Info */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      New Owner <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={transferData.assignedTo}
                      onChange={(e) =>
                        handleChange("assignedTo", e.target.value)
                      }
                      placeholder="Enter new owner info"
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
          message="The device transfer was completed successfully."
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default DeviceTransfer;
