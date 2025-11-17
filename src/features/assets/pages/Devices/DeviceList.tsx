"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, Trash2, Edit, Eye, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-toastify";

import { useDeviceStore } from "../../store/deviceStore";
import type { Device } from "../../types";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

const DeviceList: React.FC = () => {
  const navigate = useNavigate();
  const { devices, fetchDevices, deleteDevice, isLoading } = useDeviceStore();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleViewDevice = (device: Device) => {
    navigate(`/devices/${device.id}`);
  };

  const handleEditDevice = (device: Device) => {
    navigate(`/devices/${device.id}?edit=true`);
  };

  const handleDeleteClick = (device: Device) => {
    setDeviceToDelete(device);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deviceToDelete) return;

    setIsDeleting(true);
    try {
      await deleteDevice(String(deviceToDelete.id));
      toast.success(`Device "${deviceToDelete.hostname}" deleted successfully`);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting device:", error);
      toast.error("Failed to delete device");
    } finally {
      setIsDeleting(false);
    }
  };

  type Column = {
    header: string;
    accessor:
      | keyof Device
      | ((row: Device, rowIndex?: number) => React.ReactNode);
    sortable?: boolean;
    cell?: (value: any) => React.ReactNode;
  };

  const columns: Column[] = [
    {
      header: "#",
      accessor: (row: Device, rowIndex?: number) => {
        // Calculate the index based on current page and position
        if (rowIndex !== undefined) {
          return (currentPage - 1) * pageSize + rowIndex + 1;
        }
        // Fallback for when rowIndex is not provided
        return devices.indexOf(row) + 1;
      },
      sortable: false,
    },
    {
      header: "Hostname",
      accessor: "hostname",
      sortable: true,
    },
    {
      header: "Platform",
      accessor: "platform",
      sortable: true,
    },
    {
      header: "OS",
      accessor: (row: Device) => `${row.os_product_name} ${row.os_version}`,
    },
    {
      header: "Model",
      accessor: "model",
      sortable: true,
    },
    {
      header: "Last Seen",
      accessor: "last_seen",
      sortable: true,
      cell: (value: string) => format(new Date(value), "MMM dd, yyyy HH:mm"),
    },
    {
      header: "IP Address",
      accessor: "local_ip",
      sortable: true,
    },
  ];

  const renderActions = (device: Device) => (
    <div className="flex space-x-2">
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-blue-600 rounded transition-colors hover:text-blue-800 hover:bg-blue-100"
        title="View Device Details"
        onClick={(e) => {
          e.stopPropagation();
          handleViewDevice(device);
        }}
      >
        <Eye size={18} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-green-600 rounded transition-colors hover:text-green-800 hover:bg-green-100"
        title="Edit Device"
        onClick={(e) => {
          e.stopPropagation();
          handleEditDevice(device);
        }}
      >
        <Edit size={18} />
      </Button>
      {/* Transfer */}
      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-purple-600 rounded transition-colors hover:text-purple-800 hover:bg-purple-100"
        title="Transfer Device"
        onClick={(e) => {
          e.stopPropagation();
          handleTransferDevice(device);
        }}
      >
        <ArrowRight size={18} />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="p-1 text-red-600 rounded transition-colors hover:text-red-800 hover:bg-red-100"
        title="Delete Device"
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteClick(device);
        }}
      >
        <Trash2 size={18} />
      </Button>
    </div>
  );

  const handleTransferDevice = (device: Device) => {
    navigate(`/devices/${device.id}/transfer`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary-900">Devices</h1>
        <div className="flex space-x-2">
          <Button variant="secondary" leftIcon={<Download size={16} />}>
            Export
          </Button>
          <Button
            variant="primary"
            className="bg-accent-500 hover:bg-accent-600"
            leftIcon={<Plus size={16} />}
            onClick={() => navigate("/devices/new")}
          >
            Add Device
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center space-x-2 text-gray-500">
          <svg
            className="w-5 h-5 text-gray-500 animate-spin"
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span>Loading devices...</span>
        </div>
      ) : (
        <Card>
          <DataTable<Device>
            data={devices}
            columns={columns}
            keyField="id"
            onRowClick={handleViewDevice}
            actions={renderActions}
            searchable
            pagination
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-primary-700">
          Are you sure you want to delete the device{" "}
          <span className="font-semibold">{deviceToDelete?.hostname}</span>?
        </p>
        <p className="mt-2 text-sm text-primary-500">
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default DeviceList;
