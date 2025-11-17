"use client";

import type React from "react";
import { AlertCircle, Clock } from "lucide-react";
import Button from "./Button";
import { useInactivityWarning } from "../../hooks/useInactivityWarning";

export interface InactivityWarningBannerProps {
  warningThresholdMs?: number;
}

export const InactivityWarningBanner: React.FC<
  InactivityWarningBannerProps
> = ({ warningThresholdMs = 5 * 60 * 1000 }) => {
  const { isVisible, secondsRemaining, extendSession, logout } =
    useInactivityWarning({
      warningThresholdMs,
    });

  if (!isVisible) {
    return null;
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const isUrgent = secondsRemaining < 60;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 px-4 py-3 md:px-6 transition-colors duration-300 ${
        isUrgent ? "bg-red-500 animate-pulse" : "bg-amber-500"
      }`}
      role="alert"
      aria-live="assertive"
      aria-label={`Session expires in ${timeDisplay}`}
    >
      <div className="flex items-center gap-3">
        <AlertCircle
          size={20}
          className="flex-shrink-0 text-white"
          aria-hidden="true"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-sm font-medium text-white">
            Your session will expire due to inactivity
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
            <Clock size={16} className="text-white" aria-hidden="true" />
            <span className="font-mono font-bold text-white text-sm">
              {timeDisplay}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={extendSession}
          variant="secondary"
          className="!bg-white !text-amber-600 hover:!bg-gray-50 text-xs md:text-sm py-1 md:py-2 whitespace-nowrap"
        >
          Stay Logged In
        </Button>
        <Button
          onClick={logout}
          variant="ghost"
          className="!text-white hover:!bg-white/20 text-xs md:text-sm py-1 md:py-2 whitespace-nowrap"
        >
          Logout
        </Button>
      </div>
    </div>
  );
};

export default InactivityWarningBanner;
