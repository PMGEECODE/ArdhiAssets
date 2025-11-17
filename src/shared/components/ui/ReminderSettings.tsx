"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Bell, Clock, Shield, Wrench, Save } from "lucide-react";
import { API_URL } from "../../config";

interface ReminderSettings {
  email_notifications: boolean;
  device_alerts: boolean;
  security_alerts: boolean;
  maintenance_alerts: boolean;
}

const ReminderSettings: React.FC = () => {
  const [settings, setSettings] = useState<ReminderSettings>({
    email_notifications: true,
    device_alerts: true,
    security_alerts: true,
    maintenance_alerts: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("auth-storage")
        ? JSON.parse(localStorage.getItem("auth-storage")!).state?.token
        : null;

      const response = await fetch(`${API_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({
          email_notifications: data.email_notifications,
          device_alerts: data.device_alerts,
          security_alerts: data.security_alerts,
          maintenance_alerts: data.maintenance_alerts,
        });
      }
    } catch (error) {
      console.error("Error fetching reminder settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("auth-storage")
        ? JSON.parse(localStorage.getItem("auth-storage")!).state?.token
        : null;

      const response = await fetch(`${API_URL}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Reminder settings saved successfully!",
        });
      } else {
        setMessage({ type: "error", text: "Failed to save reminder settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error saving reminder settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof ReminderSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border shadow-sm">
      <div className="flex items-center mb-6 space-x-3">
        <Bell className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Reminder & Alert Settings
        </h2>
      </div>

      <div className="space-y-6">
        {/* Email Notifications Master Toggle */}
        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-600">
                Receive email alerts for important events
              </p>
            </div>
          </div>
          <label className="inline-flex relative items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.email_notifications}
              onChange={() => handleToggle("email_notifications")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Individual Alert Types */}
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 rounded-lg border transition-colors hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-gray-900">Device Alerts</h3>
                <p className="text-sm text-gray-600">
                  Overdue device returns and transfer notifications
                </p>
              </div>
            </div>
            <label className="inline-flex relative items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.device_alerts}
                onChange={() => handleToggle("device_alerts")}
                disabled={!settings.email_notifications}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 disabled:opacity-50"></div>
            </label>
          </div>

          <div className="flex justify-between items-center p-4 rounded-lg border transition-colors hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-medium text-gray-900">Security Alerts</h3>
                <p className="text-sm text-gray-600">
                  High-value device monitoring and security reminders
                </p>
              </div>
            </div>
            <label className="inline-flex relative items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security_alerts}
                onChange={() => handleToggle("security_alerts")}
                disabled={!settings.email_notifications}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 disabled:opacity-50"></div>
            </label>
          </div>

          <div className="flex justify-between items-center p-4 rounded-lg border transition-colors hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <Wrench className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="font-medium text-gray-900">
                  Maintenance Alerts
                </h3>
                <p className="text-sm text-gray-600">
                  Device maintenance schedules and service reminders
                </p>
              </div>
            </div>
            <label className="inline-flex relative items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenance_alerts}
                onChange={() => handleToggle("maintenance_alerts")}
                disabled={!settings.email_notifications}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 disabled:opacity-50"></div>
            </label>
          </div>
        </div>

        {/* Reminder Schedule Information */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="mb-3 font-medium text-gray-900">Reminder Schedule</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Overdue Device Checks:</span>
              <span className="font-medium">Daily at 9:00 AM</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Approval Reminders:</span>
              <span className="font-medium">Every 6 hours</span>
            </div>
            <div className="flex justify-between">
              <span>Maintenance Alerts:</span>
              <span className="font-medium">Weekly on Mondays</span>
            </div>
            <div className="flex justify-between">
              <span>Security Reminders:</span>
              <span className="font-medium">Weekly on Mondays</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-between items-center pt-4 border-t">
          {message && (
            <div
              className={`text-sm ${
                message.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {message.text}
            </div>
          )}
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center px-4 py-2 space-x-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReminderSettings;
