// "use client";

// import { useEffect, useRef, useCallback } from "react";
// import { useCookieAuthStore } from "../store/cookieAuthStore";
// import { API_URL } from "../config/constants";

// interface SessionManagerOptions {
//   validationIntervalMs?: number; // Poll /sessions/validate every X ms
//   activitySyncIntervalMs?: number; // Sync activity with /sessions/extend
//   debounceMs?: number; // Debounce activity events
// }

// /**
//  * Core session management hook - handles all session operations with backend
//  * - Validates session periodically via backend API
//  * - Extends session on user activity
//  * - Tracks user activity across events
//  */
// export function useSessionManager({
//   validationIntervalMs = 5 * 60 * 1000, // 5 minutes
//   activitySyncIntervalMs = 30 * 1000, // 30 seconds
//   debounceMs = 5000, // 5 seconds
// }: SessionManagerOptions = {}) {
//   const { isAuthenticated, sessionMetadata, logout, extendSession } =
//     useCookieAuthStore();

//   const validationIntervalRef = useRef<NodeJS.Timeout | null>(null);
//   const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const hasActivityRef = useRef<boolean>(false);
//   const lastValidationRef = useRef<number>(0);

//   const validateSessionWithBackend = useCallback(async () => {
//     if (!isAuthenticated || !sessionMetadata?.backendSessionId) return;

//     try {
//       const response = await fetch(`${API_URL}/sessions/validate`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Session-Id": sessionMetadata.backendSessionId,
//         },
//         credentials: "include",
//       });

//       if (!response.ok) {
//         if (response.status === 401) {
//           console.log("[SessionManager] Session invalid - logging out");
//           await logout();
//         }
//         return;
//       }

//       const data = await response.json();

//       // Check if session requires logout
//       if (data.requires_logout || data.is_expired) {
//         await logout();
//       }
//     } catch (error) {
//       console.error("[SessionManager] Validation failed:", error);
//     }

//     lastValidationRef.current = Date.now();
//   }, [isAuthenticated, sessionMetadata, logout]);

//   const syncActivityWithBackend = useCallback(async () => {
//     if (!isAuthenticated || !sessionMetadata?.backendSessionId) return;

//     try {
//       const response = await fetch(`${API_URL}/sessions/extend`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Session-Id": sessionMetadata.backendSessionId,
//         },
//         credentials: "include",
//         body: JSON.stringify({
//           activity_detected: hasActivityRef.current,
//           reason: "User activity",
//         }),
//       });

//       if (!response.ok && response.status === 401) {
//         await logout();
//       }

//       hasActivityRef.current = false;
//     } catch (error) {
//       console.error("[SessionManager] Activity sync failed:", error);
//     }
//   }, [isAuthenticated, sessionMetadata, logout]);

//   const handleActivity = useCallback(() => {
//     hasActivityRef.current = true;

//     // Debounce rapid activity events
//     if (debounceTimeoutRef.current) {
//       clearTimeout(debounceTimeoutRef.current);
//     }

//     debounceTimeoutRef.current = setTimeout(() => {
//       syncActivityWithBackend();
//     }, debounceMs);
//   }, [syncActivityWithBackend, debounceMs]);

//   useEffect(() => {
//     if (!isAuthenticated) {
//       // Cleanup all timers
//       if (validationIntervalRef.current) clearInterval(validationIntervalRef.current);
//       if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
//       if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
//       return;
//     }

//     // Activity event listeners
//     const activityEvents = [
//       "mousedown",
//       "keydown",
//       "touchstart",
//       "scroll",
//       "click",
//     ];
//     activityEvents.forEach((event) => {
//       document.addEventListener(event, handleActivity, { passive: true });
//     });

//     // Periodic validation
//     validationIntervalRef.current = setInterval(
//       validateSessionWithBackend,
//       validationIntervalMs
//     );

//     // Immediate first validation
//     validateSessionWithBackend();

//     return () => {
//       activityEvents.forEach((event) => {
//         document.removeEventListener(event, handleActivity);
//       });
//       if (validationIntervalRef.current)
//         clearInterval(validationIntervalRef.current);
//       if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
//     };
//   }, [
//     isAuthenticated,
//     handleActivity,
//     validateSessionWithBackend,
//     validationIntervalMs,
//   ]);

