// import axiosInstance from "../lib/axiosInstance";
// import { useCookieAuthStore } from "../../shared/store/cookieAuthStore";

// export interface UserSession {
//   id: string;
//   userId: string;
//   username: string;
//   email: string;
//   loginTime: string;
//   lastActivityTime: string;
//   expiryTime: string;
//   status: "active" | "idle" | "expired";
//   ipAddress: string;
//   userAgent: string;
//   isCurrentSession: boolean;
// }

// interface AuthMeResponse {
//   id: string;
//   username: string;
//   email: string;
//   role: string;
//   is_active: boolean;
//   session_timeout: number;
//   session_metadata: {
//     session_id: string;
//     expires_at: string;
//     device_name: string;
//     last_activity: string;
//   };
// }

// interface BackendSession {
//   id: string;
//   userId: string;
//   username: string;
//   email: string;
//   deviceName: string;
//   ipAddress: string;
//   userAgent: string;
//   createdAt: string;
//   expiresAt: string;
//   isActive: boolean;
//   deviceId: string;
// }

// interface SessionMonitorResponse {
//   sessions: UserSession[];
//   totalActiveSessions: number;
// }

// class SessionMonitorService {
//   private cacheTimeout = 30_000;
//   private lastFetchTime = 0;
//   private cachedData: SessionMonitorResponse | null = null;
//   private currentSessionId: string | null = null;
//   private sessionExpiryTime: number | null = null;
//   private sessionRefreshTimer: NodeJS.Timeout | null = null;

//   private async initCurrentSessionId(): Promise<void> {
//     if (this.currentSessionId) return;

//     try {
//       const resp = await axiosInstance.get<{ id: string }>(
//         "/auth/sessions/current"
//       );
//       this.currentSessionId = resp.data.id;
//     } catch (err: any) {
//       if (err.response?.status === 404 || err.response?.status === 401) {
//         this.currentSessionId = null;
//       }
//     }
//   }

//   private mapBackendSession(
//     backend: BackendSession,
//     isCurrent: boolean
//   ): UserSession {
//     const now = Date.now();
//     const expires = new Date(backend.expiresAt).getTime();
//     const isExpired = expires <= now;
//     const isInactive = !backend.isActive;

//     return {
//       id: backend.id,
//       userId: backend.userId,
//       username: backend.username || "Unknown",
//       email: backend.email,
//       loginTime: backend.createdAt,
//       lastActivityTime: backend.createdAt,
//       expiryTime: backend.expiresAt,
//       status: isExpired ? "expired" : isInactive ? "expired" : "active",
//       ipAddress: backend.ipAddress,
//       userAgent: `${backend.deviceName || "Unknown"}`,
//       isCurrentSession: isCurrent,
//     };
//   }

//   async refreshSessionFromAuthMe(): Promise<boolean> {
//     try {
//       const resp = await axiosInstance.get<AuthMeResponse>("/auth/me");
//       const user = resp.data;

//       if (!user.is_active) {
//         this.triggerLogout();
//         return false;
//       }

//       const expiresAt = new Date(user.session_metadata.expires_at).getTime();
//       const now = Date.now();
//       const timeUntilExpiry = expiresAt - now;
//       const bufferMs = 60 * 1000;

//       this.sessionExpiryTime = expiresAt;

//       if (timeUntilExpiry <= bufferMs) {
//         this.triggerLogout();
//         return false;
//       }

//       this.scheduleNextRefresh(user.session_timeout);

//       return true;
//     } catch (err: any) {
//       if (err.response?.status === 401 || err.response?.status === 403) {
//         this.triggerLogout();
//       }
//       return false;
//     }
//   }

//   private scheduleNextRefresh(sessionTimeoutMinutes: number): void {
//     if (this.sessionRefreshTimer) {
//       clearTimeout(this.sessionRefreshTimer);
//     }

//     const refreshIntervalMs = sessionTimeoutMinutes * 60 * 1000 * 0.7;

//     this.sessionRefreshTimer = setTimeout(() => {
//       this.refreshSessionFromAuthMe();
//     }, refreshIntervalMs);
//   }

