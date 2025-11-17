// "use client";

// import { useEffect, useRef, useCallback, useState } from "react";
// import { useCookieAuthStore } from "../store/cookieAuthStore";
// import { API_URL } from "../config/constants";

// interface ActivitySyncOptions {
//   syncIntervalMs?: number;
//   debounceMs?: number;
// }

// // File-specific log prefix
// const LOG_PREFIX = "[ActivitySync]";
// const FILE = "useActivitySync.tsx";
// const getTimestamp = () => new Date().toISOString().slice(11, 23); // HH:MM:SS.sss

// export function useActivitySync({
//   syncIntervalMs = 30_000, // 30 seconds
//   debounceMs = 5_000, // 5 seconds
// }: ActivitySyncOptions = {}) {
//   const { isAuthenticated, sessionMetadata } = useCookieAuthStore();
//   const [sessionId, setSessionId] = useState<string | null>(null);
//   const [attemptedFetch, setAttemptedFetch] = useState(false);
//   const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const lastSyncRef = useRef<number>(0);
//   const hasUserActivityRef = useRef<boolean>(false);

//   useEffect(() => {
//     if (!isAuthenticated || sessionId || attemptedFetch) return;

//     const fetchSessionId = async () => {
//       try {
//         const response = await fetch(`${API_URL}/auth/me`, {
//           credentials: "include",
//         });

//         if (response.ok) {
//           const data = await response.json();
//           const backendSessionId = data.session_metadata?.session_id;
//           if (backendSessionId) {
//             console.log(
//               `${LOG_PREFIX} [${FILE}] Fetched session ID from /auth/me`
//             );
//             setSessionId(backendSessionId);
//           }
//         }
//       } catch (error) {
//         console.warn(
//           `${LOG_PREFIX} [${FILE}] Failed to fetch session ID from /auth/me:`,
//           error
//         );
//       } finally {
//         setAttemptedFetch(true);
//       }
//     };

//     fetchSessionId();
//   }, [isAuthenticated, sessionId, attemptedFetch]);

//   // Use sessionMetadata.backendSessionId if available, otherwise use fetched sessionId
//   const activeSessionId = sessionMetadata?.backendSessionId || sessionId;
//   const shortSessionId = activeSessionId
//     ? `${activeSessionId.slice(0, 8)}...`
//     : "none";

//   // Debug: Hook init
//   console.log(
//     `${LOG_PREFIX} [${FILE}] Initializing | Auth: ${isAuthenticated} | Session: ${shortSessionId} ` +
//       `| Sync: ${syncIntervalMs}ms | Debounce: ${debounceMs}ms`
//   );

//   const syncActivityWithBackend = useCallback(async () => {
//     if (!isAuthenticated || !activeSessionId) {
//       console.log(
//         `${LOG_PREFIX} [${FILE}] [sync] Skipped → not auth or no session ID`
//       );
//       return;
//     }

//     const now = Date.now();
//     const sinceLastSync = now - lastSyncRef.current;
//     const activityFlag = hasUserActivityRef.current;

//     console.log(
//       `${LOG_PREFIX} [${FILE}] [sync] → POST /auth/session/activity ` +
//         `| Activity: ${activityFlag} | Since last: ${sinceLastSync}ms | ${getTimestamp()}`
//     );

//     try {
//       const response = await fetch(`${API_URL}/auth/session/activity`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Session-Id": activeSessionId,
//         },
//         credentials: "include",
//         body: JSON.stringify({
//           activity_detected: activityFlag,
//           timestamp: new Date().toISOString(),
//           source: "useActivitySync",
//         }),
//       });

//       const responseTime = Date.now() - now;

//       if (response.ok) {
//         const data = await response.json();
//         console.log(
//           `${LOG_PREFIX} [${FILE}] [sync] Success (200) in ${responseTime}ms ` +
//             `| Extended: ${!!data.session_extended} | Data: ${JSON.stringify(
//               data
//             ).slice(0, 100)}`
//         );

//         if (data.session_extended) {
//           const raw = sessionStorage.getItem("auth_session");
//           if (raw) {
//             try {
//               const parsed = JSON.parse(raw);
//               parsed.lastActivityAt = Date.now();
//               sessionStorage.setItem("auth_session", JSON.stringify(parsed));
//               if (parsed.rememberMe) {
//                 localStorage.setItem("auth_session", JSON.stringify(parsed));
//               }
//               console.log(
//                 `${LOG_PREFIX} [${FILE}] [sync] Local metadata updated`
//               );
//             } catch (e) {
//               console.error(
//                 `${LOG_PREFIX} [${FILE}] [sync] Failed to update metadata:`,
//                 e
//               );
//             }
//           }
//         }
//       } else if (response.status === 401) {
//         console.warn(
//           `${LOG_PREFIX} [${FILE}] [sync] Failed 401 → Session likely invalidated by backend`
//         );
//       } else {
//         const text = await response.text();
//         console.warn(
//           `${LOG_PREFIX} [${FILE}] [sync] Failed ${
//             response.status
//           } | ${text.slice(0, 100)}`
//         );
//       }

