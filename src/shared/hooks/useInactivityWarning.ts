"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCookieAuthStore } from "../store/cookieAuthStore";

interface InactivityWarningOptions {
  warningThresholdMs?: number;
  countdownIntervalMs?: number;
}

export function useInactivityWarning({
  warningThresholdMs = 5 * 60 * 1000,
  countdownIntervalMs = 1000,
}: InactivityWarningOptions = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [sessionTimeoutMs, setSessionTimeoutMs] = useState(30 * 60 * 1000);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoLogoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastWarningShownRef = useRef<number>(0);

  const { isAuthenticated, extendSession, logout, sessionMetadata } =
    useCookieAuthStore();

  const getSessionTimeout = useCallback(() => {
    try {
      const stored = sessionStorage.getItem("auth_session");
      if (stored) {
        const metadata = JSON.parse(stored);
        const maxTimeout = metadata.rememberMe
          ? 24 * 60 * 60 * 1000
          : 30 * 60 * 1000;
        return maxTimeout;
      }
    } catch {
      // Fallback to default
    }
    return 30 * 60 * 1000;
  }, []);

  useEffect(() => {
    setSessionTimeoutMs(getSessionTimeout());
  }, [getSessionTimeout, sessionMetadata]);

  const [isTabVisible, setIsTabVisible] = useState(true);
  const [hasUserFocus, setHasUserFocus] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    const handleFocus = () => setHasUserFocus(true);
    const handleBlur = () => setHasUserFocus(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsVisible(false);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (autoLogoutTimeoutRef.current) {
        clearTimeout(autoLogoutTimeoutRef.current);
      }
      return;
    }

    // Clear any existing timers
    if (countdownIntervalRef.current)
      clearInterval(countdownIntervalRef.current);
    if (autoLogoutTimeoutRef.current)
      clearTimeout(autoLogoutTimeoutRef.current);

    const checkInactivity = async () => {
      const metadata = sessionStorage.getItem("auth_session");
      if (!metadata) return;

      try {
        const session = JSON.parse(metadata);
        const timeSinceLastActivity = Date.now() - session.lastActivityAt;
        const timeUntilExpiry = sessionTimeoutMs - timeSinceLastActivity;

        if (timeUntilExpiry > 0 && timeUntilExpiry <= warningThresholdMs) {
          if (!isVisible) {
            setIsVisible(true);
            lastWarningShownRef.current = Date.now();
            console.log("[InactivityWarning] Warning displayed");
          }

          // Update countdown
          const secondsLeft = Math.max(0, Math.ceil(timeUntilExpiry / 1000));
          setSecondsRemaining(secondsLeft);
        } else if (timeUntilExpiry > warningThresholdMs && isVisible) {
          setIsVisible(false);
        }

        if (timeUntilExpiry <= 0 && isAuthenticated) {
          console.log(
            "[InactivityWarning] Session expired due to inactivity - auto-logging out"
          );
          setIsVisible(false);
          await logout();
          return;
        }
      } catch (error) {
        console.error("[InactivityWarning] Error checking inactivity:", error);
      }
    };

    // Check immediately
    checkInactivity();

    const checkInterval = isTabVisible && hasUserFocus ? 1000 : 5000;
    countdownIntervalRef.current = setInterval(checkInactivity, checkInterval);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [
    isAuthenticated,
    sessionTimeoutMs,
    warningThresholdMs,
    isVisible,
    logout,
    isTabVisible,
    hasUserFocus,
  ]);

  const handleExtendSession = async () => {
    await extendSession();
    setIsVisible(false);
    setSecondsRemaining(0);
  };

  const handleLogout = async () => {
    setIsVisible(false);
    await logout();
  };

  return {
    isVisible,
    secondsRemaining,
    extendSession: handleExtendSession,
    logout: handleLogout,
  };
}
