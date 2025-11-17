"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Shield, ArrowLeft, RefreshCw } from "lucide-react";
import { API_URL } from "../../../shared/config/constants";

// Reusable Button component (mirrors the one used in AdminUserPermissions)
const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "success";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}> = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  type = "button",
}) => {
  const base =
    "inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary:
      "bg-accent-600 text-white hover:bg-accent-700 focus:ring-accent-500 dark:bg-accent-500 dark:hover:bg-accent-600",
    secondary:
      "bg-primary-100 text-primary-700 hover:bg-primary-200 focus:ring-accent-500 dark:bg-primary-800 dark:text-primary-200 dark:hover:bg-primary-700",
    success:
      "bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 dark:bg-success-500 dark:hover:bg-success-600",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

// Reusable Card component
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-lg shadow-sm transition-colors duration-200 ${className}`}
  >
    {children}
  </div>
);

const TwoFactorAuth: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    setCode(digits.join(""));
  }, [digits]);

  const handleDigitChange = (index: number, value: string) => {
    const sanitizedValue = value.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = sanitizedValue;
    setDigits(newDigits);

    if (sanitizedValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
      } else if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    }
    if (e.key === "ArrowLeft" && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5)
      inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
    const newDigits = Array(6).fill("");
    for (let i = 0; i < pasteData.length; i++) newDigits[i] = pasteData[i];
    setDigits(newDigits);
    const nextIndex = Math.min(pasteData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const email = sessionStorage.getItem("email");
      if (!email) {
        toast.error("Missing email. Please log in again.");
        navigate("/login");
        return;
      }

      const response = await axios.post(`${API_URL}/auth/2fa/verify`, {
        code,
        email,
      });
      const { token, user } = response.data;

      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      sessionStorage.removeItem("email");

      toast.success("2FA Verified!");
      navigate("/dashboard");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Invalid or expired code";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    toast.info("Resend feature coming soon");
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 p-0 sm:p-0">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors duration-200">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-primary-900 dark:text-primary-50">
              Two-Factor Authentication
            </h1>
            <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/login")}
          variant="secondary"
          size="sm"
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back</span>
        </Button>
      </div>

      <div className="p-4">
        <div className="max-w-md mx-auto">
          <Card>
            {/* Form */}
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Digit Inputs */}
                <div className="flex justify-center gap-2">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className={`
                        w-12 h-12 text-center text-lg font-bold border-2 rounded-lg
                        transition-all duration-200 outline-none text-primary-900 dark:text-primary-100
                        ${
                          digit
                            ? "border-accent-500 bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300"
                            : "border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 hover:border-primary-400 dark:hover:border-primary-500"
                        }
                        focus:border-accent-500 focus:ring-4 focus:ring-accent-100 dark:focus:ring-accent-900
                        disabled:bg-primary-100 dark:disabled:bg-primary-800 disabled:text-primary-400 dark:disabled:text-primary-500
                      `}
                      disabled={isLoading}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                {/* Progress Dots */}
                <div className="flex justify-center gap-1">
                  {digits.map((digit, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                        digit
                          ? "bg-accent-600 dark:bg-accent-400"
                          : "bg-primary-300 dark:bg-primary-600"
                      }`}
                    />
                  ))}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading || code.length !== 6}
                  variant="primary"
                  size="md"
                  className="w-full flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify Code</span>
                  )}
                </Button>
              </form>

              {/* Help Section */}
              <div className="mt-6 pt-4 border-t border-primary-200 dark:border-primary-700 text-center space-y-2">
                <p className="text-xs text-primary-600 dark:text-primary-400">
                  Didn’t receive a code?
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-xs font-medium text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors duration-200"
                >
                  Resend Code
                </button>
              </div>
            </div>
          </Card>

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-xs text-primary-600 dark:text-primary-400">
              Having trouble?{" "}
              <a
                href="#"
                className="font-medium text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors duration-200"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;