//   async getActiveSessions(forceRefresh = false): Promise<UserSession[]> {
//     await this.initCurrentSessionId();

//     const now = Date.now();

//     if (
//       !forceRefresh &&
//       this.cachedData &&
//       now - this.lastFetchTime < this.cacheTimeout
//     ) {
//       this.checkAndLogoutIfInvalid(this.cachedData.sessions);
//       return this.cachedData.sessions;
//     }

//     try {
//       const resp = await axiosInstance.get<{
//         sessions: BackendSession[];
//         total_active_sessions: number;
//       }>("/auth/sessions/active");

//       const sessions = resp.data.sessions.map((s) =>
//         this.mapBackendSession(s, s.id === this.currentSessionId)
//       );

//       this.cachedData = {
//         sessions,
//         totalActiveSessions: resp.data.total_active_sessions,
//       };
//       this.lastFetchTime = now;

//       this.checkAndLogoutIfInvalid(sessions);

//       return sessions;
//     } catch (err: any) {
//       return this.cachedData?.sessions || [];
//     }
//   }

//   async getCurrentSessionDetails(): Promise<UserSession | null> {
//     try {
//       const resp = await axiosInstance.get<BackendSession>(
//         "/auth/sessions/current"
//       );
//       this.currentSessionId = resp.data.id;

//       const ui = this.mapBackendSession(resp.data, true);

//       const expiresAt = new Date(resp.data.expiresAt).getTime();
//       const bufferMs = 30 * 1000;
//       const isExpired = expiresAt - bufferMs <= Date.now();

//       if (!resp.data.isActive || isExpired) {
//         this.triggerLogout();
//       }

//       return ui;
//     } catch (err: any) {
//       if (err.response?.status === 404 || err.response?.status === 401) {
//         this.triggerLogout();
//       }
//       return null;
//     }
//   }

//   private checkAndLogoutIfInvalid(sessions: UserSession[]) {
//     const current = sessions.find((s) => s.isCurrentSession);
//     if (!current) {
//       this.triggerLogout();
//       return;
//     }

//     if (current.status === "expired") {
//       this.triggerLogout();
//     }
//   }

//   private triggerLogout() {
//     const { logout } = useCookieAuthStore.getState();
//     if (typeof logout === "function") {
//       logout();
//     }
//   }

//   clearTimers(): void {
//     if (this.sessionRefreshTimer) {
//       clearTimeout(this.sessionRefreshTimer);
//       this.sessionRefreshTimer = null;
//     }
//   }

//   async terminateSession(sessionId: string): Promise<boolean> {
//     try {
//       await axiosInstance.post(`/auth/sessions/${sessionId}/terminate`);
//       this.cachedData = null;
//       return true;
//     } catch (err: any) {
//       return false;
//     }
//   }

//   clearCache(): void {
//     this.cachedData = null;
//     this.lastFetchTime = 0;
//     this.clearTimers();
//   }
// }

// export default new SessionMonitorService();


// src/shared/services/sessionMonitorService.ts
import axiosInstance from "../lib/axiosInstance";
import { useCookieAuthStore } from "../../shared/store/cookieAuthStore";

export interface UserSession {
  id: string;
  userId: string;
  username: string;
  email: string;
  loginTime: string;
  lastActivityTime: string;
  expiryTime: string;
  status: "active" | "idle" | "expired";
  ipAddress: string;
  userAgent: string;
  isCurrentSession: boolean;
}

interface AuthMeResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  session_timeout: number; // minutes
  session_metadata: {
    session_id: string;
    expires_at: string;
    device_name: string;
    last_activity: string;
  };
}

interface BackendSession {
  id: string;
  userId: string;
  username: string;
  email: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  deviceId: string;
}

interface SessionMonitorResponse {
  sessions: UserSession[];
  totalActiveSessions: number;
}

const pretty = (obj: any) =>
  process.env.NODE_ENV === "development" ? JSON.stringify(obj, null, 2) : "";

class SessionMonitorService {
  private cacheTimeout = 30_000;
  private lastFetchTime = 0;
  private cachedData: SessionMonitorResponse | null = null;
  private currentSessionId: string | null = null;
  private sessionExpiryTime: number | null = null;
  private sessionRefreshTimer: NodeJS.Timeout | null = null;

