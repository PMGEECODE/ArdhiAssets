"use client";

import type React from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  HardDrive,
  Calendar,
  Lock,
  Filter,
  Shield,
  Upload,
  Key,
  X,
  AlertTriangle,
} from "lucide-react";
import DataTable from "../../../../shared/components/ui/DataTable";
import Card from "../../../../shared/components/ui/Card";
import Button from "../../../../shared/components/ui/Button";
import Modal from "../../../../shared/components/ui/Modal";
import { toast } from "react-toastify";
import { useCookieAuthStore } from "../../../../shared/store/cookieAuthStore";
import { API_URL } from "../../../../shared/config/constants";
import { format, parseISO } from "date-fns";

type BackupType = {
  id: string;
  filename: string;
  file_size: number;
  backup_type: string;
  status: "completed" | "failed" | "in_progress" | "restoring";
  created_by: string;
  created_at: string;
  error_message?: string;
  progress_percentage?: number;
  progress_message?: string;
  encrypted?: boolean;
};

const DEFAULT_DATE_FORMAT = "dd MMM yyyy, hh:mm a";

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const SystemBackups: React.FC = () => {
  // === STATE ===
  const [backups, setBackups] = useState<BackupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState<BackupType | null>(
    null
  );
  const [restoreStartTime, setRestoreStartTime] = useState<number | null>(null);
  const restoreIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    backup_type?: string;
  }>({});
  const [showDownloadPassword, setShowDownloadPassword] = useState<
    string | null
  >(null);
  const [downloadPassword, setDownloadPassword] = useState("");
  const [showEncryptPasswordModal, setShowEncryptPasswordModal] =
    useState(false);
  const [encryptPassword, setEncryptPassword] = useState("");
  const [encryptPasswordError, setEncryptPasswordError] = useState("");

  const [showRestorePassword, setShowRestorePassword] = useState<string | null>(
    null
  );
  const [restorePassword, setRestorePassword] = useState("");

  const tokenExpiryTimeout = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInProgressRef = useRef(false);

  // --- State for Master Password Modal ---
  const [showMasterPasswordModal, setShowMasterPasswordModal] = useState(true);
  const [backupToken, setBackupToken] = useState<string | null>(null);

  const { user } = useCookieAuthStore();

  // === AUTH & HEADERS ===
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    ...(backupToken && { "X-Backup-Token": backupToken }),
  });

  // === TOKEN HANDLING ===
  useEffect(() => {
    const token = sessionStorage.getItem("backup_token");
    const expires = sessionStorage.getItem("backup_token_expires");

    if (token && expires && Date.now() < Number.parseInt(expires)) {
      setBackupToken(token);
      setHasAccess(true);
      setShowMasterPasswordModal(false);
      const timeLeft = Number.parseInt(expires) - Date.now();
      tokenExpiryTimeout.current = setTimeout(handleTokenExpired, timeLeft);
    } else {
      handleTokenExpired();
    }

    return () => {
      if (tokenExpiryTimeout.current) clearTimeout(tokenExpiryTimeout.current);
    };
  }, []);

  const handleTokenExpired = () => {
    sessionStorage.removeItem("backup_token");
    sessionStorage.removeItem("backup_token_expires");
    setBackupToken(null);
    setHasAccess(false);
    setShowMasterPasswordModal(true);
    toast.warning("Session expired. Re-enter master password.");
  };

  const handleMasterPasswordSuccess = (token: string, expiresIn: number) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    sessionStorage.setItem("backup_token", token);
    sessionStorage.setItem("backup_token_expires", String(expiresAt));
    setBackupToken(token);
    setHasAccess(true);
    setShowMasterPasswordModal(false);
    toast.success("Access granted");
    tokenExpiryTimeout.current = setTimeout(
      handleTokenExpired,
      expiresIn * 1000
    );
    fetchBackups();
  };

  // === FETCH BACKUPS ===
  const fetchBackups = async () => {
    if (!hasAccess) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/backups`, {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok)
        throw new Error(res.status === 403 ? "Access denied" : "Load failed");
      const data = await res.json();
      setBackups(data);
      hasInProgressRef.current = data.some(
        (b: BackupType) => b.status === "in_progress"
      );
    } catch (err: any) {
      if (err.message === "Access denied") handleTokenExpired();
      else toast.error("Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  // === POLLING (3s when in progress) ===
  useEffect(() => {
    if (!hasAccess) return;

    fetchBackups();

    const startPolling = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        if (hasInProgressRef.current) fetchBackups();
      }, 3000);
    };

    startPolling();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [hasAccess]);

  // === CREATE BACKUP (Optimistic + Instant Refresh) ===
  const createBackup = async (encrypt: boolean) => {
    if (encrypt) {
      setShowEncryptPasswordModal(true);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const placeholder: BackupType = {
      id: tempId,
      filename: encrypt ? "encrypted-backup.enc" : "backup.sql",
      file_size: 0,
      backup_type: encrypt ? "encrypted" : "full",
      status: "in_progress",
      created_by: user?.email ?? "unknown",
      created_at: new Date().toISOString(),
      progress_percentage: 0,
      progress_message: "Initializing…",
      encrypted: encrypt,
    };

    try {
      setCreating(true);
      setEncrypting(encrypt);

      // Optimistic UI
      setBackups((prev) => [placeholder, ...prev]);
      hasInProgressRef.current = true;

      // Start real request
      const res = await fetch(`${API_URL}/backups/create`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ encrypt }),
      });

      if (!res.ok)
        throw new Error(res.status === 403 ? "Access denied" : "Create failed");

      toast.success(encrypt ? "Encrypted backup started" : "Backup started");
      fetchBackups(); // Immediate refresh to replace placeholder
    } catch (err: any) {
      if (err.message === "Access denied") handleTokenExpired();
      else toast.error("Failed to create backup");

      // Remove placeholder on error
      setBackups((prev) => prev.filter((b) => b.id !== tempId));
      hasInProgressRef.current = backups.some(
        (b) => b.status === "in_progress"
      );
    } finally {
      setCreating(false);
      setEncrypting(false);
    }
  };

  // === CREATE ENCRYPTED BACKUP WITH PASSWORD ===
  const createEncryptedBackup = async () => {
    if (!encryptPassword.trim()) {
      setEncryptPasswordError("Password is required");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const placeholder: BackupType = {
      id: tempId,
      filename: "encrypted-backup.enc",
      file_size: 0,
      backup_type: "encrypted",
      status: "in_progress",
      created_by: user?.email ?? "unknown",
      created_at: new Date().toISOString(),
      progress_percentage: 0,
      progress_message: "Initializing…",
      encrypted: true,
    };

    try {
      setCreating(true);
      setEncrypting(true);
      setEncryptPasswordError("");

      // Optimistic UI
      setBackups((prev) => [placeholder, ...prev]);
      hasInProgressRef.current = true;

      // Start real request with password
      const res = await fetch(`${API_URL}/backups/create`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ encrypt: true, password: encryptPassword }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Create failed");
      }

      toast.success("Encrypted backup started");
      setShowEncryptPasswordModal(false);
      setEncryptPassword("");
      fetchBackups(); // Immediate refresh to replace placeholder
    } catch (err: any) {
      if (err.message === "Access denied") handleTokenExpired();
      else {
        setEncryptPasswordError(err.message || "Failed to create backup");
        toast.error(err.message || "Failed to create backup");
      }

      // Remove placeholder on error
      setBackups((prev) => prev.filter((b) => b.id !== tempId));
      hasInProgressRef.current = backups.some(
        (b) => b.status === "in_progress"
      );
    } finally {
      setCreating(false);
      setEncrypting(false);
    }
  };

  // === DOWNLOAD ===
  const downloadBackup = async (
    backupId: string,
    filename: string,
    encrypted: boolean
  ) => {
    if (encrypted) {
      setShowDownloadPassword(backupId);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/backups/${backupId}/download`, {
        method: "GET",
        credentials: "include",
        headers: backupToken ? { "X-Backup-Token": backupToken } : {},
      });
      if (!res.ok)
        throw new Error(
          res.status === 403 ? "Access denied" : "Download failed"
        );

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Downloaded");
    } catch (err: any) {
      if (err.message === "Access denied") handleTokenExpired();
      else toast.error("Download failed");
    }
  };

  const confirmDownloadWithPassword = async () => {
    if (!showDownloadPassword || !downloadPassword) return;
    try {
      const res = await fetch(
        `${API_URL}/backups/${showDownloadPassword}/download`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(backupToken && { "X-Backup-Token": backupToken }),
          },
          body: JSON.stringify({ password: downloadPassword }),
        }
      );
      if (!res.ok) throw new Error("Invalid password");

      const blob = await res.blob();
      const backup = backups.find((b) => b.id === showDownloadPassword);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backup?.filename || "backup.enc";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Decrypted & downloaded");
      setShowDownloadPassword(null);
      setDownloadPassword("");
    } catch {
      toast.error("Wrong password");
    }
  };

  // === RESTORE ===
  const restoreBackup = async (backupId: string, encrypted = false) => {
    if (!confirm("Restore this backup? This will overwrite current data."))
      return;

    const backup = backups.find((b) => b.id === backupId);
    if (!backup) return;

    if (encrypted) {
      setShowRestorePassword(backupId);
      return;
    }

    performRestore(backupId, null);
  };

  const performRestore = async (backupId: string, password: string | null) => {
    try {
      const backup = backups.find((b) => b.id === backupId);
      if (!backup) return;

      setShowRestoreModal(backup);
      setRestoreStartTime(Date.now());

      const body: any = {};
      if (password) {
        body.password = password;
      }

      const res = await fetch(`${API_URL}/backups/${backupId}/restore`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Restore failed");
      }

      restoreIntervalRef.current = setInterval(() => {
        fetchBackups();
      }, 1000);

      toast.success("Restore started. Please do not close this window.");
    } catch (err: any) {
      if (err.message === "Access denied") handleTokenExpired();
      else toast.error(err.message || "Restore failed");

      setShowRestoreModal(null);
      setRestoreStartTime(null);
      if (restoreIntervalRef.current) clearInterval(restoreIntervalRef.current);
    }
  };

  const confirmRestoreWithPassword = async () => {
    if (!showRestorePassword || !restorePassword) return;
    performRestore(showRestorePassword, restorePassword);
    setShowRestorePassword(null);
    setRestorePassword("");
  };

  // === CLEANUP ===
  useEffect(() => {
    return () => {
      if (restoreIntervalRef.current) clearInterval(restoreIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showRestoreModal) return;

    const updatedBackup = backups.find((b) => b.id === showRestoreModal.id);
    if (
      updatedBackup &&
      updatedBackup.status !== "restoring" &&
      updatedBackup.status !== "in_progress"
    ) {
      // Restore completed or failed
      if (restoreIntervalRef.current) clearInterval(restoreIntervalRef.current);

      if (updatedBackup.status === "completed") {
        toast.success("Database restored successfully!");
      } else if (updatedBackup.status === "failed") {
        toast.error(
          `Restore failed: ${updatedBackup.error_message || "Unknown error"}`
        );
      }
      setShowRestoreModal(null);
      setRestoreStartTime(null);
    }
  }, [backups, showRestoreModal]);

  // === DELETE ===
  const deleteBackup = async (backupId: string) => {
    if (!confirm("Delete this backup?")) return;
    try {
      const res = await fetch(`${API_URL}/backups/${backupId}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok)
        throw new Error(res.status === 403 ? "Access denied" : "Delete failed");
      toast.success("Deleted");
      fetchBackups();
    } catch (err: any) {
      if (err.message === "Access denied") handleTokenExpired();
      else toast.error("Delete failed");
    }
  };

  const formatTimestamp = (value?: string): string =>
    value ? format(parseISO(value), DEFAULT_DATE_FORMAT) : "";

  // === COLUMNS ===
  const columns = useMemo(
    () => [
      {
        header: "Status",
        accessor: (row: BackupType) => row.status,
        cell: (status: string) => {
          const isSuccess = status === "completed";
          const isFailed = status === "failed";
          const isInProgress =
            status === "in_progress" || status === "restoring";
          return (
            <div className="flex items-center space-x-2">
              {isSuccess && (
                <CheckCircle className="w-4 h-4 text-success-600 dark:text-success-400" />
              )}
              {isFailed && (
                <AlertCircle className="w-4 h-4 text-error-600 dark:text-error-400" />
              )}
              {isInProgress && (
                <Clock className="w-4 h-4 text-accent-600 dark:text-accent-400 animate-spin" />
              )}
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                  isSuccess
                    ? "bg-success-100 dark:bg-success-900 text-success-800 dark:text-success-300"
                    : isFailed
                    ? "bg-error-100 dark:bg-error-900 text-error-800 dark:text-error-300"
                    : isInProgress
                    ? "bg-accent-100 dark:bg-accent-900 text-accent-800 dark:text-accent-300"
                    : "bg-primary-100 dark:bg-primary-800 text-primary-800 dark:text-primary-300"
                }`}
              >
                {status.replace("_", " ")}
              </span>
            </div>
          );
        },
        sortable: true,
      },
      {
        header: "Filename",
        accessor: "filename",
        cell: (value: string, row: BackupType) => (
          <div>
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-primary-400 dark:text-primary-500" />
              <span className="font-medium text-primary-900 dark:text-primary-100">
                {value}
              </span>
              {row.encrypted && (
                <Shield
                  className="w-4 h-4 text-green-600 dark:text-green-400"
                  title="Encrypted"
                />
              )}
            </div>
            {row.error_message && (
              <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                {row.error_message}
              </p>
            )}
          </div>
        ),
      },
      {
        header: "Progress",
        accessor: (row: BackupType) =>
          row.status === "in_progress" || row.status === "restoring"
            ? row.progress_percentage || 0
            : null,
        cell: (value: number | null, row: BackupType) => {
          if (row.status !== "in_progress" && row.status !== "restoring")
            return (
              <span className="text-xs text-primary-500 dark:text-primary-400">
                —
              </span>
            );

          return (
            <div className="w-32">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-primary-600 dark:text-primary-400">
                  {row.progress_message || "Processing..."}
                </span>
                <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                  {value}%
                </span>
              </div>
              <div className="w-full bg-primary-200 dark:bg-primary-700 rounded-full h-1.5">
                <div
                  className="bg-accent-600 dark:bg-accent-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        header: "Size",
        accessor: "file_size",
        cell: (value: number) => (
          <span className="text-sm text-primary-700 dark:text-primary-300">
            {formatFileSize(value)}
          </span>
        ),
      },
      {
        header: "Type",
        accessor: "backup_type",
        cell: (value: string) => (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-primary-100 dark:bg-primary-800 text-primary-800 dark:text-primary-300">
            {value}
          </span>
        ),
      },
      {
        header: "Created",
        accessor: "created_at",
        cell: (value: string) => (
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-primary-400 dark:text-primary-500" />
            <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
              {formatTimestamp(value)}
            </span>
          </div>
        ),
        sortable: true,
      },
      {
        header: "Actions",
        accessor: "id",
        cell: (_: any, row: BackupType) => (
          <div className="flex items-center justify-end space-x-1">
            {row.status === "completed" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  downloadBackup(row.id, row.filename, !!row.encrypted)
                }
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download
              </Button>
            )}
            {row.status === "completed" && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => restoreBackup(row.id, !!row.encrypted)}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                disabled={
                  row.status === "restoring" || row.status === "in_progress"
                }
              >
                {row.status === "restoring" || row.status === "in_progress"
                  ? "Restoring..."
                  : "Restore"}
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={() => deleteBackup(row.id)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              disabled={
                row.status === "restoring" || row.status === "in_progress"
              }
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [backupToken, showRestoreModal]
  );

  // === RENDER ===
  return (
    <>
      {/* MASTER PASSWORD MODAL */}
      <MasterPasswordModal
        isOpen={showMasterPasswordModal}
        onClose={() => setShowMasterPasswordModal(false)}
        onSuccess={handleMasterPasswordSuccess}
      />

      {/* ENCRYPTED BACKUP PASSWORD MODAL */}
      {showEncryptPasswordModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowEncryptPasswordModal(false);
            setEncryptPassword("");
            setEncryptPasswordError("");
          }}
          title="Set Encryption Password"
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowEncryptPasswordModal(false);
                  setEncryptPassword("");
                  setEncryptPasswordError("");
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={createEncryptedBackup}
                disabled={!encryptPassword.trim() || creating}
              >
                {creating ? "Creating..." : "Create Encrypted Backup"}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
              <Lock className="w-4 h-4" />
              <span>Set a strong password to encrypt this backup.</span>
            </div>
            <input
              type="password"
              value={encryptPassword}
              onChange={(e) => {
                setEncryptPassword(e.target.value);
                setEncryptPasswordError("");
              }}
              placeholder="Encryption password"
              className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
              autoFocus
            />
            {encryptPasswordError && (
              <p className="text-xs text-error-600 dark:text-error-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {encryptPasswordError}
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* DOWNLOAD PASSWORD MODAL */}
      {showDownloadPassword && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowDownloadPassword(null);
            setDownloadPassword("");
          }}
          title="Enter Backup Password"
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowDownloadPassword(null);
                  setDownloadPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmDownloadWithPassword}
                disabled={!downloadPassword}
              >
                Download
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
              <Key className="w-4 h-4" />
              <span>
                This backup is encrypted. Enter the password to download.
              </span>
            </div>
            <input
              type="password"
              value={downloadPassword}
              onChange={(e) => setDownloadPassword(e.target.value)}
              placeholder="Backup password"
              className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
              autoFocus
            />
          </div>
        </Modal>
      )}

      {/* RESTORE PASSWORD MODAL */}
      {showRestorePassword && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowRestorePassword(null);
            setRestorePassword("");
          }}
          title="Enter Backup Password"
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowRestorePassword(null);
                  setRestorePassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmRestoreWithPassword}
                disabled={!restorePassword}
              >
                Restore
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
              <Key className="w-4 h-4" />
              <span>
                This backup is encrypted. Enter the password to restore.
              </span>
            </div>
            <input
              type="password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              placeholder="Backup password"
              className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
              autoFocus
            />
          </div>
        </Modal>
      )}

      {showRestoreModal && (
        <RestoreProgressModal
          backup={showRestoreModal}
          startTime={restoreStartTime}
          onClose={() => {
            setShowRestoreModal(null);
            setRestoreStartTime(null);
            if (restoreIntervalRef.current)
              clearInterval(restoreIntervalRef.current);
          }}
        />
      )}

      {/* LOCKED SCREEN */}
      {!hasAccess && (
        <div className="min-h-screen bg-primary-50 dark:bg-primary-950 flex items-center justify-center p-4">
          <div className="text-center">
            <Lock className="w-16 h-16 text-primary-400 dark:text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-50 mb-2">
              Master Password Required
            </h2>
            <p className="text-primary-600 dark:text-primary-400">
              Authenticate to access System Backups
            </p>
          </div>
        </div>
      )}

      {/* MAIN UI */}
      {hasAccess && (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-primary-900 dark:text-primary-50 flex items-center space-x-2">
                <Database className="w-7 h-7 text-accent-600 dark:text-accent-400" />
                <span>System Backups</span>
              </h1>
              <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                Create, restore, and manage encrypted backups
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                }
                onClick={fetchBackups}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Filter className="w-4 h-4" />}
                onClick={() => setIsFilterModalOpen(true)}
              >
                Filter
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Database className="w-4 h-4" />}
                onClick={() => createBackup(false)}
                disabled={creating}
              >
                {creating && !encrypting ? "Creating..." : "Create Backup"}
              </Button>
              <Button
                variant="success"
                size="sm"
                leftIcon={<Shield className="w-4 h-4" />}
                onClick={() => createBackup(true)}
                disabled={creating}
              >
                {creating && encrypting ? "Encrypting..." : "Encrypted Backup"}
              </Button>
            </div>
          </div>

          <div className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-accent-600 dark:text-accent-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-accent-900 dark:text-accent-100">
                  About System Backups
                </h3>
                <p className="mt-1 text-sm text-accent-700 dark:text-accent-300">
                  Use <strong>Encrypted Backup</strong> for sensitive data.
                  Restore will overwrite current database.
                </p>
              </div>
            </div>
          </div>

          <Card className="bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700 overflow-hidden">
            {loading && backups.length === 0 ? (
              <div className="p-8 text-center text-sm text-primary-600 dark:text-primary-400">
                Loading...
              </div>
            ) : backups.length === 0 ? (
              <div className="p-12 text-center">
                <Database className="mx-auto h-12 w-12 text-primary-400 dark:text-primary-600" />
                <h3 className="mt-4 text-lg font-medium text-primary-900 dark:text-primary-50">
                  No backups yet
                </h3>
                <p className="mt-2 text-sm text-primary-500 dark:text-primary-400">
                  Create your first backup
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button
                    onClick={() => createBackup(false)}
                    disabled={creating}
                  >
                    Create Backup
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => createBackup(true)}
                    disabled={creating}
                  >
                    Encrypted Backup
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable<BackupType>
                  data={backups}
                  columns={columns}
                  keyField="id"
                  searchable
                  pagination
                  rowClassName="border-b border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-800"
                  headerClassName="bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 font-medium text-xs uppercase tracking-wider"
                  cellClassName="px-3 py-2.5 text-sm"
                />
              </div>
            )}
          </Card>

          {backups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-success-100 dark:bg-success-900 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="text-sm text-primary-600 dark:text-primary-400">
                      Completed
                    </p>
                    <p className="text-2xl font-bold text-primary-900 dark:text-primary-50">
                      {backups.filter((b) => b.status === "completed").length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent-100 dark:bg-accent-900 rounded-lg">
                    <Clock className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                  </div>
                  <div>
                    <p className="text-sm text-primary-600 dark:text-primary-400">
                      In Progress
                    </p>
                    <p className="text-2xl font-bold text-primary-900 dark:text-primary-50">
                      {
                        backups.filter(
                          (b) =>
                            b.status === "in_progress" ||
                            b.status === "restoring"
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-primary-600 dark:text-primary-400">
                      Encrypted
                    </p>
                    <p className="text-2xl font-bold text-primary-900 dark:text-primary-50">
                      {backups.filter((b) => b.encrypted).length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg">
                    <HardDrive className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-primary-600 dark:text-primary-400">
                      Total Size
                    </p>
                    <p className="text-2xl font-bold text-primary-900 dark:text-primary-50">
                      {formatFileSize(
                        backups
                          .filter((b) => b.status === "completed")
                          .reduce((sum, b) => sum + b.file_size, 0)
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <Modal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            title="Filter Backups"
            size="md"
            footer={
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFilters({});
                    setIsFilterModalOpen(false);
                    fetchBackups();
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsFilterModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsFilterModalOpen(false);
                    fetchBackups();
                  }}
                  disabled={loading}
                >
                  Apply
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status ?? ""}
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, status: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
                >
                  <option value="">All</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                  Backup Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. full, incremental"
                  value={filters.backup_type ?? ""}
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, backup_type: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all"
                  autoFocus
                />
              </div>
            </div>
          </Modal>
        </div>
      )}
    </>
  );
};

// === MASTER PASSWORD MODAL ===
interface MasterPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, expiresIn: number) => void;
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
      const res = await fetch(`${API_URL}/backups/master-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Invalid master password");
      const data = await res.json();
      onSuccess(data.backup_token, data.expires_in);
      setPassword("");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-primary-900 rounded-lg shadow-xl w-full max-w-md border border-primary-200 dark:border-primary-700">
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
            className="text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mx-6 mb-5 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-warning-800 dark:text-warning-300">
            <p className="font-medium mb-1">Restricted Access</p>
            <p>Enter the master password to access System Backups.</p>
          </div>
        </div>

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

          <div className="flex gap-3">
            <Button
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

        <div className="px-6 pb-6">
          <p className="text-xs text-primary-500 dark:text-primary-400 text-center">
            Access is logged and expires automatically
          </p>
        </div>
      </div>
    </div>
  );
};

interface RestoreProgressModalProps {
  backup: BackupType;
  startTime: number | null;
  onClose: () => void;
}

const RestoreProgressModal: React.FC<RestoreProgressModalProps> = ({
  backup,
  startTime,
  onClose,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  useEffect(() => {
    const sizeInMB = backup.file_size / (1024 * 1024);
    const estimatedSeconds = Math.ceil(sizeInMB / 5) + 30;
    setEstimatedTime(estimatedSeconds);
  }, [backup.file_size]);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    }, 500);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const progressPercent = backup.progress_percentage || 0;
  const isCompleted = backup.status === "completed";
  const isFailed = backup.status === "failed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-primary-900 rounded-lg shadow-2xl w-full max-w-md border border-primary-200 dark:border-primary-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isCompleted
                  ? "bg-success-100 dark:bg-success-900"
                  : isFailed
                  ? "bg-error-100 dark:bg-error-900"
                  : "bg-accent-100 dark:bg-accent-900"
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="w-6 h-6 text-success-600 dark:text-success-400" />
              ) : isFailed ? (
                <AlertCircle className="w-6 h-6 text-error-600 dark:text-error-400" />
              ) : (
                <RefreshCw className="w-6 h-6 text-accent-600 dark:text-accent-400 animate-spin" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-primary-900 dark:text-primary-50">
              {isCompleted
                ? "Restore Completed"
                : isFailed
                ? "Restore Failed"
                : "Restoring Database"}
            </h2>
          </div>
          {(isCompleted || isFailed) && (
            <button
              onClick={onClose}
              className="text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* File Info */}
          <div className="p-4 bg-primary-50 dark:bg-primary-800 rounded-lg">
            <p className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Backup File
            </p>
            <p className="text-sm text-primary-600 dark:text-primary-400 font-mono break-all">
              {backup.filename}
            </p>
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
              Size: {formatFileSize(backup.file_size)}
            </p>
          </div>

          {/* Progress Bar */}
          {!isFailed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {backup.progress_message || "Processing..."}
                </p>
                <span className="text-sm font-semibold text-accent-600 dark:text-accent-400">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full bg-primary-200 dark:bg-primary-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-accent-500 to-accent-600 dark:from-accent-500 dark:to-accent-400 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {isFailed && backup.error_message && (
            <div className="p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
              <p className="text-sm text-error-700 dark:text-error-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{backup.error_message}</span>
              </p>
            </div>
          )}

          {/* Time Info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-primary-50 dark:bg-primary-800 rounded-lg text-center">
              <p className="text-xs text-primary-600 dark:text-primary-400 mb-1">
                Elapsed
              </p>
              <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                {formatTime(elapsedTime)}
              </p>
            </div>
            <div className="p-3 bg-primary-50 dark:bg-primary-800 rounded-lg text-center">
              <p className="text-xs text-primary-600 dark:text-primary-400 mb-1">
                Estimated
              </p>
              <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                {formatTime(estimatedTime)}
              </p>
            </div>
            <div className="p-3 bg-primary-50 dark:bg-primary-800 rounded-lg text-center">
              <p className="text-xs text-primary-600 dark:text-primary-400 mb-1">
                Remaining
              </p>
              <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                {formatTime(Math.max(0, estimatedTime - elapsedTime))}
              </p>
            </div>
          </div>

          {/* Warning */}
          {!isCompleted && !isFailed && (
            <div className="p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg flex gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-warning-800 dark:text-warning-300">
                <p className="font-medium mb-1">Do Not Close</p>
                <p>
                  Closing this window may interrupt the restore process and
                  damage your database.
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {isCompleted && (
            <div className="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg flex gap-3">
              <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-success-800 dark:text-success-300">
                <p className="font-medium">Restore Successful</p>
                <p>Your database has been restored from the backup.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(isCompleted || isFailed) && (
          <div className="border-t border-primary-200 dark:border-primary-700 px-6 py-4 flex justify-end">
            <Button variant="primary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemBackups;
