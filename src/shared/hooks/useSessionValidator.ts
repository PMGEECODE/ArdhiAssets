// /**
//  * useSessionValidator
//  *
//  * Periodically validates session against backend using /sessions/validate
//  * Proactively logs out user if backend session is invalid/expired
//  * Emits warning events when expiry is near
//  */

// import { useEffect, useRef, useCallback } from "react";
// import { useCookieAuthStore } from "../../shared/store/cookieAuthStore";
// import axiosInstance from "../../shared/lib/axiosInstance";
// import { API_URL } from "../../shared/config/constants";

// interface SessionStatus {
//   is_valid: boolean;
//   is_expired: boolean;
//   time_until_expiry: number;
//   last_activity: string;
//   expires_at: string;
//   requires_logout: boolean;
//   message: string;
// }

// // File-specific constants
// const LOG_PREFIX = "[SessionValidator]";
// const FILE = "useSessionValidator.ts";
// const VALIDATION_INTERVAL_MS = 60_000; // 60 seconds
// const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
// const getTimestamp = () => new Date().toISOString().slice(11, 23); // HH:MM:SS.sss

// export function useSessionValidator() {
//   const { user, sessionMetadata, logout } = useCookieAuthStore();
//   const intervalRef = useRef<NodeJS.Timeout | null>(null);

//   const sessionId = sessionMetadata?.backendSessionId;
//   const shortSessionId = sessionId ? `${sessionId.slice(0, 8)}...` : "none";

//   // Debug: Hook init
//   console.log(
//     `${LOG_PREFIX} [${FILE}] Initializing | User: ${!!user} | Session: ${shortSessionId} | Interval: ${VALIDATION_INTERVAL_MS}ms`
//   );

//   const dispatchWarning = useCallback((secondsRemaining: number) => {
//     const minutes = Math.max(1, Math.round(secondsRemaining / 60));
//     const message = `Your session expires in ${minutes} minute${
//       minutes > 1 ? "s" : ""
//     }`;

//     console.warn(
//       `${LOG_PREFIX} [${FILE}] [warning] ${message} | ${secondsRemaining}s remaining`
//     );

//     window.dispatchEvent(
//       new CustomEvent("session-warning", {
//         detail: {
//           timeUntilExpiry: secondsRemaining,
//           message,
//         },
//       })
//     );
//   }, []);

//   const validateSession = useCallback(async () => {
//     if (!user || !sessionId) {
//       console.log(
//         `${LOG_PREFIX} [${FILE}] [validate] Skipped → no user or session ID`
//       );
//       return;
//     }

//     const start = Date.now();
//     console.log(
//       `${LOG_PREFIX} [${FILE}] [validate] → POST /sessions/validate | Session: ${shortSessionId} | ${getTimestamp()}`
//     );

//     try {
//       const response = await axiosInstance.post<SessionStatus>(
//         `${API_URL}/sessions/validate`,
//         {},
//         {
//           headers: { "X-Session-Id": sessionId },
//           withCredentials: true,
//         }
//       );

//       const duration = Date.now() - start;
//       const {
//         is_valid,
//         is_expired,
//         requires_logout,
//         time_until_expiry,
//         message,
//       } = response.data;

//       console.log(
//         `${LOG_PREFIX} [${FILE}] [validate] Success (200) in ${duration}ms ` +
//           `| Valid: ${is_valid} | Expired: ${is_expired} | RequiresLogout: ${requires_logout} ` +
//           `| ExpiresIn: ${time_until_expiry}s | Msg: "${message}"`
//       );

//       // Immediate logout
//       if (!is_valid || is_expired || requires_logout) {
//         console.warn(
//           `${LOG_PREFIX} [${FILE}] [validate] Invalid/expired → forcing logout`
//         );
//         await logout();
//         return;
//       }

//       // Warning threshold
//       if (
//         time_until_expiry > 0 &&
//         time_until_expiry * 1000 <= WARNING_THRESHOLD_MS
//       ) {
//         dispatchWarning(time_until_expiry);
//       } else if (time_until_expiry > 0) {
//         console.log(
//           `${LOG_PREFIX} [${FILE}] [validate] Time until expiry: ${time_until_expiry}s (no warning yet)`
//         );
//       }
//     } catch (error: any) {
//       const duration = Date.now() - start;

//       if (error.response?.status === 401 || error.response?.status === 403) {
//         console.warn(
//           `${LOG_PREFIX} [${FILE}] [validate] Failed ${error.response.status} → logout after ${duration}ms`
//         );
//         await logout();
//       } else if (error.code === "ERR_NETWORK" || !error.response) {
//         console.error(
//           `${LOG_PREFIX} [${FILE}] [validate] Network error after ${duration}ms → retrying next cycle`,
//           error.message || error
//         );
//       } else {
//         console.error(
//           `${LOG_PREFIX} [${FILE}] [validate] Unexpected error ${
//             error.response?.status || "unknown"
//           } after ${duration}ms:`,
//           error.response?.data || error.message
//         );
//       }
//     }
//   }, [user, sessionId, logout, dispatchWarning]);