  private async initCurrentSessionId(): Promise<void> {
    if (this.currentSessionId) return;

    try {
      console.info("[SessionMonitor] Fetching current session ID …");
      const resp = await axiosInstance.get<{ id: string }>(
        "/auth/sessions/current"
      );
      this.currentSessionId = resp.data.id;
      console.info(
        "[SessionMonitor] Current session ID set:",
        this.currentSessionId
      );
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 401) {
        console.info("[SessionMonitor] No active session (expected)");
        this.currentSessionId = null;
      } else {
        console.warn("[SessionMonitor] Failed to get current session ID:", err);
      }
    }
  }

  private mapBackendSession(
    backend: BackendSession,
    isCurrent: boolean
  ): UserSession {
    const now = Date.now();
    const expires = new Date(backend.expiresAt).getTime();
    const isExpired = expires <= now;
    const isInactive = !backend.isActive;

    return {
      id: backend.id,
      userId: backend.userId,
      username: backend.username || "Unknown",
      email: backend.email,
      loginTime: backend.createdAt,
      lastActivityTime: backend.createdAt,
      expiryTime: backend.expiresAt,
      status: isExpired ? "expired" : isInactive ? "expired" : "active",
      ipAddress: backend.ipAddress,
      userAgent: `${backend.deviceName || "Unknown"}`,
      isCurrentSession: isCurrent,
    };
  }

  async refreshSessionFromAuthMe(): Promise<boolean> {
    console.info("[SessionMonitor] Refreshing session from /auth/me …");
    try {
      const resp = await axiosInstance.get<AuthMeResponse>("/auth/me");
      const user = resp.data;

      if (!user.is_active) {
        console.warn("[SessionMonitor] User is inactive → logout");
        this.triggerLogout();
        return false;
      }

      // Extract expiry time from session_metadata
      const expiresAt = new Date(user.session_metadata.expires_at).getTime();
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const bufferMs = 60 * 1000; // 1 minute buffer before actual expiry

      console.info(
        `[SessionMonitor] Session expires in ${Math.round(timeUntilExpiry / 1000)}s (${user.session_timeout} min timeout)`
      );

      this.sessionExpiryTime = expiresAt;

      // If session is expired or about to expire, trigger logout
      if (timeUntilExpiry <= bufferMs) {
        console.warn(
          `[SessionMonitor] Session expiring soon (${Math.round(timeUntilExpiry / 1000)}s) → logout`
        );
        this.triggerLogout();
        return false;
      }

      // Schedule next refresh at 70% of session timeout
      this.scheduleNextRefresh(user.session_timeout);

      return true;
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.warn("[SessionMonitor] Auth failed (401/403) → logout");
        this.triggerLogout();
      } else {
        console.warn("[SessionMonitor] Error refreshing session:", err.message);
      }
      return false;
    }
  }

  private scheduleNextRefresh(sessionTimeoutMinutes: number): void {
    // Clear existing timer
    if (this.sessionRefreshTimer) {
      clearTimeout(this.sessionRefreshTimer);
    }

    // Schedule refresh at 70% of session timeout (e.g., 21 mins for 30 min session)
    const refreshIntervalMs = sessionTimeoutMinutes * 60 * 1000 * 0.7;
    console.info(
      `[SessionMonitor] Next refresh scheduled in ${Math.round(refreshIntervalMs / 1000)}s`
    );

    this.sessionRefreshTimer = setTimeout(() => {
      this.refreshSessionFromAuthMe();
    }, refreshIntervalMs);
  }

  /** --------------------------------------------------------------
   *  PUBLIC – get active sessions + detect expired/invalid sessions
   *  -------------------------------------------------------------- */
  async getActiveSessions(forceRefresh = false): Promise<UserSession[]> {
    await this.initCurrentSessionId();

    const now = Date.now();

    // Cache hit
    if (
      !forceRefresh &&
      this.cachedData &&
      now - this.lastFetchTime < this.cacheTimeout
    ) {
      console.info(
        `[SessionMonitor] Cache hit – ${this.cachedData.sessions.length} session(s)`
      );
      this.checkAndLogoutIfInvalid(this.cachedData.sessions);
      return this.cachedData.sessions;
    }

    console.info("[SessionMonitor] Fetching active sessions from backend …");
    try {
      const resp = await axiosInstance.get<{
        sessions: BackendSession[];
        total_active_sessions: number;
      }>("/auth/sessions/active");

      const sessions = resp.data.sessions.map((s) =>
        this.mapBackendSession(s, s.id === this.currentSessionId)
      );

      this.cachedData = {
        sessions,
        totalActiveSessions: resp.data.total_active_sessions,
      };
      this.lastFetchTime = now;

      console.info(
        `[SessionMonitor] Received ${sessions.length} active session(s)`
      );

      // CRITICAL: Check if current session is dead
      this.checkAndLogoutIfInvalid(sessions);

      return sessions;
    } catch (err: any) {
      console.warn("[SessionMonitor] Failed to fetch sessions:", err);
      return this.cachedData?.sessions || [];
    }
  }

  /** --------------------------------------------------------------
   *  PUBLIC – current session details (using /auth/me)
   *  -------------------------------------------------------------- */
  async getCurrentSessionDetails(): Promise<UserSession | null> {
    console.info("[SessionMonitor] Requesting current session details …");
    try {
      const resp = await axiosInstance.get<BackendSession>(
        "/auth/sessions/current"
      );
      this.currentSessionId = resp.data.id;

      const ui = this.mapBackendSession(resp.data, true);
      console.info("[SessionMonitor] Current session:", pretty(ui));

      const expiresAt = new Date(resp.data.expiresAt).getTime();
      const bufferMs = 30 * 1000; // 30 second grace period
      const isExpired = expiresAt - bufferMs <= Date.now();

      if (!resp.data.isActive || isExpired) {
        console.warn(
          "[SessionMonitor] Current session is expired or inactive → forcing logout"
        );
        this.triggerLogout();
      }

      return ui;
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 401) {
        console.info("[SessionMonitor] No current session → logout");
        this.triggerLogout();
      } else {
        console.warn("[SessionMonitor] Error fetching current session:", err);
      }
      return null;
    }
  }

  /** --------------------------------------------------------------
   *  PRIVATE – Check sessions and trigger logout if needed
   *  -------------------------------------------------------------- */
  private checkAndLogoutIfInvalid(sessions: UserSession[]) {
    const current = sessions.find((s) => s.isCurrentSession);
    if (!current) {
      console.warn(
        "[SessionMonitor] Current session missing from active list → logout"
      );
      this.triggerLogout();
      return;
    }

    if (current.status === "expired") {
      console.warn("[SessionMonitor] Current session expired → logout");
      this.triggerLogout();
    }
  }

  private triggerLogout() {
    const { logout } = useCookieAuthStore.getState();
    // Avoid infinite loops
    if (typeof logout === "function") {
      logout();
    }
  }

  clearTimers(): void {
    if (this.sessionRefreshTimer) {
      clearTimeout(this.sessionRefreshTimer);
      this.sessionRefreshTimer = null;
    }
  }

  async terminateSession(sessionId: string): Promise<boolean> {
    console.info(`[SessionMonitor] Terminating session ${sessionId} …`);
    try {
      const response = await axiosInstance.post(
        `/auth/sessions/${sessionId}/terminate`
      );
      console.info(
        `[SessionMonitor] Session ${sessionId} terminated:`,
        response.data
      );
      this.cachedData = null;
      this.lastFetchTime = 0;
      console.info(`[SessionMonitor] Cache cleared after session termination`);
      return true;
    } catch (err: any) {
      console.warn(
        `[SessionMonitor] Failed to terminate session ${sessionId}:`,
        err.response?.data || err.message
      );
      return false;
    }
  }

  clearCache(): void {
    console.info("[SessionMonitor] Cache cleared");
    this.cachedData = null;
    this.lastFetchTime = 0;
    this.clearTimers();
  }
}

export default new SessionMonitorService();
