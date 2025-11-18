// src/shared/store/cookieAuthStore.ts

import { create } from "zustand";
import axiosInstance from "../../shared/lib/axiosInstance";
import { type User, type LoginCredentials, UserRole } from "../types";
import { API_URL } from "../../shared/config/constants";

interface SessionConfig {
  readonly SESSION_STORAGE_KEY: string;
  readonly REMEMBER_ME_STORAGE_KEY: string;
  readonly TOKEN_ROTATION_INTERVAL_MS: number;
}

interface SessionMetadata {
  sessionId: string;
  createdAt: number;
  lastActivityAt: number;
  rememberMe: boolean;
  deviceFingerprint: string;
  ipAddress?: string;
  userAgent: string;
  backendSessionId?: string;
  sessionTimeoutMinutes: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userPermissions: Record<string, any> | null;
  csrfToken: string | null;
  isLoading: boolean;
  initialized: boolean;
  sessionMetadata: SessionMetadata | null;
  rememberMeEnabled: boolean;
  login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  loadUserPermissions: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  getCsrfToken: () => string | null;
  validateSession: () => Promise<boolean>;
  rotateTokens: () => Promise<boolean>;
  extendSession: () => Promise<void>;
  clearRememberMe: () => void;
  setInitialized: (value: boolean) => void;
  checkAuth: () => Promise<boolean>;
}

const SESSION_CONFIG: SessionConfig = {
  SESSION_STORAGE_KEY: "auth_session",
  REMEMBER_ME_STORAGE_KEY: "remember_me_token",
  TOKEN_ROTATION_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
};

class SessionManager {
  static generateSessionId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  static generateDeviceFingerprint(): string {
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
    };
    return btoa(JSON.stringify(fingerprint));
  }

  static validateDeviceFingerprint(storedFingerprint: string): boolean {
    const current = this.generateDeviceFingerprint();
    const isValid = storedFingerprint === current;
    if (!isValid) {
      console.warn(
        "[SessionManager] Device fingerprint changed - potential device/browser change detected"
      );
    }
    return isValid;
  }

  static createSessionMetadata(
    rememberMe: boolean,
    sessionTimeoutMinutes = 30
  ): SessionMetadata {
    return {
      sessionId: this.generateSessionId(),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      rememberMe,
      deviceFingerprint: this.generateDeviceFingerprint(),
      userAgent: navigator.userAgent,
      sessionTimeoutMinutes,
    };
  }

  static storeSessionMetadata(metadata: SessionMetadata): void {
    sessionStorage.setItem(
      SESSION_CONFIG.SESSION_STORAGE_KEY,
      JSON.stringify(metadata)
    );
    if (metadata.rememberMe) {
      localStorage.setItem(
        SESSION_CONFIG.SESSION_STORAGE_KEY,
        JSON.stringify(metadata)
      );
    } else {
      localStorage.removeItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
    }
  }

  static getSessionMetadata(): SessionMetadata | null {
    let stored = sessionStorage.getItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
    if (!stored) {
      stored = localStorage.getItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
    }
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  static clearSessionData(): void {
    sessionStorage.removeItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
    localStorage.removeItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
  }

  static updateLastActivity(): void {
    const metadata = this.getSessionMetadata();
    if (metadata) {
      const oldActivityTime = metadata.lastActivityAt;
      metadata.lastActivityAt = Date.now();
      this.storeSessionMetadata(metadata);
      if (Date.now() - oldActivityTime > 5000) {
        console.log(
          "[SessionManager] Activity updated (5+ seconds since last update)"
        );
      }
    }
  }

  static getSessionTimeoutMs(metadata: SessionMetadata): number {
    return metadata.sessionTimeoutMinutes * 60 * 1000;
  }

  static isSessionExpired(metadata: SessionMetadata): boolean {
    const inactivity = Date.now() - metadata.lastActivityAt;
    const max = metadata.rememberMe
      ? 24 * 60 * 60 * 1000
      : this.getSessionTimeoutMs(metadata);
    return inactivity > max;
  }
}

