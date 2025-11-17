// src/shared/hooks/useActivityTracker.ts
import { useEffect } from "react";
import { useCookieAuthStore } from "../store/cookieAuthStore";

let lastUpdate = 0;
let timeoutId: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 1000;

function updateLastActivity() {
  const now = Date.now();
  if (now - lastUpdate < DEBOUNCE_MS) return;
  lastUpdate = now;

  const stored = sessionStorage.getItem("auth_session");
  if (!stored) return;

  let metadata;
  try {
    metadata = JSON.parse(stored);
  } catch {
    return;
  }

  metadata.lastActivityAt = now;
  sessionStorage.setItem("auth_session", JSON.stringify(metadata));
  if (metadata.rememberMe) {
    localStorage.setItem("auth_session", JSON.stringify(metadata));
  }
}

export function useActivityTracker() {
  const { isAuthenticated } = useCookieAuthStore();

  useEffect(() => {
    // Only start tracking when user is authenticated
    if (!isAuthenticated) {
      if (timeoutId) clearTimeout(timeoutId);
      return;
    }

    const handleActivity = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(updateLastActivity, DEBOUNCE_MS);
    };

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "keydown",
      "click",
      "scroll",
      "touchstart",
      "touchmove",
    ] as const;

    events.forEach((ev) =>
      document.addEventListener(ev, handleActivity, { passive: true })
    );

    // Initial update on mount (in case user is idle but tab is open)
    updateLastActivity();

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handleActivity));
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated]); // ← Critical: re-run when auth changes
}