//   return {
//     validateSessionWithBackend,
//     syncActivityWithBackend,
//   };
// }


"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCookieAuthStore } from "../store/cookieAuthStore";
import { API_URL } from "../config/constants";

interface SessionManagerOptions {
  validationIntervalMs?: number; // Poll /sessions/validate every X ms
  activitySyncIntervalMs?: number; // Sync activity with /sessions/extend
  debounceMs?: number; // Debounce activity events
  initialGracePeriodMs?: number; // Delay before first validation
}

/**
 * Core session management hook - handles all session operations with backend
 * - Validates session periodically via backend API
 * - Extends session on user activity
 * - Tracks user activity across events
 */
export function useSessionManager({
  validationIntervalMs = 5 * 60 * 1000, // 5 minutes
  activitySyncIntervalMs = 30 * 1000, // 30 seconds
  debounceMs = 5000, // 5 seconds
  initialGracePeriodMs = 10_000, // 10s before first validation
}: SessionManagerOptions = {}) {
  const { isAuthenticated, sessionMetadata, logout, extendSession } =
    useCookieAuthStore();

  const validationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gracePeriodTimerRef = useRef<NodeJS.Timeout | null>(null); // Track grace period
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasActivityRef = useRef<boolean>(false);
  const lastValidationRef = useRef<number>(0);

  const validateSessionWithBackend = useCallback(async () => {
    if (!isAuthenticated || !sessionMetadata?.backendSessionId) return;

    try {
      const response = await fetch(`${API_URL}/sessions/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionMetadata.backendSessionId,
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log("[SessionManager] Session invalid - logging out");
          await logout();
        }
        return;
      }

      const data = await response.json();

      // Check if session requires logout
      if (data.requires_logout || data.is_expired) {
        await logout();
      }
    } catch (error) {
      console.error("[SessionManager] Validation failed:", error);
    }

    lastValidationRef.current = Date.now();
  }, [isAuthenticated, sessionMetadata, logout]);

  const syncActivityWithBackend = useCallback(async () => {
    if (!isAuthenticated || !sessionMetadata?.backendSessionId) return;

    try {
      const response = await fetch(`${API_URL}/sessions/extend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionMetadata.backendSessionId,
        },
        credentials: "include",
        body: JSON.stringify({
          activity_detected: hasActivityRef.current,
          reason: "User activity",
        }),
      });

      if (!response.ok && response.status === 401) {
        await logout();
      }

      hasActivityRef.current = false;
    } catch (error) {
      console.error("[SessionManager] Activity sync failed:", error);
    }
  }, [isAuthenticated, sessionMetadata, logout]);

  const handleActivity = useCallback(() => {
    hasActivityRef.current = true;

    // Debounce rapid activity events
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      syncActivityWithBackend();
    }, debounceMs);
  }, [syncActivityWithBackend, debounceMs]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Cleanup all timers
      if (validationIntervalRef.current)
        clearInterval(validationIntervalRef.current);
      if (gracePeriodTimerRef.current)
        clearTimeout(gracePeriodTimerRef.current); // Clear grace period
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      return;
    }

    // Activity event listeners
    const activityEvents = [
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    gracePeriodTimerRef.current = setTimeout(() => {
      console.log(
        "[SessionManager] Grace period elapsed → starting validation"
      );
      validateSessionWithBackend();

      // Periodic validation after grace period
      validationIntervalRef.current = setInterval(
        validateSessionWithBackend,
        validationIntervalMs
      );
    }, initialGracePeriodMs);

    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (validationIntervalRef.current)
        clearInterval(validationIntervalRef.current);
      if (gracePeriodTimerRef.current)
        clearTimeout(gracePeriodTimerRef.current); // Clean grace period
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [
    isAuthenticated,
    handleActivity,
    validateSessionWithBackend,
    validationIntervalMs,
    initialGracePeriodMs, // Add to dependency array
  ]);

  return {
    validateSessionWithBackend,
    syncActivityWithBackend,
  };
}