//       hasUserActivityRef.current = false;
//       lastSyncRef.current = Date.now();
//     } catch (error: any) {
//       console.error(
//         `${LOG_PREFIX} [${FILE}] [sync] Network error:`,
//         error.message || error
//       );
//     }
//   }, [isAuthenticated, activeSessionId]);

//   const handleActivity = useCallback(() => {
//     if (!isAuthenticated) return;

//     const now = getTimestamp();
//     hasUserActivityRef.current = true;

//     console.log(`${LOG_PREFIX} [${FILE}] [activity] Detected at ${now}`);

//     // Clear previous debounce
//     if (debounceTimeoutRef.current) {
//       clearTimeout(debounceTimeoutRef.current);
//       console.log(`${LOG_PREFIX} [${FILE}] [activity] Debounce reset`);
//     }

//     debounceTimeoutRef.current = setTimeout(() => {
//       console.log(
//         `${LOG_PREFIX} [${FILE}] [activity] Debounce fired → syncing`
//       );
//       syncActivityWithBackend();
//     }, debounceMs);
//   }, [isAuthenticated, syncActivityWithBackend, debounceMs]);

//   // Main effect: Setup listeners + interval
//   useEffect(() => {
//     if (!isAuthenticated || !activeSessionId) {
//       console.log(
//         `${LOG_PREFIX} [${FILE}] [effect] Skipped → not authenticated or no session ID`
//       );
//       return;
//     }

//     console.log(
//       `${LOG_PREFIX} [${FILE}] [effect] Setting up activity listeners + sync interval ` +
//         `| Session: ${shortSessionId}`
//     );

//     const events = ["mousedown", "keydown", "touchstart", "scroll"];
//     events.forEach((event) => {
//       document.addEventListener(event, handleActivity, { passive: true });
//       console.log(`${LOG_PREFIX} [${FILE}] [listener] Added: ${event}`);
//     });

//     // Periodic sync (heartbeat)
//     const interval = setInterval(() => {
//       console.log(
//         `${LOG_PREFIX} [${FILE}] [interval] Triggered every ${syncIntervalMs}ms`
//       );
//       syncActivityWithBackend();
//     }, syncIntervalMs);

//     // Initial sync
//     console.log(
//       `${LOG_PREFIX} [${FILE}] [interval] Scheduling first sync in ${syncIntervalMs}ms`
//     );
//     lastSyncRef.current = Date.now();

//     return () => {
//       console.log(
//         `${LOG_PREFIX} [${FILE}] [cleanup] Removing listeners & interval`
//       );

//       events.forEach((event) => {
//         document.removeEventListener(event, handleActivity);
//         console.log(`${LOG_PREFIX} [${FILE}] [listener] Removed: ${event}`);
//       });

//       clearInterval(interval);
//       if (debounceTimeoutRef.current) {
//         clearTimeout(debounceTimeoutRef.current);
//         debounceTimeoutRef.current = null;
//         console.log(`${LOG_PREFIX} [${FILE}] [cleanup] Debounce cleared`);
//       }
//     };
//   }, [
//     isAuthenticated,
//     activeSessionId,
//     handleActivity,
//     syncActivityWithBackend,
//     syncIntervalMs,
//     debounceMs,
//   ]);

//   return { syncActivityWithBackend };
// }


"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useCookieAuthStore } from "../store/cookieAuthStore";
import { API_URL } from "../config/constants";

interface ActivitySyncOptions {
  syncIntervalMs?: number;
  debounceMs?: number;
}

// File-specific log prefix
const LOG_PREFIX = "[ActivitySync]";
const FILE = "useActivitySync.tsx";
const getTimestamp = () => new Date().toISOString().slice(11, 23); // HH:MM:SS.sss

