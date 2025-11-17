"use client";

import type React from "react";

import { useState } from "react";
import { useCookieAuthStore } from "../../../shared/store/cookieAuthStore";
import Card from "../../../shared/components/ui/Card";
import Button from "../../../shared/components/ui/Button";
import {
  User,
  Settings,
  Mail,
  ShieldCheck,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import Modal from "../../../shared/components/ui/Modal";

const Profile: React.FC = () => {
  const { user } = useCookieAuthStore();
  const navigate = useNavigate();

  const [isNotificationModalOpen, setNotificationModalOpen] = useState(false);
  const [isTwoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [is2FAEnabled, set2FAEnabled] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">Profile</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Personal Info Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center mb-6 space-x-4">
              <div className="p-3 rounded-full bg-primary-100">
                <User className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-xl font-semibold text-primary-900">
                Personal Information
              </h2>
            </div>

            <div className="space-y-4">
              <InfoItem
                label="Name"
                value={
                  user?.first_name || user?.last_name
                    ? `${user?.first_name || ""} ${
                        user?.last_name || ""
                      }`.trim()
                    : "—"
                }
                icon={User}
              />
              <InfoItem label="Email" value={user?.email} icon={Mail} />
              <InfoItem
                label="Role"
                value={user?.role}
                capitalize
                icon={ShieldCheck}
              />
              <InfoItem
                label="Member Since"
                value={
                  user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"
                }
                icon={CalendarCheck}
              />
            </div>
          </div>
        </Card>

        {/* Settings Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center mb-6 space-x-4">
              <div className="p-3 rounded-full bg-accent-100">
                <Settings className="w-6 h-6 text-accent-600" />
              </div>
              <h2 className="text-xl font-semibold text-primary-900">
                Account Settings
              </h2>
            </div>

            <div className="space-y-6">
              {/* Change Password */}
              <div>
                <Button
                  variant="secondary"
                  className="justify-center w-full"
                  onClick={() => navigate("/change-password")}
                >
                  Change Password
                </Button>
                <p className="mt-1 text-sm text-center text-primary-500">
                  Update your password regularly to keep your account secure.
                </p>
              </div>

              {/* Notification Settings */}
              <div>
                <Button
                  variant="secondary"
                  className="justify-center w-full"
                  onClick={() => setNotificationModalOpen(true)}
                >
                  Notification Settings
                </Button>
                <p className="mt-1 text-sm text-center text-primary-500">
                  Choose how you'd like to receive updates and alerts.
                </p>
              </div>

              {/* Two-Factor Authentication */}
              <div>
                <Button
                  variant="secondary"
                  className="justify-center w-full"
                  onClick={() => setTwoFactorModalOpen(true)}
                >
                  Two-Factor Authentication
                </Button>
                <p className="mt-1 text-sm text-center text-primary-500">
                  Add an extra layer of protection by enabling 2FA for your
                  account.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Notification Modal */}
      <Modal
        isOpen={isNotificationModalOpen}
        onClose={() => setNotificationModalOpen(false)}
        title="Notification Settings"
      >
        <div className="space-y-4">
          <ToggleCheckbox
            label="Email Notifications"
            checked={emailNotifications}
            onChange={() => setEmailNotifications((prev) => !prev)}
          />
          <ToggleCheckbox
            label="Desktop Notifications"
            checked={desktopNotifications}
            onChange={() => setDesktopNotifications((prev) => !prev)}
          />
          <Button
            className="justify-center w-full"
            onClick={() => setNotificationModalOpen(false)}
          >
            Save Settings
          </Button>
        </div>
      </Modal>

      {/* 2FA Modal */}
      <Modal
        isOpen={isTwoFactorModalOpen}
        onClose={() => setTwoFactorModalOpen(false)}
        title="Two-Factor Authentication"
      >
        <div className="space-y-4">
          <p>
            {is2FAEnabled
              ? "Two-Factor Authentication is currently enabled."
              : "Two-Factor Authentication is currently disabled."}
          </p>
          <Button
            className="justify-center w-full"
            onClick={() => {
              set2FAEnabled(!is2FAEnabled);
              setTwoFactorModalOpen(false);
            }}
          >
            {is2FAEnabled ? "Disable 2FA" : "Enable 2FA"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;

// Reusable InfoItem component
const InfoItem = ({
  label,
  value,
  capitalize = false,
  icon: Icon,
}: {
  label: string;
  value?: string;
  capitalize?: boolean;
  icon?: LucideIcon;
}) => (
  <div className="flex items-start space-x-3">
    {Icon && (
      <div className="pt-1 text-primary-600">
        <Icon className="w-5 h-5" />
      </div>
    )}
    <div>
      <label className="block mb-1 text-sm font-medium text-primary-600">
        {label}
      </label>
      <p className={`text-primary-900 ${capitalize ? "capitalize" : ""}`}>
        {value || "—"}
      </p>
    </div>
  </div>
);

// Reusable ToggleCheckbox
const ToggleCheckbox = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label className="flex items-center space-x-2 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="form-checkbox"
    />
    <span>{label}</span>
  </label>
);
