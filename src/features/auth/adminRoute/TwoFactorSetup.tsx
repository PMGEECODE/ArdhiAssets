"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { QrCode, Mail, Shield, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import { API_URL } from "../../../shared/config/constants";

import Button from "../../../shared/components/ui/Button";
import Card from "../../../shared/components/ui/Card";

interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: boolean;
  onStatusChange: (enabled: boolean) => void;
}

interface QRCodeData {
  qr_code: string;
  secret: string;
  backup_codes: string[];
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  isOpen,
  onClose,
  currentStatus,
  onStatusChange,
}) => {
  const [setupMethod, setSetupMethod] = useState<
    "email" | "authenticator" | null
  >(null);
  const [step, setStep] = useState<"method" | "setup" | "verify">("method");
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCode, setCopiedBackupCode] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSetupMethod(null);
      setStep("method");
      setQrData(null);
      setVerificationCode("");
    }
  }, [isOpen]);

  const handleMethodSelect = async (method: "email" | "authenticator") => {
    setSetupMethod(method);
    setIsLoading(true);

    try {
      if (method === "authenticator") {
        // Generate QR code and secret for authenticator app
        const response = await axios.post(`${API_URL}/auth/2fa/generate-qr`);
        setQrData(response.data);
        setStep("setup");
      } else {
        // For email method, directly proceed to verification
        await axios.post(`${API_URL}/auth/2fa/send-email-code`);
        toast.success("Verification code sent to your email");
        setStep("verify");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to setup 2FA");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        code: verificationCode,
        method: setupMethod,
        ...(setupMethod === "authenticator" &&
          qrData && { secret: qrData.secret }),
      };

      await axios.post(`${API_URL}/auth/2fa/verify-setup`, payload);

      toast.success("Two-factor authentication enabled successfully!");
      onStatusChange(true);
      onClose();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Invalid verification code"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/2fa/disable`, {
        password: null, // Optional password field - backend allows null/undefined
      });
      toast.success("Two-factor authentication disabled");
      onStatusChange(false);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to disable 2FA");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "secret" | "backup") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "secret") {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else {
        setCopiedBackupCode(text);
        setTimeout(() => setCopiedBackupCode(null), 2000);
      }
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const regenerateQR = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/2fa/generate-qr`);
      setQrData(response.data);
      toast.success("QR code regenerated");
    } catch (error: any) {
      toast.error("Failed to regenerate QR code");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-sm sm:max-w-lg lg:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-primary-900">
                Two-Factor Authentication
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-primary-400 hover:text-primary-600 p-1"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
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

          {/* Current Status */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-primary-50 border border-primary-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
              <div>
                <p className="text-xs sm:text-sm font-medium text-primary-900">
                  Current Status: {currentStatus ? "Enabled" : "Disabled"}
                </p>
                <p className="text-xs sm:text-sm text-primary-600 mt-1">
                  {currentStatus
                    ? "Your account is protected with 2FA"
                    : "Add an extra layer of security to your account"}
                </p>
              </div>
              {currentStatus && (
                <Button
                  variant="secondary"
                  onClick={handleDisable2FA}
                  isLoading={isLoading}
                  className="text-red-600 hover:text-red-700 text-xs sm:text-sm mt-2 sm:mt-0 w-full sm:w-auto"
                >
                  Disable 2FA
                </Button>
              )}
            </div>
          </div>

          {!currentStatus && (
            <>
              {/* Step 1: Method Selection */}
              {step === "method" && (
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-medium text-primary-900 mb-3 sm:mb-4">
                    Choose your preferred 2FA method
                  </h3>

                  <div className="space-y-3 sm:grid sm:grid-cols-1 md:grid-cols-2 sm:gap-4 sm:space-y-0">
                    {/* Email Method */}
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <button
                        onClick={() => handleMethodSelect("email")}
                        disabled={isLoading}
                        className="w-full p-4 sm:p-6 text-left"
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm sm:text-base font-medium text-primary-900">
                              Email Verification
                            </h4>
                            <p className="text-xs sm:text-sm text-primary-600 mt-1">
                              Receive verification codes via email. Simple and
                              convenient.
                            </p>
                          </div>
                        </div>
                      </button>
                    </Card>

                    {/* Authenticator App Method */}
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <button
                        onClick={() => handleMethodSelect("authenticator")}
                        disabled={isLoading}
                        className="w-full p-4 sm:p-6 text-left"
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                            <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm sm:text-base font-medium text-primary-900">
                              Authenticator App
                            </h4>
                            <p className="text-xs sm:text-sm text-primary-600 mt-1">
                              Use apps like Google Authenticator or Authy. More
                              secure.
                            </p>
                          </div>
                        </div>
                      </button>
                    </Card>
                  </div>

                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-medium text-amber-800">
                          Security Recommendation
                        </h4>
                        <p className="text-xs sm:text-sm text-amber-700 mt-1">
                          Authenticator apps provide better security as they
                          work offline and are less susceptible to interception.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Setup (for Authenticator) */}
              {step === "setup" &&
                setupMethod === "authenticator" &&
                qrData && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="text-center">
                      <h3 className="text-base sm:text-lg font-medium text-primary-900 mb-2">
                        Scan QR Code
                      </h3>
                      <p className="text-xs sm:text-sm text-primary-600">
                        Use your authenticator app to scan this QR code
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <div className="p-3 sm:p-4 bg-white border-2 border-primary-200 rounded-lg">
                        <img
                          src={qrData.qr_code || "/placeholder.svg"}
                          alt="2FA QR Code"
                          className="w-32 h-32 sm:w-48 sm:h-48"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-primary-900 mb-2">
                          Manual Entry Key (if you can't scan)
                        </label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <code className="flex-1 p-2 sm:p-3 bg-primary-50 border border-primary-200 rounded text-xs sm:text-sm font-mono break-all">
                            {qrData.secret}
                          </code>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              copyToClipboard(qrData.secret, "secret")
                            }
                            className="flex-shrink-0 w-full sm:w-auto"
                          >
                            {copiedSecret ? (
                              <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                            ) : (
                              <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-primary-900 mb-2">
                          Backup Codes (Save these securely)
                        </label>
                        <div className="space-y-2">
                          {qrData.backup_codes.map((code, index) => (
                            <div
                              key={index}
                              className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2"
                            >
                              <code className="flex-1 p-2 bg-primary-50 border border-primary-200 rounded text-xs sm:text-sm font-mono">
                                {code}
                              </code>
                              <Button
                                variant="secondary"
                                onClick={() => copyToClipboard(code, "backup")}
                                className="flex-shrink-0 w-full sm:w-auto"
                              >
                                {copiedBackupCode === code ? (
                                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                ) : (
                                  <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
                      <Button
                        variant="secondary"
                        onClick={regenerateQR}
                        isLoading={isLoading}
                        leftIcon={
                          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                        }
                        className="w-full sm:w-auto"
                      >
                        Regenerate
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => setStep("verify")}
                        className="w-full sm:w-auto"
                      >
                        Continue to Verification
                      </Button>
                    </div>
                  </div>
                )}

              {/* Step 3: Verification */}
              {step === "verify" && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center">
                    <h3 className="text-base sm:text-lg font-medium text-primary-900 mb-2">
                      Enter Verification Code
                    </h3>
                    <p className="text-xs sm:text-sm text-primary-600">
                      {setupMethod === "email"
                        ? "Enter the 6-digit code sent to your email"
                        : "Enter the 6-digit code from your authenticator app"}
                    </p>
                  </div>

                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="000000"
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 text-center text-lg sm:text-2xl font-mono border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setStep(
                          setupMethod === "authenticator" ? "setup" : "method"
                        )
                      }
                      className="w-full sm:w-auto"
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleVerifyCode}
                      isLoading={isLoading}
                      disabled={verificationCode.length !== 6}
                      className="w-full sm:w-auto"
                    >
                      Verify & Enable 2FA
                    </Button>
                  </div>

                  {setupMethod === "email" && (
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        onClick={() => handleMethodSelect("email")}
                        isLoading={isLoading}
                        className="text-xs sm:text-sm"
                      >
                        Resend Code
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetup;
