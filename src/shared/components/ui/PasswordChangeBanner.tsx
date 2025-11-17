"use client";

import type React from "react";
import { useState } from "react";
import Button from "../../../shared/components/ui/Button";
import { API_URL } from "../../../shared/config/constants";
import { useNavigate } from "react-router-dom";

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success" | "";
  }>({
    text: "",
    type: "",
  });

  const validatePasswords = (): { valid: boolean; error?: string } => {
    if (!currentPassword) {
      return { valid: false, error: "Current password is required" };
    }

    if (!newPassword) {
      return { valid: false, error: "New password is required" };
    }

    if (!confirmPassword) {
      return { valid: false, error: "Password confirmation is required" };
    }

    if (newPassword.length < 8) {
      return {
        valid: false,
        error: "New password must be at least 8 characters",
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        valid: false,
        error: "New password and confirm password do not match",
      };
    }

    if (currentPassword === newPassword) {
      return {
        valid: false,
        error: "New password cannot be the same as current password",
      };
    }

    return { valid: true };
  };

  const handleChange = async () => {
    setMessage({ text: "", type: "" });

    const validation = validatePasswords();
    if (!validation.valid) {
      setMessage({
        text: validation.error || "Validation failed",
        type: "error",
      });
      return;
    }

    try {
      setIsLoading(true);
      const authStorage = localStorage.getItem("auth-storage");
      const token = authStorage ? JSON.parse(authStorage).state.token : null;

      if (!token) {
        setMessage({ text: "User not authenticated", type: "error" });
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: "Password changed successfully!", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Redirect to dashboard after success
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        setMessage({
          text: data.detail || data.message || "Password change failed",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setMessage({
        text: "Something went wrong. Please try again later.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPasswords = () => setShowPasswords((prev) => !prev);

  return (
    <div className="p-6 mx-auto mt-10 max-w-md bg-white rounded shadow passContentsCon">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center mb-4 space-x-2 text-blue-600 nav-backBtn hover:text-blue-800"
        aria-label="Go back"
      >
        <span className="text-2xl">&#8592;</span>
        <span>Back</span>
      </button>

      <h2 className="mb-4 text-xl font-bold">Change Password</h2>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        <p className="font-semibold mb-2">Password Requirements:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>At least 8 characters long</li>
          <li>Cannot be the same as current password</li>
          <li>Cannot reuse your previous password</li>
        </ul>
      </div>

      <div className="space-y-4">
        <input
          type={showPasswords ? "text" : "password"}
          placeholder="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="px-3 py-2 w-full rounded border"
          disabled={isLoading}
        />
        <input
          type={showPasswords ? "text" : "password"}
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="px-3 py-2 w-full rounded border"
          disabled={isLoading}
        />
        <input
          type={showPasswords ? "text" : "password"}
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="px-3 py-2 w-full rounded border"
          disabled={isLoading}
        />

        <div className="flex items-center space-x-2 show-hide-password">
          <input
            id="show-passwords"
            type="checkbox"
            checked={showPasswords}
            onChange={toggleShowPasswords}
            disabled={isLoading}
          />
          <label
            htmlFor="show-passwords"
            className="cursor-pointer select-none"
          >
            Show Passwords
          </label>
        </div>

        {message.text && (
          <div
            className={`px-4 py-2 rounded ${
              message.type === "error"
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <Button
          className="flex justify-center items-center space-x-2 w-full"
          onClick={handleChange}
          disabled={isLoading}
        >
          {isLoading && (
            <span
              className="inline-block w-5 h-5 rounded-full border-2 border-blue-600 border-solid animate-spin border-t-transparent"
              aria-label="loading spinner"
            />
          )}
          <span>{isLoading ? "Saving..." : "Save Password"}</span>
        </Button>
      </div>
    </div>
  );
};

export default ChangePassword;
