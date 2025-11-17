"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import Button from "../../../shared/components/ui/Button";
import Card from "../../../shared/components/ui/Card";

const Verify2FA: React.FC = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async () => {
    if (!code.trim()) {
      toast.error("Please enter the 2FA code");
      return;
    }

    setIsLoading(true);
    const token = sessionStorage.getItem("tempToken");

    try {
      const response = await fetch("/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Invalid code");

      sessionStorage.setItem("token", data.token);
      sessionStorage.removeItem("tempToken");
      toast.success("2FA verified successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <div className="sticky top-0 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 p-4 flex items-center space-x-3">
          <button
            onClick={() => navigate("/login")}
            className="p-2 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          <h1 className="text-xl font-bold text-primary-900 dark:text-primary-50">
            Two-Factor Authentication
          </h1>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-primary-600 dark:text-primary-400">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1"
            >
              2FA Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              className={`
                block w-full px-3 py-2 text-center text-lg font-mono tracking-widest
                border rounded-md bg-primary-50 dark:bg-primary-800
                text-primary-900 dark:text-primary-100
                placeholder:text-primary-400 dark:placeholder:text-primary-500
                focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500
                transition-all duration-200
                ${
                  code && !/^\d{6}$/.test(code)
                    ? "border-error-300"
                    : "border-primary-300 dark:border-primary-700"
                }
              `}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleVerify}
            variant="primary"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading || code.length !== 6}
            className="bg-accent-600 hover:bg-accent-700 focus:ring-accent-500"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                <span>Verifying...</span>
              </>
            ) : (
              "Verify & Continue"
            )}
          </Button>
          <p className="text-xs text-center text-primary-500 dark:text-primary-500">
            Lost access?{" "}
            <button
              onClick={() => navigate("/login")}
              className="font-medium text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 underline"
            >
              Contact support
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Verify2FA;