export const useCookieAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  userPermissions: null,
  csrfToken: null,
  isLoading: false,
  initialized: false,
  sessionMetadata: null,
  rememberMeEnabled: false,

  login: async (credentials: LoginCredentials, rememberMe = false) => {
    set({ isLoading: true });
    try {
      const sessionMetadata = SessionManager.createSessionMetadata(
        rememberMe,
        0 // placeholder, will be set from backend
      );

      const response = await axiosInstance.post(
        `${API_URL}/auth/login`,
        credentials,
        { withCredentials: true }
      );

      if (response.data.requires2FA) {
        sessionStorage.setItem("twoFAEmail", response.data.email);
        sessionStorage.setItem(
          "temp_session_metadata",
          JSON.stringify(sessionMetadata)
        );
        throw new Error("2FA_REQUIRED");
      }

      // const { user, csrf_token } = response.data;
      const { user, csrf_token, session_metadata } = response.data;

      const isAdmin = user.role === UserRole.ADMIN;

      const backendSessionTimeout = user.session_timeout ?? 30;
      sessionMetadata.sessionTimeoutMinutes = backendSessionTimeout;
      console.log(
        "[Login] Session timeout set to",
        backendSessionTimeout,
        "minutes from backend"
      );

      if (session_metadata?.session_id) {
        sessionMetadata.backendSessionId = session_metadata?.session_id;
        console.log(
          "[AuthStore] Session ID received:",
          session_metadata.session_id
        );
      }

      if (response.data.session_id) {
        sessionMetadata.backendSessionId = response.data.session_id;
        console.log(
          "[Login] Backend session_id received and stored:",
          response.data.session_id
        );
      } else {
        console.warn("[Login] No session_id in backend response");
      }

      // SessionManager.storeSessionMetadata(sessionMetadata);

      set({
        user,
        isAuthenticated: true,
        isAdmin,
        csrfToken: csrf_token,
        isLoading: false,
        sessionMetadata,
        rememberMeEnabled: rememberMe,
        initialized: true,
      });

      SessionManager.storeSessionMetadata(sessionMetadata);

      if (csrf_token) {
        axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
      }

      await get().loadUserPermissions();
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      const { csrfToken, sessionMetadata } = get();

      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }
      if (sessionMetadata?.backendSessionId) {
        headers["X-Session-Id"] = sessionMetadata.backendSessionId;
      }

      await axiosInstance.post(
        `${API_URL}/auth/logout`,
        {},
        { withCredentials: true, headers }
      );
    } catch {
      // Continue with frontend logout even if backend call fails
    }

    sessionStorage.removeItem("auth_session");
    localStorage.setItem("SESSION_INVALIDATED", "1");
    setTimeout(() => localStorage.removeItem("SESSION_INVALIDATED"), 100);

    sessionStorage.setItem("LOGGED_OUT", "1");

    SessionManager.clearSessionData();
    delete axiosInstance.defaults.headers.common["X-CSRF-Token"];

    set({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      csrfToken: null,
      userPermissions: null,
      sessionMetadata: null,
      initialized: true,
    });

    window.location.href = "/login";
  },

  validateSession: async () => {
    const metadata = SessionManager.getSessionMetadata();

    if (!metadata) {
      return true;
    }

    if (SessionManager.isSessionExpired(metadata)) {
      await get().logout();
      return false;
    }

    return true;
  },

  rotateTokens: async () => {
    try {
      const isValid = await get().validateSession();
      if (!isValid) {
        return false;
      }

      const response = await axiosInstance.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const { csrf_token } = response.data;

      set({ csrfToken: csrf_token });
      if (csrf_token) {
        axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
      }

      SessionManager.updateLastActivity();
      return true;
    } catch {
      return false;
    }
  },

  extendSession: async () => {
    const metadata = SessionManager.getSessionMetadata();
    if (metadata && metadata.rememberMe) {
      metadata.lastActivityAt = Date.now();
      SessionManager.storeSessionMetadata(metadata);
      set({ sessionMetadata: metadata });
    }
  },

  clearRememberMe: () => {
    sessionStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
    set({ rememberMeEnabled: false });
  },

  checkAuthStatus: async () => {
    if (sessionStorage.getItem("LOGGED_OUT") === "1") {
      return false;
    }

    set({ isLoading: true });

    const clearSession = () => {
      delete axiosInstance.defaults.headers.common["X-CSRF-Token"];
      SessionManager.clearSessionData();
      sessionStorage.removeItem("LOGGED_OUT");
      set({
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        userPermissions: null,
        csrfToken: null,
        sessionMetadata: null,
        rememberMeEnabled: false,
        isLoading: false,
        initialized: true,
      });
    };

    try {
      const validSession = await get().validateSession();
      if (!validSession) {
        clearSession();
        return false;
      }
    } catch {
      clearSession();
      return false;
    }

    try {
      const response = await axiosInstance.get(`${API_URL}/auth/me`, {
        withCredentials: true,
      });

      const user = response.data;
      const isAdmin = user?.role === UserRole.ADMIN;

      const metadata = SessionManager.getSessionMetadata();
      if (metadata && user.session_timeout) {
        metadata.sessionTimeoutMinutes = user.session_timeout ?? 30;
        SessionManager.storeSessionMetadata(metadata);
        console.log(
          "[checkAuthStatus] Updated session timeout to",
          metadata.sessionTimeoutMinutes,
          "minutes"
        );
      }

      set({
        user,
        isAuthenticated: true,
        isAdmin,
        isLoading: false,
        initialized: true,
        sessionMetadata: metadata,
      });

      if (user?.csrf_token) {
        axiosInstance.defaults.headers.common["X-CSRF-Token"] = user.csrf_token;
        set({ csrfToken: user.csrf_token });
      }

      SessionManager.updateLastActivity();
      await get().loadUserPermissions();
      return true;
    } catch (error: any) {
      if (
        error?.response?.status === 401 &&
        !sessionStorage.getItem("LOGGED_OUT")
      ) {
        const refreshed = await get().refreshToken();
        if (refreshed) {
          try {
            const response = await axiosInstance.get(`${API_URL}/auth/me`, {
              withCredentials: true,
            });

            const user = response.data;
            const isAdmin = user?.role === UserRole.ADMIN;

            const metadata = SessionManager.getSessionMetadata();
            if (metadata && user.session_timeout) {
              metadata.sessionTimeoutMinutes = user.session_timeout ?? 30;
              SessionManager.storeSessionMetadata(metadata);
              console.log(
                "[checkAuthStatus-refresh] Updated session timeout to",
                metadata.sessionTimeoutMinutes,
                "minutes"
              );
            }

            set({
              user,
              isAuthenticated: true,
              isAdmin,
              isLoading: false,
              initialized: true,
              sessionMetadata: metadata,
            });

            SessionManager.updateLastActivity();
            await get().loadUserPermissions();
            return true;
          } catch {
            clearSession();
            return false;
          }
        }
      }

      clearSession();
      return false;
    }
  },

  refreshToken: async () => {
    try {
      // Step 1: Refresh access token
      const refreshResponse = await axiosInstance.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const { csrf_token } = refreshResponse.data;

      set({ csrfToken: csrf_token });
      if (csrf_token) {
        axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
      }

      SessionManager.updateLastActivity();

      // Step 2: CRITICAL — Validate session against backend
      const sessionMetadata = SessionManager.getSessionMetadata();
      if (!sessionMetadata?.backendSessionId) {
        console.warn("No backend session ID, skipping validation");
        // Optionally fallback to /auth/me
      } else {
        try {
          const validateResponse = await axiosInstance.post(
            `${API_URL}/sessions/validate`,
            {},
            {
              headers: { "X-Session-Id": sessionMetadata.backendSessionId },
              withCredentials: true,
            }
          );

          const { is_valid, is_expired, requires_logout } =
            validateResponse.data;

          if (!is_valid || is_expired || requires_logout) {
            console.log(
              "[refreshToken] Backend session invalid → forcing logout"
            );
            await get().logout();
            return false;
          }
        } catch (err: any) {
          if (err.response?.status === 401) {
            console.log("[refreshToken] Session validation failed → logout");
            await get().logout();
            return false;
          }
          // Non-401 errors: continue (don't block refresh)
        }
      }

      // Step 3: Load user data
      const userResponse = await axiosInstance.get(`${API_URL}/auth/me`, {
        withCredentials: true,
      });
      const user = userResponse.data;
      const isAdmin = user?.role === UserRole.ADMIN;

      set({
        user,
        isAuthenticated: true,
        isAdmin,
        initialized: true,
      });

      await get().loadUserPermissions();
      return true;
    } catch (error) {
      console.error("[refreshToken] Failed:", error);
      return false;
    }
  },

  loadUserPermissions: async () => {
    try {
      const { csrfToken } = get();
      const response = await axiosInstance.get(`${API_URL}/permissions/me`, {
        withCredentials: true,
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      });
      set({ userPermissions: response.data.permissions });
    } catch {
      // set({ userPermissions: null });
    }
  },

  getCsrfToken: () => {
    return get().csrfToken;
  },

  setInitialized: (value: boolean) => {
    set({ initialized: value });
  },

  checkAuth: async () => {
    try {
      if (sessionStorage.getItem("LOGGED_OUT") === "1") {
        return false;
      }

      set({ isLoading: true });

      const clearSession = () => {
        delete axiosInstance.defaults.headers.common["X-CSRF-Token"];
        SessionManager.clearSessionData();
        sessionStorage.removeItem("LOGGED_OUT");
        set({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          userPermissions: null,
          csrfToken: null,
          sessionMetadata: null,
          rememberMeEnabled: false,
          isLoading: false,
          initialized: true,
        });
      };

      try {
        const validSession = await get().validateSession();
        if (!validSession) {
          clearSession();
          return false;
        }
      } catch {
        clearSession();
        return false;
      }

      try {
        const response = await axiosInstance.get(`${API_URL}/auth/me`, {
          withCredentials: true,
        });

        const user = response.data;
        const isAdmin = user?.role === UserRole.ADMIN;

        const metadata = SessionManager.getSessionMetadata();
        if (metadata && user.session_timeout) {
          metadata.sessionTimeoutMinutes = user.session_timeout ?? 30;
          SessionManager.storeSessionMetadata(metadata);
        }

        set({
          user,
          isAuthenticated: true,
          isAdmin,
          isLoading: false,
          initialized: true,
          sessionMetadata: metadata,
        });

        if (user?.csrf_token) {
          axiosInstance.defaults.headers.common["X-CSRF-Token"] =
            user.csrf_token;
          set({ csrfToken: user.csrf_token });
        }

        SessionManager.updateLastActivity();
        await get().loadUserPermissions();
        return true;
      } catch (error: any) {
        if (error?.response?.status === 401) {
          if (!sessionStorage.getItem("LOGGED_OUT")) {
            const refreshed = await get().refreshToken();
            if (refreshed) {
              try {
                const response = await axiosInstance.get(`${API_URL}/auth/me`, {
                  withCredentials: true,
                });

                const user = response.data;
                const isAdmin = user?.role === UserRole.ADMIN;

                const metadata = SessionManager.getSessionMetadata();
                if (metadata && user.session_timeout) {
                  metadata.sessionTimeoutMinutes = user.session_timeout ?? 30;
                  SessionManager.storeSessionMetadata(metadata);
                }

                set({
                  user,
                  isAuthenticated: true,
                  isAdmin,
                  isLoading: false,
                  initialized: true,
                  sessionMetadata: metadata,
                });

                SessionManager.updateLastActivity();
                await get().loadUserPermissions();
                return true;
              } catch {
                clearSession();
                return false;
              }
            }
          }
        }

        clearSession();
        return false;
      }
    } catch {
      return false;
    }
  },
}));