//   const extendSession = useCallback(
//     async (reason = "user activity") => {
//       if (!user || !sessionId) {
//         console.log(
//           `${LOG_PREFIX} [${FILE}] [extend] Skipped → no user or session ID`
//         );
//         return false;
//       }

//       const start = Date.now();
//       console.log(
//         `${LOG_PREFIX} [${FILE}] [extend] → POST /sessions/extend | Reason: "${reason}" | ${getTimestamp()}`
//       );

//       try {
//         await axiosInstance.post(
//           `${API_URL}/sessions/extend`,
//           { activity_detected: true, reason },
//           {
//             headers: { "X-Session-Id": sessionId },
//             withCredentials: true,
//           }
//         );

//         const duration = Date.now() - start;
//         console.log(
//           `${LOG_PREFIX} [${FILE}] [extend] Success (200) in ${duration}ms`
//         );
//         return true;
//       } catch (error: any) {
//         const duration = Date.now() - start;
//         console.error(
//           `${LOG_PREFIX} [${FILE}] [extend] Failed after ${duration}ms:`,
//           error.response?.data || error.message
//         );
//         return false;
//       }
//     },
//     [user, sessionId]
//   );

//   // Setup polling
//   useEffect(() => {
//     if (!user || !sessionId) {
//       if (intervalRef.current) {
//         console.log(
//           `${LOG_PREFIX} [${FILE}] [effect] Clearing interval → no session`
//         );
//         clearInterval(intervalRef.current);
//         intervalRef.current = null;
//       }
//       return;
//     }

//     console.log(
//       `${LOG_PREFIX} [${FILE}] [effect] Starting validation interval every ${VALIDATION_INTERVAL_MS}ms | Session: ${shortSessionId}`
//     );

//     // Run immediately
//     validateSession();

//     // Then every 60s
//     intervalRef.current = setInterval(() => {
//       console.log(`${LOG_PREFIX} [${FILE}] [interval] Triggered`);
//       validateSession();
//     }, VALIDATION_INTERVAL_MS);

//     return () => {
//       if (intervalRef.current) {
//         console.log(
//           `${LOG_PREFIX} [${FILE}] [cleanup] Clearing validation interval`
//         );
//         clearInterval(intervalRef.current);
//         intervalRef.current = null;
//       }
//     };
//   }, [user, sessionId, validateSession]);

//   return {
//     validateSession,
//     extendSession,
//   };
// }


/**
 * useSessionValidator
 *
 * Periodically validates session against backend using /sessions/validate
 * Proactively logs out user if backend session is invalid/expired
 * Emits warning events when expiry is near
 */

import { useEffect, useRef, useCallback } from "react";
import { useCookieAuthStore } from "../../shared/store/cookieAuthStore";
import axiosInstance from "../../shared/lib/axiosInstance";
import { API_URL } from "../../shared/config/constants";

interface SessionStatus {
  is_valid: boolean;
  is_expired: boolean;
  time_until_expiry: number;
  last_activity: string;
  expires_at: string;
  requires_logout: boolean;
  message: string;
}

// File-specific constants
const LOG_PREFIX = "[SessionValidator]";
const FILE = "useSessionValidator.ts";
const VALIDATION_INTERVAL_MS = 60_000; // 60 seconds
const INITIAL_GRACE_PERIOD_MS = 10_000; // 10s delay before first validation
const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const getTimestamp = () => new Date().toISOString().slice(11, 23); // HH:MM:SS.sss

