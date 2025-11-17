"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

interface PasswordExpiredCountdownProps {
  onRedirect: () => void;
  countdownSeconds?: number;
}

export const PasswordExpiredCountdown: React.FC<
  PasswordExpiredCountdownProps
> = ({ onRedirect, countdownSeconds = 5 }) => {
  const [countdown, setCountdown] = useState(countdownSeconds);

  useEffect(() => {
    if (countdown <= 0) {
      onRedirect();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onRedirect]);

  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 sm:p-6">
      <div className="flex gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 text-base sm:text-lg">
            Password Expired
          </h3>
          <p className="text-red-800 mt-2 text-sm sm:text-base">
            Your password has expired. For security reasons, you must change
            your password to continue.
          </p>
          <p className="text-red-700 mt-3 text-sm sm:text-base font-medium">
            Redirecting to password reset page in{" "}
            <span className="font-bold text-lg">{countdown}</span> second
            {countdown !== 1 ? "s" : ""}...
          </p>
        </div>
      </div>
    </div>
  );
};
