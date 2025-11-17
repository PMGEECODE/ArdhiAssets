"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Clock,
  User,
  MapPin,
  Building,
  FileText,
  ArrowRight,
  X,
  History,
} from "lucide-react";

import Button from "./Button";
import type { DeviceTransfer } from "../../types";
import { API_URL } from "../../config";

interface TransferHistoryModalProps {
  deviceId: string;
  deviceHostname: string;
  isOpen: boolean;
  onClose: () => void;
}

const TransferHistoryModal: React.FC<TransferHistoryModalProps> = ({
  deviceId,
  deviceHostname,
  isOpen,
  onClose,
}) => {
  const [transfers, setTransfers] = useState<DeviceTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !deviceId) return;

    const fetchTransferHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get token from localStorage
        const storedAuth = localStorage.getItem("auth-storage");
        const authData = storedAuth ? JSON.parse(storedAuth) : null;
        const token = authData?.state?.token;

        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(
          `${API_URL}/devices/${deviceId}/transfers`,
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
  }, [deviceId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between 2 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <History className="text-primary-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-primary-900">
                Transfer History
              </h2>
              <p className="text-sm text-primary-600">
                Complete transfer history for {deviceHostname}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
            <X size={20} />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-2 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 rounded-full border-b-2 animate-spin border-primary-600"></div>
              <span className="ml-3 text-primary-600">
                Loading transfer history...
              </span>
            </div>
          )}

          {error && (
            <div className="py-12 text-center">
              <div className="text-red-600 mb-2 font-medium">
                Failed to load transfer history
              </div>
              <div className="text-sm text-primary-500">{error}</div>
            </div>
          )}

          {!isLoading && !error && transfers.length === 0 && (
            <div className="py-12 text-center">
              <History className="mx-auto mb-4 text-primary-300" size={48} />
              <div className="text-primary-500 mb-2 font-medium">
                No transfer history found
              </div>
              <div className="text-sm text-primary-400">
                This device has not been transferred yet.
              </div>
            </div>
          )}

          {!isLoading && !error && transfers.length > 0 && (
            <div className="space-y-6">
              <div className="text-sm text-primary-600 mb-4">
                {transfers.length} transfer{transfers.length !== 1 ? "s" : ""}{" "}
                recorded
              </div>

              {transfers.map((transfer, index) => (
                <div
                  key={transfer.id}
                  className={`relative p-2 rounded-lg border transition-all hover:shadow-md ${
                    index === 0
                      ? "border-primary-200 bg-primary-50 shadow-sm"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {/* Timeline Indicator */}
                  <div className="absolute left-0 top-6 w-1 h-full bg-gray-200 rounded-full"></div>
                  <div
                    className={`absolute left-0 top-6 w-1 h-12 rounded-full ${
                      index === 0 ? "bg-primary-500" : "bg-primary-300"
                    }`}
                  ></div>

                  <div className="ml-8">
                    {/* Transfer Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Clock size={18} className="text-primary-500" />
                        <span className="text-lg font-semibold text-primary-900">
                          {format(
                            new Date(transfer.transfer_date),
                            "MMMM dd, yyyy 'at' HH:mm"
                          )}
                        </span>
                        {index === 0 && (
                          <span className="px-3 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                            Latest Transfer
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Transfer Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      {/* Owner Transfer */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-primary-500 uppercase tracking-wide">
                          Ownership Transfer
                        </h4>
                        <div className="flex items-center space-x-3 p-3 bg-white rounded-md border border-gray-100">
                          <User
                            size={16}
                            className="text-primary-400 flex-shrink-0"
                          />
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            {transfer.previous_owner && (
                              <>
                                <span className="text-sm text-primary-600 truncate font-medium">
                                  {transfer.previous_owner}
                                </span>
                                <ArrowRight
                                  size={14}
                                  className="text-primary-400 flex-shrink-0"
                                />
                              </>
                            )}
                            <span className="text-sm font-semibold text-primary-900 truncate">
                              {transfer.assigned_to}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Location Transfer */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-primary-500 uppercase tracking-wide">
                          Location Transfer
                        </h4>
                        <div className="p-3 bg-white rounded-md border border-gray-100">
                          {transfer.location || transfer.transfer_location ? (
                            <div className="flex items-center space-x-3">
                              <MapPin
                                size={16}
                                className="text-primary-400 flex-shrink-0"
                              />
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                {transfer.location &&
                                  transfer.location !==
                                    transfer.transfer_location && (
                                    <>
                                      <span className="text-sm text-primary-600 truncate font-medium">
                                        {transfer.location}
                                      </span>
                                      <ArrowRight
                                        size={14}
                                        className="text-primary-400 flex-shrink-0"
                                      />
                                    </>
                                  )}
                                <span className="text-sm font-semibold text-primary-900 truncate">
                                  {transfer.transfer_location}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-primary-400">
                              No location specified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Department */}
                      {transfer.transfer_department && (
                        <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md">
                          <Building size={16} className="text-primary-400" />
                          <span className="text-sm text-primary-600">
                            Department:
                          </span>
                          <span className="text-sm text-primary-900 font-medium">
                            {transfer.transfer_department}
                          </span>
                        </div>
                      )}

                      {/* Room/Floor */}
                      {transfer.transfer_room_or_floor && (
                        <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md">
                          <MapPin size={16} className="text-primary-400" />
                          <span className="text-sm text-primary-600">
                            Room/Floor:
                          </span>
                          <span className="text-sm text-primary-900 font-medium">
                            {transfer.transfer_room_or_floor}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Transfer Reason */}
                    {transfer.transfer_reason && (
                      <div className="p-4 bg-primary-25 rounded-md border border-primary-100">
                        <div className="flex items-start space-x-3">
                          <FileText
                            size={16}
                            className="text-primary-400 mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <span className="text-sm text-primary-600 font-medium">
                              Transfer Reason:
                            </span>
                            <p className="text-sm text-primary-900 mt-1 leading-relaxed">
                              {transfer.transfer_reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Transfer Metadata */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-primary-400">
                        <span>Transfer ID: {transfer.id}</span>
                        <span>
                          Recorded:{" "}
                          {format(
                            new Date(transfer.created_at),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-2 border-t border-gray-200 bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransferHistoryModal;
