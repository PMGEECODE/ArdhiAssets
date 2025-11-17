// src/pages/TransferDevice.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Send } from "lucide-react";

import { useDeviceStore } from "../../store/deviceStore";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

const TransferDevice: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchDevice, selectedDevice, updateDevice, setSelectedDevice } =
    useDeviceStore();

  const [transferData, setTransferData] = useState({
    newLocation: "",
    newDepartment: "",
    reason: "",
  });

  useEffect(() => {
    const loadDevice = async () => {
      if (id) {
        try {
          await fetchDevice(id);
        } catch (err) {
          toast.error("Failed to load device.");
          navigate("/devices");
        }
      }
    };
    loadDevice();

    return () => setSelectedDevice(null);
  }, [id, fetchDevice, setSelectedDevice, navigate]);

  const handleTransfer = async () => {
    if (!selectedDevice) return;

    try {
      const updated = {
        ...selectedDevice,
        location: transferData.newLocation,
        department: transferData.newDepartment,
        transferNote: transferData.reason,
      };

      await updateDevice(selectedDevice.id.toString(), updated);
      toast.success("Device transferred successfully");
      navigate("/devices");
    } catch (err) {
      toast.error("Transfer failed");
    }
  };

  if (!selectedDevice) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          className="p-2"
          onClick={() => navigate(`/devices/${id}`)}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold">Transfer Device</h1>
      </div>

      <Card className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-primary-500">
              New Location
            </label>
            <input
              type="text"
              value={transferData.newLocation}
              onChange={(e) =>
                setTransferData({
                  ...transferData,
                  newLocation: e.target.value,
                })
              }
              className="px-3 py-2 mt-1 w-full rounded border border-gray-300"
              placeholder="Enter new location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-500">
              New Department
            </label>
            <input
              type="text"
              value={transferData.newDepartment}
              onChange={(e) =>
                setTransferData({
                  ...transferData,
                  newDepartment: e.target.value,
                })
              }
              className="px-3 py-2 mt-1 w-full rounded border border-gray-300"
              placeholder="Enter new department"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-primary-500">
              Reason for Transfer
            </label>
            <textarea
              value={transferData.reason}
              onChange={(e) =>
                setTransferData({ ...transferData, reason: e.target.value })
              }
              className="px-3 py-2 mt-1 w-full rounded border border-gray-300"
              rows={4}
              placeholder="Optional notes or reason for transfer"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            variant="primary"
            leftIcon={<Send size={16} />}
            onClick={handleTransfer}
          >
            Submit Transfer
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TransferDevice;
