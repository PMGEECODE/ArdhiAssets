"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCookieAuthStore } from "../store/cookieAuthStore";
import { API_URL } from "../config/constants";

interface SessionWarningOptions {
  warningThresholdMs?: number; // Show warning X ms before expiry
  pollIntervalMs?: number; // How often to check expiry
}

interface SessionWarningState {
  isVisible: boolean;
  secondsLeft: number;
  timeUntilExpiryMs: number;
}

/**
 * Session warning hook - monitors session expiration and shows warnings
 * - Polls backend for session expiry info
 * - Shows warning UI when approaching expiration
 * - Auto-extends session when user stays active
 */
export function useSessionWarning({
  warningThresholdMs = 5 * 60 * 1000, // 5 minutes
  pollIntervalMs = 2000, // 2 seconds during warning
}: SessionWarningOptions = {}) {
  const [state, setState] = useState<SessionWarningState>({
    isVisible: false,
    secondsLeft: 0,
    timeUntilExpiryMs: 0,
  });

  const { isAuthenticated, logout, sessionMetadata, extendSession } =
    useCookieAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkSessionExpiry = useCallback(async () => {
    if (!isAuthenticated || !sessionMetadata?.backendSessionId) return;

    try {
      const response = await fetch(`${API_URL}/sessions/expiry-info`, {
        method: "GET",
        headers: {
          "X-Session-Id": sessionMetadata.backendSessionId,
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          setState({
            isVisible: false,
            secondsLeft: 0,
            timeUntilExpiryMs: 0,
          });
          await logout();
        }
        return;
      }

      const data = await response.json();
      const timeUntilExpiryMs = data.time_until_expiry * 1000; // Convert to ms

      // Show warning if within threshold
      const shouldShowWarning =
        timeUntilExpiryMs > 0 &&
        timeUntilExpiryMs <= warningThresholdMs &&
        !data.is_expired;

      setState({
        isVisible: shouldShowWarning,
        secondsLeft: Math.ceil(timeUntilExpiryMs / 1000),
        timeUntilExpiryMs,
      });

      // If expired, logout
      if (data.is_expired) {
        setState({
          isVisible: false,
          secondsLeft: 0,
          timeUntilExpiryMs: 0,
        });
        await logout();
      }
    } catch (error) {
      console.error("[SessionWarning] Failed to check expiry:", error);
    }
  }, [
    isAuthenticated,
    sessionMetadata,
    warningThresholdMs,
    logout,
  ]);

  const extendSessionFromWarning = useCallback(async () => {
    await extendSession();
    setState({
      isVisible: false,
      secondsLeft: 0,
      timeUntilExpiryMs: 0,
    });
  }, [extendSession]);

  useEffect(() => {
    if (!isAuthenticated) {
      setState({
        isVisible: false,
        secondsLeft: 0,
        timeUntilExpiryMs: 0,
      });
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Check immediately
    checkSessionExpiry();

    // Poll periodically
    intervalRef.current = setInterval(checkSessionExpiry, pollIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, checkSessionExpiry, pollIntervalMs]);

  return {
    ...state,
    extendSessionFromWarning,
    logout,
  };
}
