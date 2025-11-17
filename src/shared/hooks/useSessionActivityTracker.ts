/**
 * New hook to track user activity and extend session
 *
 * Listens for user activity (mouse, keyboard, touch) and extends
 * session when user is actively using the app.
 */

import { useEffect, useRef, useCallback } from "react";
import axios from "axios";

const ACTIVITY_TIMEOUT = 30000; // Wait 30 seconds between extension requests
const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

export function useSessionActivityTracker() {
  const lastActivityRef = useRef<number>(Date.now());
  const extensionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const recordActivity = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // Only extend session if enough time has passed since last extension
    if (timeSinceLastActivity > ACTIVITY_TIMEOUT) {
      lastActivityRef.current = now;

      try {
        const sessionId = sessionStorage.getItem("sessionId");
        if (!sessionId) return;

        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/sessions/extend`,
          {
            activity_detected: true,
            reason: "User activity detected",
          },
          {
            headers: {
              "X-Session-Id": sessionId,
            },
            withCredentials: true,
          }
        );

        console.log("[v0] Session extended due to activity:", response.data);
      } catch (error) {
        console.error("[v0] Failed to extend session on activity:", error);
      }
    }
  }, []);

  useEffect(() => {
    // Add event listeners for activity tracking
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, recordActivity, true);
    });

    return () => {
      // Clean up event listeners
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, recordActivity, true);
      });

      if (extensionTimeoutRef.current) {
        clearTimeout(extensionTimeoutRef.current);
      }
    };
  }, [recordActivity]);

  return {
    recordActivity,
  };
}