export function useSessionValidator() {
  const { user, sessionMetadata, logout } = useCookieAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const gracePeriodTimerRef = useRef<NodeJS.Timeout | null>(null); // Track grace period timer

  const sessionId = sessionMetadata?.backendSessionId;
  const shortSessionId = sessionId ? `${sessionId.slice(0, 8)}...` : "none";

  console.log(
    `${LOG_PREFIX} [${FILE}] Initializing | User: ${!!user} | Session: ${shortSessionId} | Interval: ${VALIDATION_INTERVAL_MS}ms | Grace: ${INITIAL_GRACE_PERIOD_MS}ms`
  );

  const dispatchWarning = useCallback((secondsRemaining: number) => {
    const minutes = Math.max(1, Math.round(secondsRemaining / 60));
    const message = `Your session expires in ${minutes} minute${
      minutes > 1 ? "s" : ""
    }`;

    console.warn(
      `${LOG_PREFIX} [${FILE}] [warning] ${message} | ${secondsRemaining}s remaining`
    );

    window.dispatchEvent(
      new CustomEvent("session-warning", {
        detail: {
          timeUntilExpiry: secondsRemaining,
          message,
        },
      })
    );
  }, []);

  const validateSession = useCallback(async () => {
    if (!user || !sessionId) {
      console.log(
        `${LOG_PREFIX} [${FILE}] [validate] Skipped → no user or session ID`
      );
      return;
    }

    const start = Date.now();
    console.log(
      `${LOG_PREFIX} [${FILE}] [validate] → POST /sessions/validate | Session: ${shortSessionId} | ${getTimestamp()}`
    );

    try {
      const response = await axiosInstance.post<SessionStatus>(
        `${API_URL}/sessions/validate`,
        {},
        {
          headers: { "X-Session-Id": sessionId },
          withCredentials: true,
        }
      );

      const duration = Date.now() - start;
      const {
        is_valid,
        is_expired,
        requires_logout,
        time_until_expiry,
        message,
      } = response.data;

      console.log(
        `${LOG_PREFIX} [${FILE}] [validate] Success (200) in ${duration}ms ` +
          `| Valid: ${is_valid} | Expired: ${is_expired} | RequiresLogout: ${requires_logout} ` +
          `| ExpiresIn: ${time_until_expiry}s | Msg: "${message}"`
      );

      // Immediate logout
      if (!is_valid || is_expired || requires_logout) {
        console.warn(
          `${LOG_PREFIX} [${FILE}] [validate] Invalid/expired → forcing logout`
        );
        await logout();
        return;
      }

      // Warning threshold
      if (
        time_until_expiry > 0 &&
        time_until_expiry * 1000 <= WARNING_THRESHOLD_MS
      ) {
        dispatchWarning(time_until_expiry);
      } else if (time_until_expiry > 0) {
        console.log(
          `${LOG_PREFIX} [${FILE}] [validate] Time until expiry: ${time_until_expiry}s (no warning yet)`
        );
      }
    } catch (error: any) {
      const duration = Date.now() - start;

      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn(
          `${LOG_PREFIX} [${FILE}] [validate] Failed ${error.response.status} → logout after ${duration}ms`
        );
        await logout();
      } else if (error.code === "ERR_NETWORK" || !error.response) {
        console.error(
          `${LOG_PREFIX} [${FILE}] [validate] Network error after ${duration}ms → retrying next cycle`,
          error.message || error
        );
      } else {
        console.error(
          `${LOG_PREFIX} [${FILE}] [validate] Unexpected error ${
            error.response?.status || "unknown"
          } after ${duration}ms:`,
          error.response?.data || error.message
        );
      }
    }
  }, [user, sessionId, logout, dispatchWarning]);

  const extendSession = useCallback(
    async (reason = "user activity") => {
      if (!user || !sessionId) {
        console.log(
          `${LOG_PREFIX} [${FILE}] [extend] Skipped → no user or session ID`
        );
        return false;
      }

      const start = Date.now();
      console.log(
        `${LOG_PREFIX} [${FILE}] [extend] → POST /sessions/extend | Reason: "${reason}" | ${getTimestamp()}`
      );

      try {
        await axiosInstance.post(
          `${API_URL}/sessions/extend`,
          { activity_detected: true, reason },
          {
            headers: { "X-Session-Id": sessionId },
            withCredentials: true,
          }
        );

        const duration = Date.now() - start;
        console.log(
          `${LOG_PREFIX} [${FILE}] [extend] Success (200) in ${duration}ms`
        );
        return true;
      } catch (error: any) {
        const duration = Date.now() - start;
        console.error(
          `${LOG_PREFIX} [${FILE}] [extend] Failed after ${duration}ms:`,
          error.response?.data || error.message
        );
        return false;
      }
    },
    [user, sessionId]
  );

  // Setup polling
  useEffect(() => {
    if (!user || !sessionId) {
      if (intervalRef.current) {
        console.log(
          `${LOG_PREFIX} [${FILE}] [effect] Clearing interval → no session`
        );
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (gracePeriodTimerRef.current) { // Clear grace period on cleanup
        clearTimeout(gracePeriodTimerRef.current);
        gracePeriodTimerRef.current = null;
      }
      return;
    }

    console.log(
      `${LOG_PREFIX} [${FILE}] [effect] Starting validation with ${INITIAL_GRACE_PERIOD_MS}ms grace period | Session: ${shortSessionId}`
    );

    gracePeriodTimerRef.current = setTimeout(() => {
      console.log(
        `${LOG_PREFIX} [${FILE}] [grace-period] Elapsed → running first validation`
      );
      validateSession();

      // Then every 60s
      intervalRef.current = setInterval(() => {
        console.log(`${LOG_PREFIX} [${FILE}] [interval] Triggered`);
        validateSession();
      }, VALIDATION_INTERVAL_MS);
    }, INITIAL_GRACE_PERIOD_MS);

    return () => {
      if (intervalRef.current) {
        console.log(
          `${LOG_PREFIX} [${FILE}] [cleanup] Clearing validation interval`
        );
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (gracePeriodTimerRef.current) {
        console.log(
          `${LOG_PREFIX} [${FILE}] [cleanup] Clearing grace period timer`
        );
        clearTimeout(gracePeriodTimerRef.current);
        gracePeriodTimerRef.current = null;
      }
    };
  }, [user, sessionId, validateSession]);

  return {
    validateSession,
    extendSession,
  };
}