export function useActivitySync({
  syncIntervalMs = 30_000, // 30 seconds
  debounceMs = 5_000, // 5 seconds
}: ActivitySyncOptions = {}) {
  const { isAuthenticated, sessionMetadata } = useCookieAuthStore();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attemptedFetch, setAttemptedFetch] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  const hasUserActivityRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated || sessionId || attemptedFetch) return;

    const fetchSessionId = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          const backendSessionId = data.session_metadata?.session_id;
          if (backendSessionId) {
            console.log(
              `${LOG_PREFIX} [${FILE}] Fetched session ID from /auth/me`
            );
            setSessionId(backendSessionId);
          }
        }
      } catch (error) {
        console.warn(
          `${LOG_PREFIX} [${FILE}] Failed to fetch session ID from /auth/me:`,
          error
        );
      } finally {
        setAttemptedFetch(true);
      }
    };

    fetchSessionId();
  }, [isAuthenticated, sessionId, attemptedFetch]);

  // Use sessionMetadata.backendSessionId if available, otherwise use fetched sessionId
  const activeSessionId = sessionMetadata?.backendSessionId || sessionId;
  const shortSessionId = activeSessionId
    ? `${activeSessionId.slice(0, 8)}...`
    : "none";

  // Debug: Hook init
  console.log(
    `${LOG_PREFIX} [${FILE}] Initializing | Auth: ${isAuthenticated} | Session: ${shortSessionId} ` +
      `| Sync: ${syncIntervalMs}ms | Debounce: ${debounceMs}ms`
  );

  const syncActivityWithBackend = useCallback(async () => {
    if (!isAuthenticated || !activeSessionId) {
      console.log(
        `${LOG_PREFIX} [${FILE}] [sync] Skipped → not auth or no session ID`
      );
      return;
    }

    const now = Date.now();
    const sinceLastSync = now - lastSyncRef.current;
    const activityFlag = hasUserActivityRef.current;

    console.log(
      `${LOG_PREFIX} [${FILE}] [sync] → POST /auth/session/activity ` +
        `| Activity: ${activityFlag} | Since last: ${sinceLastSync}ms | ${getTimestamp()}`
    );

    try {
      const response = await fetch(`${API_URL}/auth/session/activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": activeSessionId,
        },
        credentials: "include",
        body: JSON.stringify({
          activity_detected: activityFlag,
          timestamp: new Date().toISOString(),
          source: "useActivitySync",
        }),
      });

      const responseTime = Date.now() - now;

      if (response.ok) {
        const data = await response.json();
        console.log(
          `${LOG_PREFIX} [${FILE}] [sync] Success (200) in ${responseTime}ms ` +
            `| Extended: ${!!data.session_extended} | Data: ${JSON.stringify(
              data
            ).slice(0, 100)}`
        );

        if (data.session_extended) {
          const raw = sessionStorage.getItem("auth_session");
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              parsed.lastActivityAt = Date.now();
              sessionStorage.setItem("auth_session", JSON.stringify(parsed));
              if (parsed.rememberMe) {
                localStorage.setItem("auth_session", JSON.stringify(parsed));
              }
              console.log(
                `${LOG_PREFIX} [${FILE}] [sync] Local metadata updated`
              );
            } catch (e) {
              console.error(
                `${LOG_PREFIX} [${FILE}] [sync] Failed to update metadata:`,
                e
              );
            }
          }
        }
      } else if (response.status === 401) {
        console.warn(
          `${LOG_PREFIX} [${FILE}] [sync] Failed 401 → Session likely invalidated by backend`
        );
      } else {
        const text = await response.text();
        console.warn(
          `${LOG_PREFIX} [${FILE}] [sync] Failed ${
            response.status
          } | ${text.slice(0, 100)}`
        );
      }

      hasUserActivityRef.current = false;
      lastSyncRef.current = Date.now();
    } catch (error: any) {
      console.error(
        `${LOG_PREFIX} [${FILE}] [sync] Network error:`,
        error.message || error
      );
    }
  }, [isAuthenticated, activeSessionId]);

  const handleActivity = useCallback(() => {
    if (!isAuthenticated) return;

    const now = getTimestamp();
    hasUserActivityRef.current = true;

    console.log(`${LOG_PREFIX} [${FILE}] [activity] Detected at ${now}`);

    // Clear previous debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      console.log(`${LOG_PREFIX} [${FILE}] [activity] Debounce reset`);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      console.log(
        `${LOG_PREFIX} [${FILE}] [activity] Debounce fired → syncing`
      );
      syncActivityWithBackend();
    }, debounceMs);
  }, [isAuthenticated, syncActivityWithBackend, debounceMs]);

  // Main effect: Setup listeners + interval
  useEffect(() => {
    if (!isAuthenticated || !activeSessionId) {
      console.log(
        `${LOG_PREFIX} [${FILE}] [effect] Skipped → not authenticated or no session ID`
      );
      return;
    }

    console.log(
      `${LOG_PREFIX} [${FILE}] [effect] Setting up activity listeners + sync interval ` +
        `| Session: ${shortSessionId}`
    );

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
      console.log(`${LOG_PREFIX} [${FILE}] [listener] Added: ${event}`);
    });

    // Periodic sync (heartbeat)
    const interval = setInterval(() => {
      console.log(
        `${LOG_PREFIX} [${FILE}] [interval] Triggered every ${syncIntervalMs}ms`
      );
      syncActivityWithBackend();
    }, syncIntervalMs);

    // Initial sync
    console.log(
      `${LOG_PREFIX} [${FILE}] [interval] Scheduling first sync in ${syncIntervalMs}ms`
    );
    lastSyncRef.current = Date.now();

    return () => {
      console.log(
        `${LOG_PREFIX} [${FILE}] [cleanup] Removing listeners & interval`
      );

      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
        console.log(`${LOG_PREFIX} [${FILE}] [listener] Removed: ${event}`);
      });

      clearInterval(interval);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
        console.log(`${LOG_PREFIX} [${FILE}] [cleanup] Debounce cleared`);
      }
    };
  }, [
    isAuthenticated,
    activeSessionId,
    handleActivity,
    syncActivityWithBackend,
    syncIntervalMs,
    debounceMs,
  ]);

  return { syncActivityWithBackend };
}
