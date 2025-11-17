"use client";

import type React from "react";
import { useState } from "react";
import { X, Lock, AlertTriangle } from "lucide-react";
import Button from "../../../../shared/components/ui/Button";
import { toast } from "react-toastify";
import { API_URL } from "../../../../shared/config/constants";

interface MasterPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

const MasterPasswordModal: React.FC<MasterPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/backups/master-password/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ password }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Invalid master password");
      }

      const data = await response.json();

      sessionStorage.setItem("backup_token", data.backup_token);
      sessionStorage.setItem(
        "backup_token_expires",
        String(Date.now() + data.expires_in * 1000)
      );

      toast.success("Access granted to System Backups");
      onSuccess(data.backup_token);
      setPassword("");
      onClose();
    } catch (err: any) {
      const message = err.message || "Failed to verify master password";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-primary-900 rounded-lg shadow-xl w-full max-w-md border border-primary-200 dark:border-primary-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-error-100 dark:bg-error-900 rounded-lg">
              <Lock className="w-6 h-6 text-error-600 dark:text-error-400" />
            </div>
            <h2 className="text-xl font-semibold text-primary-900 dark:text-primary-50">
              Master Password Required
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Alert */}
        <div className="mx-6 mb-5 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-warning-800 dark:text-warning-300">
            <p className="font-medium mb-1">Restricted Access</p>
            <p>
              System Backups contain sensitive data. Enter the master password
              to proceed.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="mb-5">
            <label
              htmlFor="master-password"
              className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2"
            >
              Master Password
            </label>
            <input
              id="master-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 placeholder:text-primary-500 dark:placeholder:text-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
              placeholder="Enter master password"
              autoFocus
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isLoading || !password.trim()}
              className="flex-1"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-primary-500 dark:text-primary-400 text-center">
            Access is logged and monitored for security purposes
          </p>
        </div>
      </div>
    </div>
  );
};

export default MasterPasswordModal;
