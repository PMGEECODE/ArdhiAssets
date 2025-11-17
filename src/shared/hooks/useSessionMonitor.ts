"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCookieAuthStore } from "../store/cookieAuthStore";

interface SessionMonitorOptions {
  /** How often we poll the backend for token rotation / session health */
  checkIntervalMs?: number;
  /** Delay after login before we start the first check */
  initialDelayMs?: number;
}

export function useSessionMonitor({
  checkIntervalMs = 5 * 60 * 1000, // 5 min - just to keep connection alive
  initialDelayMs = 10_000, // 10 s
}: SessionMonitorOptions = {}) {
  const { isAuthenticated, logout, rotateTokens, extendSession } =
    useCookieAuthStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  const clearAll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    intervalRef.current = null;
    initTimeoutRef.current = null;
  }, []);

  const performHealthCheck = useCallback(async () => {
    try {
      // Backend-controlled session expiration via httpOnly cookies
      // rotateTokens validates session and refreshes only if needed
      const success = await rotateTokens();
      if (!success) {
        console.log(
          "[SessionMonitor] Token rotation failed - backend may have expired session"
        );
      }
    } catch (error) {
      console.error("[SessionMonitor] Error during token rotation:", error);
    }
  }, [rotateTokens]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (
        e.key === "SESSION_TERMINATED_BY_ADMIN" &&
        e.newValue === "true" &&
        isAuthenticated
      ) {
        console.warn(
          "[SessionMonitor] Session terminated by admin from another tab - logging out"
        );
        logout();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      hasStartedRef.current = false;
      clearAll();
      return;
    }

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;

      initTimeoutRef.current = setTimeout(() => {
        console.log(
          "[SessionMonitor] Initialized - backend controls session expiration"
        );

        // Periodic token rotation to keep session alive
        // Backend httpOnly cookie expiration is the source of truth
        intervalRef.current = setInterval(() => {
          performHealthCheck();
        }, checkIntervalMs);
      }, initialDelayMs);

      return () => clearAll();
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[SessionMonitor] Tab visible - extending session if applicable"
        );
        extendSession();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearAll();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    isAuthenticated,
    checkIntervalMs,
    initialDelayMs,
    clearAll,
    performHealthCheck,
    extendSession,
  ]);

  useEffect(() => {
    const handler = async (e: StorageEvent) => {
      if (
        e.key === "SESSION_INVALIDATED" &&
        e.newValue === "1" &&
        isAuthenticated
      ) {
        console.log("[SessionMonitor] Logout broadcast from another tab");
        await logout();
        window.location.href = "/login";
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [isAuthenticated, logout]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only set SESSION_INVALIDATED if tab is actually closing
      if (isAuthenticated) {
        sessionStorage.removeItem("SESSION_INVALIDATED");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isAuthenticated]);

  return { extendSession };
}
