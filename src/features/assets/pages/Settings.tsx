"use client";

import React, { useState, useEffect, useRef } from "react";
import { Save, Bell, User, Shield, Lock, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import Button from "../../../shared/components/ui/Button";
import Card from "../../../shared/components/ui/Card";
import Modal from "../../../shared/components/ui/Modal";
import TwoFactorSetup from "../../../features/auth/adminRoute/TwoFactorSetup";
import { useSettingsStore } from "../../../shared/store/settingsStore";

interface NotificationSettings {
  email_notifications: boolean;
  device_alerts: boolean;
  security_alerts: boolean;
  maintenance_alerts: boolean;
}

interface SecuritySettings {
  two_factor_auth: boolean;
  session_timeout: number;
  password_expiration: number;
}

interface PasswordChange {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface AccountSettings {
  full_name: string;
  email: string;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "notifications" | "security" | "account"
  >("notifications");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const settingsLoadedRef = useRef(false);
  const initialLoadRef = useRef(true);

  const {
    notificationSettings,
    securitySettings,
    fetchSettings,
    refreshSettings,
    updateNotificationSettings,
    updateSecuritySettings,
    changePassword,
    toggleTwoFactor,
    updateAccountSettings,
    error,
    clearError,
    isLoading,
  } = useSettingsStore();

  const {
    register: registerNotifications,
    handleSubmit: handleNotificationsSubmit,
    reset: resetNotificationForm,
    formState: { isDirty: isNotificationsDirty },
  } = useForm<NotificationSettings>({ defaultValues: notificationSettings });

  const {
    register: registerSecurity,
    handleSubmit: handleSecuritySubmit,
    reset: resetSecurityForm,
    formState: { isDirty: isSecurityDirty },
  } = useForm<SecuritySettings>({ defaultValues: securitySettings });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordChange>();

  const {
    register: registerAccount,
    handleSubmit: handleAccountSubmit,
    formState: { errors: accountErrors, isDirty: isAccountDirty },
    reset: resetAccountForm,
  } = useForm<AccountSettings>({ defaultValues: { full_name: "", email: "" } });

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (notificationSettings && !initialLoadRef.current) {
      resetNotificationForm(notificationSettings);
      settingsLoadedRef.current = true;
    } else if (notificationSettings && initialLoadRef.current) {
      resetNotificationForm(notificationSettings);
      settingsLoadedRef.current = true;
      initialLoadRef.current = false;
    }
  }, [notificationSettings, resetNotificationForm]);

  useEffect(() => {
    if (securitySettings && settingsLoadedRef.current) {
      resetSecurityForm(securitySettings);
    }
  }, [securitySettings, resetSecurityForm]);

  const onSaveNotifications = async (data: NotificationSettings) => {
    if (!isNotificationsDirty) return;
    setIsSaving(true);
    clearError();
    try {
      await updateNotificationSettings(data);
      toast.success("Notification settings saved");
      await refreshSettings();
      resetNotificationForm(data);
    } catch {
      toast.error("Failed to save notification settings");
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveSecurity = async (data: SecuritySettings) => {
    if (!isSecurityDirty) return;
    setIsSaving(true);
    clearError();
    try {
      await updateSecuritySettings(data);
      toast.success("Security settings saved");
      await refreshSettings();
      resetSecurityForm(data);
    } catch {
      toast.error("Failed to save security settings");
    } finally {
      setIsSaving(false);
    }
  };

  const onChangePassword = async (data: PasswordChange) => {
    if (data.new_password !== data.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await changePassword(data.current_password, data.new_password);
      toast.success("Password changed successfully");
      setIsPasswordModalOpen(false);
      resetPassword();
    } catch {
      toast.error("Failed to change password");
    }
  };

  const onToggleTwoFactor = async (enabled: boolean) => {
    try {
      await toggleTwoFactor(enabled);
      await refreshSettings();
      toast.success(`2FA ${enabled ? "enabled" : "disabled"}`);
      setIsTwoFactorModalOpen(false);
    } catch {
      toast.error("Failed to update 2FA");
    }
  };

  const onSaveAccount = async (data: AccountSettings) => {
    if (!isAccountDirty) return;
    setIsSaving(true);
    clearError();
    try {
      await updateAccountSettings(data);
      toast.success("Account updated");
      await refreshSettings();
      resetAccountForm(data);
    } catch {
      toast.error("Failed to save account settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-0 sm:p-0 space-y-2">
      <div className="sticky top-0 z-40 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors duration-200">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-primary-900 dark:text-primary-50">
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400">
              Manage your account and preferences
            </p>
          </div>
        </div>
        <Button
          onClick={fetchSettings}
          variant="secondary"
          className="flex items-center space-x-2"
          size="sm"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4 text-error-600 dark:text-error-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs text-error-700 dark:text-error-300">
              {error}
            </span>
          </div>
          <button
            onClick={clearError}
            className="text-error-500 dark:text-error-400 hover:text-error-700 dark:hover:text-error-200"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 p-4">
        <div className="lg:col-span-1">
          <Card className="border-primary-200 dark:border-primary-700">
            <nav className="p-2 space-y-1">
              <button
                onClick={() => setActiveTab("notifications")}
                className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === "notifications"
                    ? "bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300 border border-accent-300 dark:border-accent-700"
                    : "text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800"
                }`}
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === "security"
                    ? "bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300 border border-accent-300 dark:border-accent-700"
                    : "text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800"
                }`}
              >
                <Shield className="w-4 h-4 mr-2" />
                Security
              </button>

              <button
                onClick={() => setActiveTab("account")}
                className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === "account"
                    ? "bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300 border border-accent-300 dark:border-accent-700"
                    : "text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800"
                }`}
              >
                <User className="w-4 h-4 mr-2" />
                Account
              </button>
            </nav>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {isLoading ? (
            <Card className="p-8 text-center">
              <RefreshCw className="w-6 h-6 text-accent-600 dark:text-accent-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-primary-600 dark:text-primary-400">
                Loading settings...
              </p>
            </Card>
          ) : (
            <>
              {activeTab === "notifications" && (
                <Card>
                  <div className="p-3 border-b border-primary-200 dark:border-primary-700">
                    <h2 className="text-sm font-semibold text-primary-900 dark:text-primary-50 flex items-center">
                      <Bell className="w-4 h-4 mr-1.5 text-accent-600 dark:text-accent-400" />
                      Notification Settings
                    </h2>
                  </div>
                  <div className="p-3 bg-primary-50 dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-lg mb-4">
                    <p className="text-xs text-primary-700 dark:text-primary-300">
                      Choose which alerts you want to receive via email to stay
                      informed without clutter.
                    </p>
                  </div>
                  <form
                    onSubmit={handleNotificationsSubmit(onSaveNotifications)}
                    className="space-y-4 p-4"
                  >
                    {[
                      {
                        key: "email_notifications",
                        label: "Email Notifications",
                        desc: "Receive system updates via email",
                      },
                      {
                        key: "device_alerts",
                        label: "Device Alerts",
                        desc: "Get notified when devices go online/offline",
                      },
                      {
                        key: "security_alerts",
                        label: "Security Alerts",
                        desc: "Be alerted to login attempts and breaches",
                      },
                      {
                        key: "maintenance_alerts",
                        label: "Maintenance Alerts",
                        desc: "Know about scheduled downtime",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <label className="text-xs font-medium text-primary-900 dark:text-primary-100">
                            {item.label}
                          </label>
                          <p className="text-xs text-primary-600 dark:text-primary-400">
                            {item.desc}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          {...registerNotifications(
                            item.key as keyof NotificationSettings
                          )}
                          className="w-4 h-4 text-accent-600 dark:text-accent-400 rounded focus:ring-accent-500 dark:focus:ring-accent-400 border-primary-300 dark:border-primary-600"
                        />
                      </div>
                    ))}
                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        variant="success"
                        size="sm"
                        leftIcon={<Save className="w-3 h-3" />}
                        isLoading={isSaving}
                        disabled={!isNotificationsDirty}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {activeTab === "security" && (
                <Card>
                  <div className="p-3 border-b border-primary-200 dark:border-primary-700">
                    <h2 className="text-sm font-semibold text-primary-900 dark:text-primary-50 flex items-center">
                      <Shield className="w-4 h-4 mr-1.5 text-accent-600 dark:text-accent-400" />
                      Security Settings
                    </h2>
                  </div>
                  <div className="p-3 bg-primary-50 dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-lg mb-4">
                    <p className="text-xs text-primary-700 dark:text-primary-300">
                      Strengthen your account with 2FA, timeouts, and password
                      policies.
                    </p>
                  </div>
                  <form
                    onSubmit={handleSecuritySubmit(onSaveSecurity)}
                    className="space-y-4 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-medium text-primary-900 dark:text-primary-100">
                          Two-Factor Authentication
                        </label>
                        <p className="text-xs text-primary-600 dark:text-primary-400">
                          Extra login protection
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsTwoFactorModalOpen(true)}
                      >
                        {securitySettings?.two_factor_auth
                          ? "Enabled"
                          : "Manage"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-medium text-primary-900 dark:text-primary-100">
                          Session Timeout (minutes)
                        </label>
                        <p className="text-xs text-primary-600 dark:text-primary-400">
                          Auto-logout after inactivity
                        </p>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        {...registerSecurity("session_timeout", {
                          valueAsNumber: true,
                        })}
                        className="w-20 px-2 py-1 text-xs border rounded-md bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 border-primary-300 dark:border-primary-600 focus:ring-accent-500 dark:focus:ring-accent-400"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-medium text-primary-900 dark:text-primary-100">
                          Password Expiration (days)
                        </label>
                        <p className="text-xs text-primary-600 dark:text-primary-400">
                          Force password update
                        </p>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        {...registerSecurity("password_expiration", {
                          valueAsNumber: true,
                        })}
                        className="w-20 px-2 py-1 text-xs border rounded-md bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 border-primary-300 dark:border-primary-600 focus:ring-accent-500 dark:focus:ring-accent-400"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 justify-between pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsPasswordModalOpen(true)}
                      >
                        <Lock className="w-3 h-3 mr-1" /> Change Password
                      </Button>
                      <Button
                        type="submit"
                        variant="success"
                        size="sm"
                        leftIcon={<Save className="w-3 h-3" />}
                        isLoading={isSaving}
                        disabled={!isSecurityDirty}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {activeTab === "account" && (
                <Card>
                  <div className="p-3 border-b border-primary-200 dark:border-primary-700">
                    <h2 className="text-sm font-semibold text-primary-900 dark:text-primary-50 flex items-center">
                      <User className="w-4 h-4 mr-1.5 text-accent-600 dark:text-accent-400" />
                      Account Settings
                    </h2>
                  </div>
                  <div className="p-3 bg-primary-50 dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-lg mb-4">
                    <p className="text-xs text-primary-700 dark:text-primary-300">
                      Keep your name and email up to date for notifications and
                      verification.
                    </p>
                  </div>
                  <form
                    onSubmit={handleAccountSubmit(onSaveAccount)}
                    className="space-y-4 p-4"
                  >
                    <div>
                      <label
                        htmlFor="fullName"
                        className="block text-xs font-medium text-primary-900 dark:text-primary-100 mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        {...registerAccount("full_name", { required: true })}
                        className="w-full px-3 py-2 text-sm border rounded-md bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 placeholder:text-primary-500 dark:placeholder:text-primary-500 border-primary-300 dark:border-primary-600 focus:ring-accent-500 dark:focus:ring-accent-400"
                        placeholder="John Doe"
                      />
                      {accountErrors.full_name && (
                        <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                          Full name is required
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-medium text-primary-900 dark:text-primary-100 mb-1"
                      >
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        {...registerAccount("email", { required: true })}
                        className="w-full px-3 py-2 text-sm border rounded-md bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 placeholder:text-primary-500 dark:placeholder:text-primary-500 border-primary-300 dark:border-primary-600 focus:ring-accent-500 dark:focus:ring-accent-400"
                        placeholder="john@example.com"
                      />
                      {accountErrors.email && (
                        <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                          Valid email required
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        variant="success"
                        size="sm"
                        leftIcon={<Save className="w-3 h-3" />}
                        isLoading={isSaving}
                        disabled={!isAccountDirty}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        title="Change Password"
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      >
        <form
          onSubmit={handlePasswordSubmit(onChangePassword)}
          className="space-y-4 p-4"
        >
          <div>
            <label className="block text-xs font-medium text-primary-900 dark:text-primary-100 mb-1">
              Current Password
            </label>
            <input
              type="password"
              {...registerPassword("current_password")}
              className="w-full px-3 py-2 text-sm border rounded-md bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 border-primary-300 dark:border-primary-600 focus:ring-accent-500 dark:focus:ring-accent-400"
              placeholder="Optional if forgotten"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-900 dark:text-primary-100 mb-1">
              New Password
            </label>
            <input
              type="password"
              {...registerPassword("new_password", { required: true })}
              className="w-full px-3 py-2 text-sm border rounded-md bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 border-primary-300 dark:border-primary-600 focus:ring-accent-500 dark:focus:ring-accent-400"
            />
            {passwordErrors.new_password && (
              <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                Required
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-900 dark:text-primary-100 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              {...registerPassword("confirm_password", { required: true })}
              className="w-full px-3 py-2 text-sm border rounded-md bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 border-primary-300 dark:border-primary-600 focus:ring-accent-500 dark:focus:ring-accent-400"
            />
            {passwordErrors.confirm_password && (
              <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                Required
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPasswordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="success" size="sm">
              Change Password
            </Button>
          </div>
        </form>
      </Modal>

      <TwoFactorSetup
        isOpen={isTwoFactorModalOpen}
        onClose={() => setIsTwoFactorModalOpen(false)}
        currentStatus={securitySettings?.two_factor_auth || false}
        onStatusChange={onToggleTwoFactor}
      />
    </div>
  );
};

export default Settings;
