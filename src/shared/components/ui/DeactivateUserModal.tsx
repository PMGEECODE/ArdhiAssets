"use client";

import type React from "react";
import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { AlertTriangle } from "lucide-react";

interface DeactivateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  userName: string;
  isLoading?: boolean;
}

const DeactivateUserModal: React.FC<DeactivateUserModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  isLoading = false,
}) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason("");
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Confirm Account Deactivation"
    >
      <div className="space-y-4">
        <div className="flex items-center p-4 space-x-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <AlertTriangle className="flex-shrink-0 w-6 h-6 text-yellow-600" />
          <div>
            <h4 className="font-medium text-yellow-800">Warning</h4>
            <p className="text-sm text-yellow-700">
              You are about to deactivate <strong>{userName}</strong>'s account.
              This will prevent them from logging in until their account is
              reactivated.
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="deactivation-reason"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            Reason for deactivation <span className="text-red-500">*</span>
          </label>
          <textarea
            id="deactivation-reason"
            rows={4}
            className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Please provide a reason for deactivating this account..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
          />
          {reason.trim().length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              A reason is required to proceed with deactivation.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-4 space-x-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            isLoading={isLoading}
          >
            Deactivate Account
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeactivateUserModal;
