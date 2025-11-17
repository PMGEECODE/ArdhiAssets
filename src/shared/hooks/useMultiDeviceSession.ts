"use client";

import { useEffect, useCallback, useRef } from "react";
import { useCookieAuthStore } from "../store/cookieAuthStore";
import { API_URL } from "../config/constants";

interface MultiDeviceSessionOptions {
  checkIntervalMs?: number;
}

const LOG_PREFIX = "[MultiDevice]";
const getTimestamp = () => new Date().toISOString().slice(11, 23); // HH:MM:SS.sss

/**
 * Multi-device session hook - handles cross-tab/cross-device session invalidation
 */
export function useMultiDeviceSession({
  checkIntervalMs = 60 * 1000,
}: MultiDeviceSessionOptions = {}) {
  const { isAuthenticated, logout, sessionMetadata } = useCookieAuthStore();
  const storageListenerRef = useRef<((e: StorageEvent) => void) | null>(null);
  const visibilityListenerRef = useRef<(() => void) | null>(null);

  const sessionId = sessionMetadata?.backendSessionId;
  const shortSessionId = sessionId ? `${sessionId.slice(0, 8)}...` : "none";

  // Debug: Hook initialization
  console.log(
    `${LOG_PREFIX} Initializing hook | Auth: ${isAuthenticated} | Session: ${shortSessionId} | CheckInterval: ${checkIntervalMs}ms`
  );

  const handleStorageEvent = useCallback(
    async (e: StorageEvent) => {
      console.log(
        `${LOG_PREFIX} [storage] Event received | key="${e.key}" | newValue="${e.newValue}" | url="${e.url}"`
      );

      if (e.key === "SESSION_INVALIDATED" && e.newValue === "1") {
        console.warn(
          `${LOG_PREFIX} [storage] Session invalidated by another tab! Triggering logout...`
        );
        await logout();
        console.log(
          `${LOG_PREFIX} [storage] Logout complete. Redirecting to /login`
        );
        window.location.href = "/login";
      }
    },
    [logout]
  );

  const handleVisibilityChange = useCallback(async () => {
    const now = getTimestamp();
    const isVisible = document.visibilityState === "visible";

    console.log(
      `${LOG_PREFIX} [visibility] State changed → "${document.visibilityState}" at ${now}`
    );

    if (isVisible && isAuthenticated && sessionId) {
      console.log(
        `${LOG_PREFIX} [visibility] Tab visible → extending session ${shortSessionId}`
      );

      try {
        const response = await fetch(`${API_URL}/sessions/extend`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Id": sessionId,
          },
          credentials: "include",
          body: JSON.stringify({
            activity_detected: true,
            reason: "Tab became visible",
            timestamp: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          console.log(
            `${LOG_PREFIX} [visibility] Session extended successfully (200 OK)`
          );
        } else {
          const errorText = await response.text();
          console.warn(
            `${LOG_PREFIX} [visibility] Extend failed: ${response.status} ${response.statusText} | ${errorText}`
          );
        }
      } catch (error: any) {
        console.error(
          `${LOG_PREFIX} [visibility] Network error during extend:`,
          error.message || error
        );
      }
    } else if (isVisible && isAuthenticated && !sessionId) {
      console.warn(
        `${LOG_PREFIX} [visibility] Tab visible but no backendSessionId → cannot extend`
      );
    }
  }, [isAuthenticated, sessionId]);

  // Effect 1: Setup listeners when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log(`${LOG_PREFIX} [effect:setup] Skipped → not authenticated`);
      return;
    }

    console.log(
      `${LOG_PREFIX} [effect:setup] Setting up storage + visibility listeners | Session: ${shortSessionId}`
    );

    storageListenerRef.current = handleStorageEvent;
    window.addEventListener("storage", handleStorageEvent);

    visibilityListenerRef.current = handleVisibilityChange;
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial visibility check
    if (document.visibilityState === "visible") {
      console.log(
        `${LOG_PREFIX} [effect:setup] Page already visible → triggering extend`
      );
      handleVisibilityChange();
    }

    return () => {
      console.log(`${LOG_PREFIX} [effect:cleanup] Removing listeners`);

      if (storageListenerRef.current) {
        window.removeEventListener("storage", handleStorageEvent);
        storageListenerRef.current = null;
      }
      if (visibilityListenerRef.current) {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        visibilityListenerRef.current = null;
      }
    };
  }, [isAuthenticated, handleStorageEvent, handleVisibilityChange]);

  // Effect 2: Redundant cleanup (safe fallback)
  useEffect(() => {
    if (isAuthenticated) return;

    console.log(
      `${LOG_PREFIX} [effect:redundant-cleanup] Auth lost → ensuring cleanup`
    );

    if (storageListenerRef.current) {
      window.removeEventListener("storage", handleStorageEvent);
      storageListenerRef.current = null;
    }
    if (visibilityListenerRef.current) {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      visibilityListenerRef.current = null;
    }
  }, [isAuthenticated, handleStorageEvent, handleVisibilityChange]);

  // Optional: Polling fallback using checkIntervalMs
  useEffect(() => {
    if (!isAuthenticated || !sessionId || checkIntervalMs <= 0) return;

    console.log(
      `${LOG_PREFIX} [polling] Starting heartbeat every ${checkIntervalMs}ms`
    );

    const interval = setInterval(async () => {
      console.log(`${LOG_PREFIX} [polling] Sending heartbeat...`);
      try {
        const res = await fetch(`${API_URL}/sessions/extend`, {
          method: "POST",
          headers: {
            "X-Session-Id": sessionId,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            activity_detected: true,
            reason: "Polling heartbeat",
          }),
        });

        if (res.ok) {
          console.log(`${LOG_PREFIX} [polling] Heartbeat OK`);
        } else {
          console.warn(
            `${LOG_PREFIX} [polling] Heartbeat failed: ${res.status}`
          );
        }
      } catch (err) {
        console.error(`${LOG_PREFIX} [polling] Heartbeat error:`, err);
      }
    }, checkIntervalMs);

    return () => {
      console.log(`${LOG_PREFIX} [polling] Clearing interval`);
      clearInterval(interval);
    };
  }, [isAuthenticated, sessionId, checkIntervalMs]);

  return { isActive: isAuthenticated };
}
