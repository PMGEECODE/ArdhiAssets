// src/shared/hooks/useSessionMonitorData.ts

"use client";

import { useEffect, useState, useCallback } from "react";
import sessionMonitorService, {
  type UserSession,
} from "../services/sessionMonitorService";

interface UseSessionMonitorDataOptions {
  autoRefreshInterval?: number; // ms, default 60000 (1 min)
  enabled?: boolean;
}

export function useSessionMonitorData({
  autoRefreshInterval = 60000,
  enabled = true,
}: UseSessionMonitorDataOptions = {}) {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchSessions = useCallback(
    async (force = false) => {
      if (!enabled) return;

      setLoading(true);
      setError(null);

      try {
        const data = await sessionMonitorService.getActiveSessions(force);
        setSessions(data);
        setLastRefresh(new Date());
        console.log("[SessionMonitorData] Fetched sessions:", data.length);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to fetch sessions";
        setError(errorMsg);
        console.error("[SessionMonitorData] Error:", err);
      } finally {
        setLoading(false);
      }
    },
    [enabled]
  );

  useEffect(() => {
    // Initial fetch
    fetchSessions();

    // Auto-refresh interval
    const interval = setInterval(() => {
      fetchSessions();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [fetchSessions, autoRefreshInterval]);

  return {
    sessions,
    loading,
    error,
    lastRefresh,
    refetch: () => fetchSessions(true),
  };
}