export const verify2FA = async (email: string, code: string) => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/auth/2fa/verify`,
      { email, code },
      { withCredentials: true }
    );

    const { user, csrf_token } = response.data;
    const isAdmin = user?.role === UserRole.ADMIN;

    const tempMetadata = sessionStorage.getItem("temp_session_metadata");
    let sessionMetadata;
    if (tempMetadata) {
      sessionMetadata = JSON.parse(tempMetadata);
    } else {
      sessionMetadata = SessionManager.createSessionMetadata(false, 0);
    }

    const backendSessionTimeout = user.session_timeout ?? 30;
    sessionMetadata.sessionTimeoutMinutes = backendSessionTimeout;
    console.log(
      "[verify2FA] Session timeout set to",
      backendSessionTimeout,
      "minutes from backend"
    );

    SessionManager.storeSessionMetadata(sessionMetadata);
    useCookieAuthStore.setState({
      user,
      isAuthenticated: true,
      isAdmin,
      csrfToken: csrf_token,
      sessionMetadata,
      rememberMeEnabled: sessionMetadata.rememberMe,
      initialized: true,
    });

    if (csrf_token) {
      axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
    }

    sessionStorage.removeItem("temp_session_metadata");
    await useCookieAuthStore.getState().loadUserPermissions();

    return { user, success: true };
  } catch (error: any) {
    throw error;
  }
};

// Token refresh queue
const isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

// Axios interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    SessionManager.updateLastActivity();
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        error.response?.data?.message?.includes("session") ||
        error.response?.data?.message?.includes("expired")
      ) {
        console.log(
          "[AxiosInterceptor] Backend session expired - forcing logout"
        );
        await useCookieAuthStore.getState().logout();
        return Promise.reject(error);
      }

      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Activity listeners
["mousemove", "keypress", "click", "scroll", "touchstart"].forEach((event) => {
  document.addEventListener(
    event,
    () => {
      SessionManager.updateLastActivity();
    },
    { passive: true }
  );
});
