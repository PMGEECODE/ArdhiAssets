"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Button from "../../../shared/components/ui/Button";
import Card from "../../../shared/components/ui/Card";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../shared/lib/axiosInstance";
import { useCookieAuthStore } from "../../../shared/store/cookieAuthStore";
import { z } from "zod";
import { ZodError } from "zod";
import {
  Loader,
  CheckCircle,
  Info,
  AlertTriangle,
  ArrowLeft,
  XCircle,
  Eye,
  EyeOff,
  Shield,
  Lock,
  Save,
} from "lucide-react";

// Sanitize input
const sanitizeInput = (value: string): string => {
  return value
    .trim()
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/* -------------------------- Zod Schema -------------------------- */
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[a-z]/, "Must contain a lowercase letter")
      .regex(/\d/, "Must contain a number")
      .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain a special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from current",
    path: ["newPassword"],
  });

type FormData = z.infer<typeof changePasswordSchema>;

interface PasswordRule {
  label: string;
  test: (pwd: string) => boolean;
  met: boolean;
}

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useCookieAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success" | "";
  }>({ text: "", type: "" });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [strength, setStrength] = useState(0);
  const [entropy, setEntropy] = useState(0);
  const [rules, setRules] = useState<PasswordRule[]>([]);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  const passwordRules: Omit<PasswordRule, "met">[] = [
    { label: "At least 8 characters", test: (pwd) => pwd.length >= 8 },
    { label: "Contains uppercase letter", test: (pwd) => /[A-Z]/.test(pwd) },
    { label: "Contains lowercase letter", test: (pwd) => /[a-z]/.test(pwd) },
    { label: "Contains a number", test: (pwd) => /\d/.test(pwd) },
    {
      label: "Contains special character",
      test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    },
  ];

  /* -------------------------- Entropy -------------------------- */
  const calculateEntropy = (password: string): number => {
    if (!password) return 0;
    let pool = 0;
    if (/[a-z]/.test(password)) pool += 26;
    if (/[A-Z]/.test(password)) pool += 26;
    if (/\d/.test(password)) pool += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) pool += 32;
    return Math.round(password.length * Math.log2(pool || 1));
  };

  /* -------------------------- Strength & Match -------------------------- */
  useEffect(() => {
    const sanitizedNew = sanitizeInput(newPassword);
    const sanitizedConfirm = sanitizeInput(confirmPassword);

    const metRules = passwordRules.map((rule) => ({
      ...rule,
      met: rule.test(sanitizedNew),
    }));
    const metCount = metRules.filter((r) => r.met).length;
    setRules(metRules);
    setStrength(metCount);
    setEntropy(calculateEntropy(sanitizedNew));
    setPasswordsMatch(
      sanitizedNew === sanitizedConfirm && sanitizedConfirm !== ""
    );
  }, [newPassword, confirmPassword]);

  const getStrengthInfo = () => {
    if (strength === 0) return { text: "", color: "", barWidth: 0 };
    if (strength <= 2)
      return { text: "Weak", color: "bg-error-500", barWidth: 20 };
    if (strength <= 3)
      return { text: "Fair", color: "bg-warning-500", barWidth: 40 };
    if (strength === 4)
      return { text: "Good", color: "bg-accent-500", barWidth: 70 };
    return { text: "Strong", color: "bg-success-500", barWidth: 100 };
  };
  const strengthInfo = getStrengthInfo();

  /* -------------------------- Zod Validation -------------------------- */
  const validateForm = (): boolean => {
    try {
      changePasswordSchema.parse({
        currentPassword: sanitizeInput(currentPassword),
        newPassword: sanitizeInput(newPassword),
        confirmPassword: sanitizeInput(confirmPassword),
      } satisfies FormData);
      setErrors({});
      return true;
    } catch (e) {
      if (e instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        e.errors.forEach((err) => {
          if (err.path?.[0]) fieldErrors[err.path[0]] = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  /* -------------------------- Submit -------------------------- */
  const handleChange = async () => {
    setMessage({ text: "", type: "" });

    if (!user?.id) {
      setMessage({
        text: "User information not available. Please refresh the page.",
        type: "error",
      });
      return;
    }

    if (!validateForm()) return;

    if (entropy < 60) {
      setMessage({
        text: "Password is too weak. Aim for 60+ bits of entropy.",
        type: "error",
      });
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.put(`/users/${user.id}/password`, {
        current_password: sanitizeInput(currentPassword),
        new_password: sanitizeInput(newPassword),
      });

      setMessage({ text: "Password changed successfully!", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (error: any) {
      console.error("Error changing password:", error);
      setMessage({
        text:
          error.response?.data?.detail ||
          error.message ||
          "Something went wrong. Please try again later.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPasswords = () => setShowPasswords((prev) => !prev);

  /* -------------------------- Render -------------------------- */
  return (
    <div className="p-0 sm:p-0 space-y-2">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors duration-200">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-primary-900 dark:text-primary-50">
              Change Password
            </h1>
            <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400">
              Update your account password securely
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate(-1)}
          variant="secondary"
          className="flex items-center space-x-2"
          size="sm"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 p-4">
        {/* LEFT INFO */}
        <div className="lg:col-span-1 space-y-4">
          {/* Why Change */}
          <Card className="border-primary-200 dark:border-primary-700">
            <div className="p-3 border-b border-primary-200 dark:border-primary-700">
              <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-50 flex items-center">
                <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mr-3">
                  <Info className="w-4 h-4" />
                </span>
                Why Change Your Password?
              </h3>
            </div>
            <div className="p-3 space-y-2">
              {[
                "Enhances account security",
                "Protects against unauthorized access",
                "Recommended every 3–6 months",
                "Required if you suspect a breach",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start text-xs text-primary-600 dark:text-primary-400"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-success-600 dark:text-success-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Requirements */}
          <Card className="bg-warning-50 dark:bg-warning-950 border-warning-200 dark:border-warning-800">
            <div className="p-3 border-b border-warning-200 dark:border-warning-800">
              <h3 className="text-sm font-semibold text-warning-900 dark:text-warning-100 flex items-center">
                <span className="w-8 h-8 bg-warning-100 dark:bg-warning-900 text-warning-700 dark:text-warning-300 rounded-full flex items-center justify-center mr-3">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                Password Requirements
              </h3>
            </div>
            <div className="p-3 space-y-1.5">
              {passwordRules.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start text-xs text-warning-800 dark:text-warning-200"
                >
                  <span className="font-medium mr-2">•</span>
                  {r.label}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT FORM */}
        <div className="lg:col-span-2">
          <Card className="border-primary-200 dark:border-primary-700">
            <div className="p-3 border-b border-primary-200 dark:border-primary-700">
              <h2 className="text-sm font-semibold text-primary-900 dark:text-primary-50 flex items-center">
                <Lock className="w-4 h-4 mr-1.5 text-accent-600 dark:text-accent-400" />
                Update Password
              </h2>
            </div>

            <div className="p-3 space-y-4">
              {/* Current Password */}
              <div>
                <label
                  htmlFor="current-password"
                  className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1"
                >
                  Current Password
                </label>
                <input
                  id="current-password"
                  type={showPasswords ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(sanitizeInput(e.target.value))
                  }
                  className={`w-full px-3 py-2 text-sm border rounded-md
                    bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100
                    placeholder:text-primary-500 dark:placeholder:text-primary-500
                    focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                    focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200
                    ${
                      errors.currentPassword
                        ? "border-error-500"
                        : "border-primary-200 dark:border-primary-700"
                    }`}
                  disabled={isLoading}
                  required
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  type={showPasswords ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(sanitizeInput(e.target.value))
                  }
                  className={`w-full px-3 py-2 text-sm border rounded-md
                    bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100
                    placeholder:text-primary-500 dark:placeholder:text-primary-500
                    focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                    focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200
                    ${
                      errors.newPassword
                        ? "border-error-500"
                        : "border-primary-200 dark:border-primary-700"
                    }`}
                  disabled={isLoading}
                  required
                />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                    {errors.newPassword}
                  </p>
                )}

                {/* Strength Meter */}
                {newPassword && (
                  <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-800 rounded-lg border border-primary-200 dark:border-primary-700 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-primary-700 dark:text-primary-300">
                        Strength:
                      </span>
                      <span
                        className={`font-bold ${
                          strength <= 2
                            ? "text-error-600"
                            : strength <= 3
                            ? "text-warning-600"
                            : strength === 4
                            ? "text-accent-600"
                            : "text-success-600"
                        }`}
                      >
                        {strengthInfo.text}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-primary-200 dark:bg-primary-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ease-out ${strengthInfo.color}`}
                        style={{ width: `${strengthInfo.barWidth}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-primary-600 dark:text-primary-400">
                      <span>Entropy: {entropy} bits</span>
                      <span>
                        {entropy < 60
                          ? "Weak"
                          : entropy < 80
                          ? "Moderate"
                          : entropy < 100
                          ? "Strong"
                          : "Very Strong"}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {rules.map((rule, i) => (
                        <li
                          key={i}
                          className={`flex items-center space-x-1.5 text-xs transition-all ${
                            rule.met
                              ? "text-success-600 dark:text-success-400"
                              : "text-primary-400 dark:text-primary-500"
                          }`}
                        >
                          <AnimatedCheckmark checked={rule.met} />
                          <span>{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type={showPasswords ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(sanitizeInput(e.target.value))
                  }
                  className={`w-full px-3 py-2 text-sm border rounded-md
                    bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100
                    placeholder:text-primary-500 dark:placeholder:text-primary-500
                    focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                    focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200
                    ${
                      errors.confirmPassword
                        ? "border-error-500"
                        : passwordsMatch === false
                        ? "border-warning-500"
                        : "border-primary-200 dark:border-primary-700"
                    }`}
                  disabled={isLoading}
                  required
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                    {errors.confirmPassword}
                  </p>
                )}
                {confirmPassword &&
                  passwordsMatch !== null &&
                  !errors.confirmPassword && (
                    <p
                      className={`mt-1 text-xs flex items-center ${
                        passwordsMatch
                          ? "text-success-600 dark:text-success-400"
                          : "text-warning-600 dark:text-warning-400"
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          <span>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          <span>Passwords do not match</span>
                        </>
                      )}
                    </p>
                  )}
              </div>

              {/* Show Passwords */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleShowPasswords}
                  disabled={isLoading}
                  className="text-primary-600 dark:text-primary-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                >
                  {showPasswords ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <label className="text-xs text-primary-700 dark:text-primary-300 cursor-pointer select-none">
                  Show passwords
                </label>
              </div>

              {/* Message */}
              {message.text && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium transition-all border ${
                    message.type === "error"
                      ? "bg-error-50 dark:bg-error-950 text-error-700 dark:text-error-300 border-error-200 dark:border-error-800"
                      : "bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300 border-success-200 dark:border-success-800"
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleChange}
                disabled={isLoading}
                variant="success"
                className="w-full flex items-center justify-center space-x-2"
                size="md"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin w-4 h-4" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save New Password</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* --------------------- Animated Checkmark --------------------- */
const AnimatedCheckmark: React.FC<{ checked: boolean }> = ({ checked }) => (
  <svg
    className={`w-3.5 h-3.5 transition-all duration-300 ${
      checked ? "opacity-100 scale-100" : "opacity-0 scale-50"
    }`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5">
      {checked && (
        <>
          <animate
            attributeName="stroke-dasharray"
            from="0, 28"
            to="28, 28"
            dur="0.3s"
            fill="freeze"
          />
          <animate
            attributeName="stroke-dashoffset"
            from="28"
            to="0"
            dur="0.3s"
            fill="freeze"
          />
        </>
      )}
    </path>
  </svg>
);

export default ChangePassword;
