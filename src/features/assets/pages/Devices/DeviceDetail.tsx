"use client";

// src/pages/DeviceDetail.tsx

import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, MapPin, User, History, Clock } from "lucide-react";
import { toast } from "react-toastify";

import { useDeviceStore } from "../../store/deviceStore";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import TransferHistoryModal from "../../components/ui/TransferHistoryModal";

const DeviceDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const {
    fetchDevice,
    updateDevice,
    selectedDevice,
    setSelectedDevice,
    isLoading,
    fetchTransferHistory,
    transferHistory,
    isLoadingTransfers,
  } = useDeviceStore();

  const [isSaving, setIsSaving] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);

  useEffect(() => {
    const loadDevice = async () => {
      if (id) {
        try {
          await fetchDevice(id);
          await fetchTransferHistory(id);
        } catch (error) {
          console.error("Error loading device:", error);
          toast.error("Failed to load device details");
        }
      } else {
        toast.error("Invalid device ID");
        navigate("/devices");
      }
    };

    loadDevice();

    return () => setSelectedDevice(null);
  }, [id, fetchDevice, setSelectedDevice, navigate, fetchTransferHistory]);

  const handleSave = async () => {
    if (!selectedDevice) return;

    setIsSaving(true);
    try {
      await updateDevice(String(selectedDevice.id), selectedDevice);
      toast.success("Device updated successfully");
      navigate("/devices");
    } catch (error) {
      console.error("Error updating device:", error);
      toast.error("Failed to update device");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: string
  ) => {
    if (selectedDevice) {
      setSelectedDevice({
        ...selectedDevice,
        [field]: e.target.value,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-b-2 animate-spin border-primary-600"></div>
      </div>
    );
  }

  if (!selectedDevice) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-xl font-semibold text-primary-900">
          Device not found
        </h2>
        <Button
          variant="secondary"
          className="mt-4"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate("/devices")}
        >
          Back to Devices
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            className="p-2"
            onClick={() => navigate("/devices")}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold text-primary-900">
            {selectedDevice.hostname}
          </h1>
        </div>
        {isEditMode && (
          <Button
            variant="primary"
            leftIcon={<Save size={16} />}
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save Changes
          </Button>
        )}
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Device Identity Section */}
          <div className="device-wrapper md-22">
            <h1 className="mb-4 text-2xl font-semibold text-primary-800 title">
              Device Identity
            </h1>

            {/* Hostname */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">Hostname</h3>
              {isEditMode ? (
                <input
                  name="hostname"
                  type="text"
                  value={selectedDevice.hostname || ""}
                  onChange={(e) => handleChange(e, "hostname")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.hostname}
                </p>
              )}
            </div>

            {/* Model */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">Model</h3>
              {isEditMode ? (
                <input
                  name="model"
                  type="text"
                  value={selectedDevice.model || ""}
                  onChange={(e) => handleChange(e, "model")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">{selectedDevice.model}</p>
              )}
            </div>

            {/* Manufacturer */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">
                Manufacturer
              </h3>
              {isEditMode ? (
                <input
                  name="manufacturer"
                  type="text"
                  value={selectedDevice.manufacturer || ""}
                  onChange={(e) => handleChange(e, "manufacturer")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.manufacturer}
                </p>
              )}
            </div>

            {/* Type */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">Type</h3>
              {isEditMode ? (
                <input
                  name="type"
                  type="text"
                  value={selectedDevice.type || ""}
                  onChange={(e) => handleChange(e, "type")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">{selectedDevice.type}</p>
              )}
            </div>

            {/* Chassis */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">Chassis</h3>
              {isEditMode ? (
                <input
                  name="chassis"
                  type="text"
                  value={selectedDevice.chassis || ""}
                  onChange={(e) => handleChange(e, "chassis")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.chassis}
                </p>
              )}
            </div>

            {/* Serial Number */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">
                Serial Number
              </h3>
              {isEditMode ? (
                <input
                  name="serial_number"
                  type="text"
                  value={selectedDevice.serial_number || ""}
                  onChange={(e) => handleChange(e, "serial_number")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.serial_number}
                </p>
              )}
            </div>
          </div>

          {/* Operating System Section */}
          <div className="os-wrapper md-22">
            <h1 className="mb-4 text-2xl font-semibold text-primary-800 title">
              Operating System
            </h1>
            {/* Platform */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">Platform</h3>
              {isEditMode ? (
                <input
                  name="platform"
                  type="text"
                  value={selectedDevice.platform || ""}
                  onChange={(e) => handleChange(e, "platform")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.platform}
                </p>
              )}
            </div>

            {/* OS Version */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">
                OS Version
              </h3>
              {isEditMode ? (
                <input
                  name="os_version"
                  type="text"
                  value={selectedDevice.os_version || ""}
                  onChange={(e) => handleChange(e, "os_version")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.os_version}
                </p>
              )}
            </div>

            {/* OS Build */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">OS Build</h3>
              {isEditMode ? (
                <input
                  name="os_build"
                  type="text"
                  value={selectedDevice.os_build || ""}
                  onChange={(e) => handleChange(e, "os_build")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.os_build}
                </p>
              )}
            </div>

            {/* OS Product Name */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">
                OS Product Name
              </h3>
              {isEditMode ? (
                <input
                  name="os_product_name"
                  type="text"
                  value={selectedDevice.os_product_name || ""}
                  onChange={(e) => handleChange(e, "os_product_name")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.os_product_name}
                </p>
              )}
            </div>
          </div>

          {/* Network Info Section */}
          <div className="net-wrapper md-22">
            <h1 className="mb-4 text-2xl font-semibold text-primary-800 title">
              Network Info
            </h1>
            {/* Local IP */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">Local IP</h3>
              {isEditMode ? (
                <input
                  name="local_ip"
                  type="text"
                  value={selectedDevice.local_ip || ""}
                  onChange={(e) => handleChange(e, "local_ip")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.local_ip}
                </p>
              )}
            </div>

            {/* Domain */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">Domain</h3>
              {isEditMode ? (
                <input
                  name="domain"
                  type="text"
                  value={selectedDevice.domain || ""}
                  onChange={(e) => handleChange(e, "domain")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">{selectedDevice.domain}</p>
              )}
            </div>

            {/* MAC Address */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">
                MAC Address
              </h3>
              {isEditMode ? (
                <input
                  name="mac_address"
                  type="text"
                  value={selectedDevice.mac_address || ""}
                  onChange={(e) => handleChange(e, "mac_address")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.mac_address}
                </p>
              )}
            </div>

            {/* CPU ID */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">CPU ID</h3>
              {isEditMode ? (
                <input
                  name="cpu_id"
                  type="text"
                  value={selectedDevice.cpu_id || ""}
                  onChange={(e) => handleChange(e, "cpu_id")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">{selectedDevice.cpu_id}</p>
              )}
            </div>
          </div>

          <div className="deviceloc-wrapper md-22">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-semibold text-primary-800 title">
                Device Placement
              </h1>
              <div className="flex items-center space-x-2">
                <MapPin size={16} className="text-primary-500" />
                <span className="text-xs text-primary-500 uppercase tracking-wide">
                  Current Location
                </span>
              </div>
            </div>

            {/* Current Location Summary */}
            {!isEditMode && (
              <div className="mb-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                <div className="flex items-start space-x-3">
                  <MapPin
                    size={18}
                    className="text-primary-600 mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-primary-900 mb-1">
                      {selectedDevice.location || "No location specified"}
                    </div>
                    {selectedDevice.room_or_floor && (
                      <div className="text-sm text-primary-600 mb-2">
                        Room/Floor: {selectedDevice.room_or_floor}
                      </div>
                    )}
                    {selectedDevice.assigned_to && (
                      <div className="flex items-center space-x-2">
                        <User size={14} className="text-primary-500" />
                        <span className="text-sm text-primary-700">
                          Assigned to:{" "}
                          <span className="font-medium">
                            {selectedDevice.assigned_to}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-primary-500">Location</h3>
              {isEditMode ? (
                <input
                  name="location"
                  type="text"
                  value={selectedDevice.location || ""}
                  onChange={(e) => handleChange(e, "location")}
                  className="px-3 py-2 mt-1 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter location (e.g., Main Building, IT Department)"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.location || "Not specified"}
                </p>
              )}
            </div>

            {/* Room/Floor */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-primary-500">
                Room/Floor
              </h3>
              {isEditMode ? (
                <input
                  name="room_or_floor"
                  type="text"
                  value={selectedDevice.room_or_floor || ""}
                  onChange={(e) => handleChange(e, "room_or_floor")}
                  className="px-3 py-2 mt-1 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter room or floor (e.g., Room 205, 3rd Floor)"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.room_or_floor || "Not specified"}
                </p>
              )}
            </div>

            {/* Assigned To */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">
                Assigned To
              </h3>
              {isEditMode ? (
                <input
                  name="assigned_to"
                  type="text"
                  value={selectedDevice.assigned_to || ""}
                  onChange={(e) => handleChange(e, "assigned_to")}
                  className="px-3 py-2 mt-1 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter assigned user name"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {selectedDevice.assigned_to || "Unassigned"}
                </p>
              )}
            </div>
          </div>

          {/* Timestamps Section */}
          <div className="ts-wrapper md-22">
            <h1 className="mb-4 text-2xl font-semibold text-primary-800 title">
              Timestamps
            </h1>
            {/* First Seen */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">
                First Seen
              </h3>
              {isEditMode ? (
                <input
                  name="first_seen"
                  type="datetime-local"
                  value={
                    selectedDevice.first_seen
                      ? new Date(selectedDevice.first_seen)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) => handleChange(e, "first_seen")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {new Date(selectedDevice.first_seen).toLocaleString()}
                </p>
              )}
            </div>
            {/* Last Seen */}
            <div>
              <h3 className="text-sm font-medium text-primary-500">
                Last Seen
              </h3>
              {isEditMode ? (
                <input
                  name="last_seen"
                  type="datetime-local"
                  value={
                    selectedDevice.last_seen
                      ? new Date(selectedDevice.last_seen)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) => handleChange(e, "last_seen")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-primary-900">
                  {new Date(selectedDevice.last_seen).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="tsection-wrapper md-22">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-semibold text-primary-800 title">
                Transfer Information
              </h1>
              <div className="flex items-center space-x-2">
                <History size={16} className="text-primary-500" />
                <span className="text-xs text-primary-500 uppercase tracking-wide">
                  Transfer Status
                </span>
              </div>
            </div>

            {/* Transfer Status Summary */}
            {!isEditMode && (
              <div className="mb-4">
                {transferHistory && transferHistory.length > 0 ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <History
                          size={18}
                          className="text-blue-600 mt-0.5 flex-shrink-0"
                        />
                        <div>
                          <div className="text-sm font-medium text-blue-900 mb-1">
                            Transfer Detected
                          </div>
                          <div className="text-sm text-blue-700">
                            {transferHistory.length} transfer
                            {transferHistory.length !== 1 ? "s" : ""} recorded
                            for this device
                          </div>
                          {transferHistory[0] && (
                            <div className="text-xs text-blue-600 mt-1">
                              Latest:{" "}
                              {new Date(
                                transferHistory[0].transfer_date
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Clock size={18} className="text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-600">
                          No Transfer History
                        </div>
                        <div className="text-sm text-gray-500">
                          This device has not been transferred yet
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Transfer History Button */}
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransferHistory(true)}
                leftIcon={<History size={16} />}
                disabled={isLoadingTransfers}
                className="w-full"
              >
                {isLoadingTransfers ? "Loading..." : "View Transfer History"}
              </Button>
            </div>

            {/* Current Transfer Info (if exists) */}
            {(selectedDevice.previous_owner ||
              selectedDevice.transfer_date ||
              selectedDevice.transfer_department) && (
              <>
                {/* Previous Owner */}
                {selectedDevice.previous_owner && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-primary-500">
                      Previous Owner
                    </h3>
                    {isEditMode ? (
                      <input
                        name="previous_owner"
                        type="text"
                        value={selectedDevice.previous_owner || ""}
                        onChange={(e) => handleChange(e, "previous_owner")}
                        className="px-3 py-2 mt-1 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    ) : (
                      <p className="mt-1 text-primary-900">
                        {selectedDevice.previous_owner}
                      </p>
                    )}
                  </div>
                )}

                {/* Transfer Date */}
                {selectedDevice.transfer_date && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-primary-500">
                      Last Transfer Date
                    </h3>
                    {isEditMode ? (
                      <input
                        name="transfer_date"
                        type="datetime-local"
                        value={
                          selectedDevice.transfer_date
                            ? new Date(selectedDevice.transfer_date)
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        onChange={(e) => handleChange(e, "transfer_date")}
                        className="px-3 py-2 mt-1 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    ) : (
                      <p className="mt-1 text-primary-900">
                        {new Date(
                          selectedDevice.transfer_date
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Department */}
                {selectedDevice.transfer_department && (
                  <div>
                    <h3 className="text-sm font-medium text-primary-500">
                      Department
                    </h3>
                    {isEditMode ? (
                      <input
                        name="transfer_department"
                        type="text"
                        value={selectedDevice.transfer_department || ""}
                        onChange={(e) => handleChange(e, "transfer_department")}
                        className="px-3 py-2 mt-1 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    ) : (
                      <p className="mt-1 text-primary-900">
                        {selectedDevice.transfer_department}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      <TransferHistoryModal
        deviceId={id || ""}
        deviceHostname={selectedDevice?.hostname || "Unknown Device"}
        isOpen={showTransferHistory}
        onClose={() => setShowTransferHistory(false)}
      />
    </div>
  );
};

export default DeviceDetail;
