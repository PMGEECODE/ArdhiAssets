// // // // src/shared/store/cookieAuthStore.ts

// // // import { create } from "zustand";
// // // import axiosInstance from "../../shared/lib/axiosInstance";
// // // import { type User, type LoginCredentials, UserRole } from "../types";
// // // import { API_URL } from "../config/constants";

// // // interface SessionConfig {
// // //   readonly SESSION_STORAGE_KEY: string;
// // //   readonly REMEMBER_ME_STORAGE_KEY: string;
// // //   readonly TOKEN_ROTATION_INTERVAL_MS: number;
// // // }

// // // interface SessionMetadata {
// // //   sessionId: string;
// // //   createdAt: number;
// // //   lastActivityAt: number;
// // //   rememberMe: boolean;
// // //   deviceFingerprint: string;
// // //   ipAddress?: string;
// // //   userAgent: string;
// // //   backendSessionId?: string;
// // //   sessionTimeoutMinutes: number;
// // // }

// // // interface AuthState {
// // //   user: User | null;
// // //   isAuthenticated: boolean;
// // //   isAdmin: boolean;
// // //   userPermissions: Record<string, any> | null;
// // //   csrfToken: string | null;
// // //   isLoading: boolean;
// // //   initialized: boolean;
// // //   sessionMetadata: SessionMetadata | null;
// // //   rememberMeEnabled: boolean;
// // //   login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
// // //   logout: () => Promise<void>;
// // //   checkAuthStatus: () => Promise<boolean>;
// // //   loadUserPermissions: () => Promise<void>;
// // //   refreshToken: () => Promise<boolean>;
// // //   getCsrfToken: () => string | null;
// // //   validateSession: () => Promise<boolean>;
// // //   rotateTokens: () => Promise<boolean>;
// // //   extendSession: () => Promise<void>;
// // //   clearRememberMe: () => void;
// // //   setInitialized: (value: boolean) => void;
// // //   checkAuth: () => Promise<boolean>;
// // // }

// // // const SESSION_CONFIG: SessionConfig = {
// // //   SESSION_STORAGE_KEY: "auth_session",
// // //   REMEMBER_ME_STORAGE_KEY: "remember_me_token",
// // //   TOKEN_ROTATION_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
// // // };

// // // class SessionManager {
// // //   static generateSessionId(): string {
// // //     const array = new Uint8Array(32);
// // //     crypto.getRandomValues(array);
// // //     return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
// // //       ""
// // //     );
// // //   }

// // //   static generateDeviceFingerprint(): string {
// // //     const fingerprint = {
// // //       userAgent: navigator.userAgent,
// // //       language: navigator.language,
// // //       platform: navigator.platform,
// // //       hardwareConcurrency: navigator.hardwareConcurrency,
// // //       deviceMemory: (navigator as any).deviceMemory,
// // //       maxTouchPoints: navigator.maxTouchPoints,
// // //     };
// // //     return btoa(JSON.stringify(fingerprint));
// // //   }

// // //   static validateDeviceFingerprint(storedFingerprint: string): boolean {
// // //     const current = this.generateDeviceFingerprint();
// // //     return storedFingerprint === current;
// // //   }

// // //   static createSessionMetadata(
// // //     rememberMe: boolean,
// // //     sessionTimeoutMinutes = 30
// // //   ): SessionMetadata {
// // //     return {
// // //       sessionId: this.generateSessionId(),
// // //       createdAt: Date.now(),
// // //       lastActivityAt: Date.now(),
// // //       rememberMe,
// // //       deviceFingerprint: this.generateDeviceFingerprint(),
// // //       userAgent: navigator.userAgent,
// // //       sessionTimeoutMinutes,
// // //     };
// // //   }

// // //   static storeSessionMetadata(metadata: SessionMetadata): void {
// // //     sessionStorage.setItem(
// // //       SESSION_CONFIG.SESSION_STORAGE_KEY,
// // //       JSON.stringify(metadata)
// // //     );
// // //     if (metadata.rememberMe) {
// // //       localStorage.setItem(
// // //         SESSION_CONFIG.SESSION_STORAGE_KEY,
// // //         JSON.stringify(metadata)
// // //       );
// // //     }
// // //   }

// // //   static getSessionMetadata(): SessionMetadata | null {
// // //     let stored = sessionStorage.getItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
// // //     if (!stored) {
// // //       stored = localStorage.getItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
// // //     }
// // //     if (stored) {
// // //       try {
// // //         return JSON.parse(stored);
// // //       } catch {
// // //         return null;
// // //       }
// // //     }
// // //     return null;
// // //   }

// // //   static clearSessionData(): void {
// // //     sessionStorage.removeItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
// // //     sessionStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
// // //     localStorage.removeItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
// // //     localStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
// // //   }

// // //   static updateLastActivity(): void {
// // //     const metadata = this.getSessionMetadata();
// // //     if (metadata) {
// // //       metadata.lastActivityAt = Date.now();
// // //       this.storeSessionMetadata(metadata);
// // //     }
// // //   }

// // //   static getSessionTimeoutMs(metadata: SessionMetadata): number {
// // //     return metadata.sessionTimeoutMinutes * 60 * 1000;
// // //   }

// // //   static isSessionExpired(metadata: SessionMetadata): boolean {
// // //     const inactivity = Date.now() - metadata.lastActivityAt;
// // //     const max = metadata.rememberMe
// // //       ? 24 * 60 * 60 * 1000
// // //       : this.getSessionTimeoutMs(metadata);
// // //     return inactivity > max;
// // //   }
// // // }

// // // export const useCookieAuthStore = create<AuthState>()((set, get) => ({
// // //   user: null,
// // //   isAuthenticated: false,
// // //   isAdmin: false,
// // //   userPermissions: null,
// // //   csrfToken: null,
// // //   isLoading: false,
// // //   initialized: false,
// // //   sessionMetadata: null,
// // //   rememberMeEnabled: false,

// // //   login: async (credentials: LoginCredentials, rememberMe = false) => {
// // //     set({ isLoading: true });
// // //     try {
// // //       const sessionMetadata = SessionManager.createSessionMetadata(
// // //         rememberMe,
// // //         30
// // //       );

// // //       const response = await axiosInstance.post(
// // //         `${API_URL}/auth/login`,
// // //         credentials,
// // //         { withCredentials: true }
// // //       );

// // //       if (response.data.requires2FA) {
// // //         sessionStorage.setItem("twoFAEmail", response.data.email);
// // //         sessionStorage.setItem(
// // //           "temp_session_metadata",
// // //           JSON.stringify(sessionMetadata)
// // //         );
// // //         throw new Error("2FA_REQUIRED");
// // //       }

// // //       const { user, csrf_token } = response.data;
// // //       const isAdmin = user.role === UserRole.ADMIN;

// // //       const backendSessionTimeout = user.session_timeout || 30;
// // //       sessionMetadata.sessionTimeoutMinutes = backendSessionTimeout;

// // //       if (response.data.session_id) {
// // //         sessionMetadata.backendSessionId = response.data.session_id;
// // //       }

// // //       SessionManager.storeSessionMetadata(sessionMetadata);

// // //       set({
// // //         user,
// // //         isAuthenticated: true,
// // //         isAdmin,
// // //         csrfToken: csrf_token,
// // //         isLoading: false,
// // //         sessionMetadata,
// // //         rememberMeEnabled: rememberMe,
// // //         initialized: true,
// // //       });

// // //       if (csrf_token) {
// // //         axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
// // //       }

// // //       await get().loadUserPermissions();
// // //     } catch (error: any) {
// // //       set({ isLoading: false });
// // //       throw error;
// // //     }
// // //   },

// // //   logout: async () => {
// // //     try {
// // //       const { csrfToken, sessionMetadata } = get();

// // //       const headers: Record<string, string> = {};
// // //       if (csrfToken) {
// // //         headers["X-CSRF-Token"] = csrfToken;
// // //       }
// // //       if (sessionMetadata?.backendSessionId) {
// // //         headers["X-Session-Id"] = sessionMetadata.backendSessionId;
// // //       }

// // //       await axiosInstance.post(
// // //         `${API_URL}/auth/logout`,
// // //         {},
// // //         { withCredentials: true, headers }
// // //       );
// // //     } catch {
// // //       // Continue with frontend logout even if backend call fails
// // //     }

// // //     sessionStorage.removeItem("auth_session");
// // //     localStorage.setItem("SESSION_INVALIDATED", "1");
// // //     setTimeout(() => localStorage.removeItem("SESSION_INVALIDATED"), 100);

// // //     sessionStorage.setItem("LOGGED_OUT", "1");

// // //     SessionManager.clearSessionData();
// // //     delete axiosInstance.defaults.headers.common["X-CSRF-Token"];

// // //     set({
// // //       user: null,
// // //       isAuthenticated: false,
// // //       isAdmin: false,
// // //       csrfToken: null,
// // //       userPermissions: null,
// // //       sessionMetadata: null,
// // //       initialized: true,
// // //     });

// // //     window.location.href = "/login";
// // //   },

// // //   validateSession: async () => {
// // //     const metadata = SessionManager.getSessionMetadata();

// // //     if (!metadata) {
// // //       return true;
// // //     }

// // //     if (!SessionManager.validateDeviceFingerprint(metadata.deviceFingerprint)) {
// // //       await get().logout();
// // //       return false;
// // //     }

// // //     if (SessionManager.isSessionExpired(metadata)) {
// // //       await get().logout();
// // //       return false;
// // //     }

// // //     return true;
// // //   },

// // //   rotateTokens: async () => {
// // //     try {
// // //       const isValid = await get().validateSession();
// // //       if (!isValid) {
// // //         return false;
// // //       }

// // //       const response = await axiosInstance.post(
// // //         `${API_URL}/auth/refresh`,
// // //         {},
// // //         { withCredentials: true }
// // //       );
// // //       const { csrf_token } = response.data;

// // //       set({ csrfToken: csrf_token });
// // //       if (csrf_token) {
// // //         axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
// // //       }

// // //       SessionManager.updateLastActivity();
// // //       return true;
// // //     } catch {
// // //       return false;
// // //     }
// // //   },

// // //   extendSession: async () => {
// // //     const metadata = SessionManager.getSessionMetadata();
// // //     if (metadata && metadata.rememberMe) {
// // //       metadata.lastActivityAt = Date.now();
// // //       SessionManager.storeSessionMetadata(metadata);
// // //       set({ sessionMetadata: metadata });
// // //     }
// // //   },

// // //   clearRememberMe: () => {
// // //     sessionStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
// // //     set({ rememberMeEnabled: false });
// // //   },

// // //   checkAuthStatus: async () => {
// // //     if (sessionStorage.getItem("LOGGED_OUT") === "1") {
// // //       return false;
// // //     }

// // //     set({ isLoading: true });

// // //     const clearSession = () => {
// // //       delete axiosInstance.defaults.headers.common["X-CSRF-Token"];
// // //       SessionManager.clearSessionData();
// // //       sessionStorage.removeItem("LOGGED_OUT");
// // //       set({
// // //         user: null,
// // //         isAuthenticated: false,
// // //         isAdmin: false,
// // //         userPermissions: null,
// // //         csrfToken: null,
// // //         sessionMetadata: null,
// // //         rememberMeEnabled: false,
// // //         isLoading: false,
// // //         initialized: true,
// // //       });
// // //     };

// // //     try {
// // //       const validSession = await get().validateSession();
// // //       if (!validSession) {
// // //         clearSession();
// // //         return false;
// // //       }
// // //     } catch {
// // //       clearSession();
// // //       return false;
// // //     }

// // //     try {
// // //       const response = await axiosInstance.get(`${API_URL}/auth/me`, {
// // //         withCredentials: true,
// // //       });

// // //       const user = response.data;
// // //       const isAdmin = user?.role === UserRole.ADMIN;

// // //       const metadata = SessionManager.getSessionMetadata();
// // //       if (metadata && user.session_timeout) {
// // //         metadata.sessionTimeoutMinutes = user.session_timeout;
// // //         SessionManager.storeSessionMetadata(metadata);
// // //       }

// // //       set({
// // //         user,
// // //         isAuthenticated: true,
// // //         isAdmin,
// // //         isLoading: false,
// // //         initialized: true,
// // //         sessionMetadata: metadata,
// // //       });

// // //       if (user?.csrf_token) {
// // //         axiosInstance.defaults.headers.common["X-CSRF-Token"] = user.csrf_token;
// // //         set({ csrfToken: user.csrf_token });
// // //       }

// // //       SessionManager.updateLastActivity();
// // //       await get().loadUserPermissions();
// // //       return true;
// // //     } catch (error: any) {
// // //       if (
// // //         error?.response?.status === 401 &&
// // //         !sessionStorage.getItem("LOGGED_OUT")
// // //       ) {
// // //         const refreshed = await get().refreshToken();
// // //         if (refreshed) {
// // //           try {
// // //             const response = await axiosInstance.get(`${API_URL}/auth/me`, {
// // //               withCredentials: true,
// // //             });

// // //             const user = response.data;
// // //             const isAdmin = user?.role === UserRole.ADMIN;

// // //             const metadata = SessionManager.getSessionMetadata();
// // //             if (metadata && user.session_timeout) {
// // //               metadata.sessionTimeoutMinutes = user.session_timeout;
// // //               SessionManager.storeSessionMetadata(metadata);
// // //             }

// // //             set({
// // //               user,
// // //               isAuthenticated: true,
// // //               isAdmin,
// // //               isLoading: false,
// // //               initialized: true,
// // //               sessionMetadata: metadata,
// // //             });

// // //             SessionManager.updateLastActivity();
// // //             await get().loadUserPermissions();
// // //             return true;
// // //           } catch {
// // //             clearSession();
// // //             return false;
// // //           }
// // //         }
// // //       }

// // //       clearSession();
// // //       return false;
// // //     }
// // //   },

// // //   refreshToken: async () => {
// // //     try {
// // //       // Step 1: Refresh access token
// // //       const refreshResponse = await axiosInstance.post(
// // //         `${API_URL}/auth/refresh`,
// // //         {},
// // //         { withCredentials: true }
// // //       );
// // //       const { csrf_token } = refreshResponse.data;

// // //       set({ csrfToken: csrf_token });
// // //       if (csrf_token) {
// // //         axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
// // //       }

// // //       SessionManager.updateLastActivity();

// // //       // Step 2: CRITICAL — Validate session against backend
// // //       const sessionMetadata = SessionManager.getSessionMetadata();
// // //       if (!sessionMetadata?.backendSessionId) {
// // //         console.warn("No backend session ID, skipping validation");
// // //         // Optionally fallback to /auth/me
// // //       } else {
// // //         try {
// // //           const validateResponse = await axiosInstance.post(
// // //             `${API_URL}/sessions/validate`,
// // //             {},
// // //             {
// // //               headers: { "X-Session-Id": sessionMetadata.backendSessionId },
// // //               withCredentials: true,
// // //             }
// // //           );

// // //           const { is_valid, is_expired, requires_logout } =
// // //             validateResponse.data;

// // //           if (!is_valid || is_expired || requires_logout) {
// // //             console.log(
// // //               "[refreshToken] Backend session invalid → forcing logout"
// // //             );
// // //             await get().logout();
// // //             return false;
// // //           }
// // //         } catch (err: any) {
// // //           if (err.response?.status === 401) {
// // //             console.log("[refreshToken] Session validation failed → logout");
// // //             await get().logout();
// // //             return false;
// // //           }
// // //           // Non-401 errors: continue (don't block refresh)
// // //         }
// // //       }

// // //       // Step 3: Load user data
// // //       const userResponse = await axiosInstance.get(`${API_URL}/auth/me`, {
// // //         withCredentials: true,
// // //       });
// // //       const user = userResponse.data;
// // //       const isAdmin = user?.role === UserRole.ADMIN;

// // //       set({
// // //         user,
// // //         isAuthenticated: true,
// // //         isAdmin,
// // //         initialized: true,
// // //       });

// // //       await get().loadUserPermissions();
// // //       return true;
// // //     } catch (error) {
// // //       console.error("[refreshToken] Failed:", error);
// // //       return false;
// // //     }
// // //   },

// // //   loadUserPermissions: async () => {
// // //     try {
// // //       const { csrfToken } = get();
// // //       const response = await axiosInstance.get(`${API_URL}/permissions/me`, {
// // //         withCredentials: true,
// // //         headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
// // //       });
// // //       set({ userPermissions: response.data.permissions });
// // //     } catch {
// // //       // set({ userPermissions: null });
// // //     }
// // //   },

// // //   getCsrfToken: () => {
// // //     return get().csrfToken;
// // //   },

// // //   setInitialized: (value: boolean) => {
// // //     set({ initialized: value });
// // //   },

// // //   checkAuth: async () => {
// // //     try {
// // //       if (sessionStorage.getItem("LOGGED_OUT") === "1") {
// // //         return false;
// // //       }

// // //       set({ isLoading: true });

// // //       const clearSession = () => {
// // //         delete axiosInstance.defaults.headers.common["X-CSRF-Token"];
// // //         SessionManager.clearSessionData();
// // //         sessionStorage.removeItem("LOGGED_OUT");
// // //         set({
// // //           user: null,
// // //           isAuthenticated: false,
// // //           isAdmin: false,
// // //           userPermissions: null,
// // //           csrfToken: null,
// // //           sessionMetadata: null,
// // //           rememberMeEnabled: false,
// // //           isLoading: false,
// // //           initialized: true,
// // //         });
// // //       };

// // //       try {
// // //         const validSession = await get().validateSession();
// // //         if (!validSession) {
// // //           clearSession();
// // //           return false;
// // //         }
// // //       } catch {
// // //         clearSession();
// // //         return false;
// // //       }

// // //       try {
// // //         const response = await axiosInstance.get(`${API_URL}/auth/me`, {
// // //           withCredentials: true,
// // //         });

// // //         const user = response.data;
// // //         const isAdmin = user?.role === UserRole.ADMIN;

// // //         const metadata = SessionManager.getSessionMetadata();
// // //         if (metadata && user.session_timeout) {
// // //           metadata.sessionTimeoutMinutes = user.session_timeout;
// // //           SessionManager.storeSessionMetadata(metadata);
// // //         }

// // //         set({
// // //           user,
// // //           isAuthenticated: true,
// // //           isAdmin,
// // //           isLoading: false,
// // //           initialized: true,
// // //           sessionMetadata: metadata,
// // //         });

// // //         if (user?.csrf_token) {
// // //           axiosInstance.defaults.headers.common["X-CSRF-Token"] =
// // //             user.csrf_token;
// // //           set({ csrfToken: user.csrf_token });
// // //         }

// // //         SessionManager.updateLastActivity();
// // //         await get().loadUserPermissions();
// // //         return true;
// // //       } catch (error: any) {
// // //         if (error?.response?.status === 401) {
// // //           if (!sessionStorage.getItem("LOGGED_OUT")) {
// // //             const refreshed = await get().refreshToken();
// // //             if (refreshed) {
// // //               try {
// // //                 const response = await axiosInstance.get(`${API_URL}/auth/me`, {
// // //                   withCredentials: true,
// // //                 });

// // //                 const user = response.data;
// // //                 const isAdmin = user?.role === UserRole.ADMIN;

// // //                 const metadata = SessionManager.getSessionMetadata();
// // //                 if (metadata && user.session_timeout) {
// // //                   metadata.sessionTimeoutMinutes = user.session_timeout;
// // //                   SessionManager.storeSessionMetadata(metadata);
// // //                 }

// // //                 set({
// // //                   user,
// // //                   isAuthenticated: true,
// // //                   isAdmin,
// // //                   isLoading: false,
// // //                   initialized: true,
// // //                   sessionMetadata: metadata,
// // //                 });

// // //                 SessionManager.updateLastActivity();
// // //                 await get().loadUserPermissions();
// // //                 return true;
// // //               } catch {
// // //                 clearSession();
// // //                 return false;
// // //               }
// // //             }
// // //           }
// // //         }

// // //         clearSession();
// // //         return false;
// // //       }
// // //     } catch {
// // //       return false;
// // //     }
// // //   },
// // // }));

// // // export const verify2FA = async (email: string, code: string) => {
// // //   try {
// // //     const response = await axiosInstance.post(
// // //       `${API_URL}/auth/2fa/verify`,
// // //       { email, code },
// // //       { withCredentials: true }
// // //     );

// // //     const { user, csrf_token } = response.data;
// // //     const isAdmin = user?.role === UserRole.ADMIN;

// // //     const tempMetadata = sessionStorage.getItem("temp_session_metadata");
// // //     let sessionMetadata;
// // //     if (tempMetadata) {
// // //       sessionMetadata = JSON.parse(tempMetadata);
// // //     } else {
// // //       sessionMetadata = SessionManager.createSessionMetadata(false, 30);
// // //     }

// // //     const backendSessionTimeout = user.session_timeout || 30;
// // //     sessionMetadata.sessionTimeoutMinutes = backendSessionTimeout;

// // //     SessionManager.storeSessionMetadata(sessionMetadata);
// // //     useCookieAuthStore.setState({
// // //       user,
// // //       isAuthenticated: true,
// // //       isAdmin,
// // //       csrfToken: csrf_token,
// // //       sessionMetadata,
// // //       rememberMeEnabled: sessionMetadata.rememberMe,
// // //       initialized: true,
// // //     });

// // //     if (csrf_token) {
// // //       axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
// // //     }

// // //     sessionStorage.removeItem("temp_session_metadata");
// // //     await useCookieAuthStore.getState().loadUserPermissions();

// // //     return { user, success: true };
// // //   } catch (error: any) {
// // //     throw error;
// // //   }
// // // };

// // // // Token refresh queue
// // // const isRefreshing = false;
// // // let failedQueue: Array<{
// // //   resolve: (value?: any) => void;
// // //   reject: (error?: any) => void;
// // // }> = [];

// // // const processQueue = (error: any, token: string | null = null) => {
// // //   failedQueue.forEach(({ resolve, reject }) => {
// // //     if (error) {
// // //       reject(error);
// // //     } else {
// // //       resolve(token);
// // //     }
// // //   });
// // //   failedQueue = [];
// // // };

// // // // Axios interceptor
// // // axiosInstance.interceptors.response.use(
// // //   (response) => {
// // //     SessionManager.updateLastActivity();
// // //     return response;
// // //   },
// // //   async (error) => {
// // //     const originalRequest = error.config;

// // //     if (error.response?.status === 401 && !originalRequest._retry) {
// // //       if (
// // //         error.response?.data?.message?.includes("session") ||
// // //         error.response?.data?.message?.includes("expired")
// // //       ) {
// // //         console.log(
// // //           "[AxiosInterceptor] Backend session expired - forcing logout"
// // //         );
// // //         await useCookieAuthStore.getState().logout();
// // //         return Promise.reject(error);
// // //       }

// // //       return Promise.reject(error);
// // //     }

// // //     return Promise.reject(error);
// // //   }
// // // );

// // // // Activity listeners
// // // ["mousemove", "keypress", "click", "scroll", "touchstart"].forEach((event) => {
// // //   document.addEventListener(
// // //     event,
// // //     () => {
// // //       SessionManager.updateLastActivity();
// // //     },
// // //     { passive: true }
// // //   );
// // // });

// // // src/shared/store/cookieAuthStore.ts

// // import { create } from "zustand";
// // import axiosInstance from "../../shared/lib/axiosInstance";
// // import { type User, type LoginCredentials, UserRole } from "../types";
// // import { API_URL } from "../../shared/config/constants";

// // interface SessionConfig {
// //   readonly SESSION_STORAGE_KEY: string;
// //   readonly REMEMBER_ME_STORAGE_KEY: string;
// //   readonly TOKEN_ROTATION_INTERVAL_MS: number;
// // }

// // interface SessionMetadata {
// //   sessionId: string;
// //   createdAt: number;
// //   lastActivityAt: number;
// //   rememberMe: boolean;
// //   deviceFingerprint: string;
// //   ipAddress?: string;
// //   userAgent: string;
// //   backendSessionId?: string;
// //   sessionTimeoutMinutes: number;
// // }

// // interface AuthState {
// //   user: User | null;
// //   isAuthenticated: boolean;
// //   isAdmin: boolean;
// //   userPermissions: Record<string, any> | null;
// //   csrfToken: string | null;
// //   isLoading: boolean;
// //   initialized: boolean;
// //   sessionMetadata: SessionMetadata | null;
// //   rememberMeEnabled: boolean;
// //   login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
// //   logout: () => Promise<void>;
// //   checkAuthStatus: () => Promise<boolean>;
// //   loadUserPermissions: () => Promise<void>;
// //   refreshToken: () => Promise<boolean>;
// //   getCsrfToken: () => string | null;
// //   validateSession: () => Promise<boolean>;
// //   rotateTokens: () => Promise<boolean>;
// //   extendSession: () => Promise<void>;
// //   clearRememberMe: () => void;
// //   setInitialized: (value: boolean) => void;
// //   checkAuth: () => Promise<boolean>;
// // }

// // const SESSION_CONFIG: SessionConfig = {
// //   SESSION_STORAGE_KEY: "auth_session",
// //   REMEMBER_ME_STORAGE_KEY: "remember_me_token",
// //   TOKEN_ROTATION_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
// // };

// // class SessionManager {
// //   static generateSessionId(): string {
// //     const array = new Uint8Array(32);
// //     crypto.getRandomValues(array);
// //     return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
// //       ""
// //     );
// //   }

// //   static generateDeviceFingerprint(): string {
// //     const fingerprint = {
// //       userAgent: navigator.userAgent,
// //       language: navigator.language,
// //       platform: navigator.platform,
// //       hardwareConcurrency: navigator.hardwareConcurrency,
// //       deviceMemory: (navigator as any).deviceMemory,
// //       maxTouchPoints: navigator.maxTouchPoints,
// //     };
// //     console.log("[SessionManager] Generated device fingerprint:", fingerprint);
// //     return btoa(JSON.stringify(fingerprint));
// //   }

// //   static validateDeviceFingerprint(storedFingerprint: string): boolean {
// //     const current = this.generateDeviceFingerprint();
// //     const isValid = storedFingerprint === current;
// //     console.log("[SessionManager] Device fingerprint validation:", {
// //       stored: storedFingerprint,
// //       current,
// //       isValid,
// //     });
// //     return isValid;
// //   }

// //   static createSessionMetadata(
// //     rememberMe: boolean,
// //     sessionTimeoutMinutes = 30
// //   ): SessionMetadata {
// //     console.log("[SessionManager] Creating session metadata:", {
// //       rememberMe,
// //       sessionTimeoutMinutes,
// //     });
// //     return {
// //       sessionId: this.generateSessionId(),
// //       createdAt: Date.now(),
// //       lastActivityAt: Date.now(),
// //       rememberMe,
// //       deviceFingerprint: this.generateDeviceFingerprint(),
// //       userAgent: navigator.userAgent,
// //       sessionTimeoutMinutes,
// //     };
// //   }

// //   static storeSessionMetadata(metadata: SessionMetadata): void {
// //     console.log("[SessionManager] Storing session metadata:", metadata);
// //     sessionStorage.setItem(
// //       SESSION_CONFIG.SESSION_STORAGE_KEY,
// //       JSON.stringify(metadata)
// //     );
// //     if (metadata.rememberMe) {
// //       localStorage.setItem(
// //         SESSION_CONFIG.SESSION_STORAGE_KEY,
// //         JSON.stringify(metadata)
// //       );
// //       console.log(
// //         "[SessionManager] Stored session in localStorage for remember me"
// //       );
// //     } else {
// //       console.log("[SessionManager] Stored session in sessionStorage");
// //     }
// //   }

// //   static getSessionMetadata(): SessionMetadata | null {
// //     let stored = sessionStorage.getItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
// //     if (!stored) {
// //       stored = localStorage.getItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
// //     }
// //     if (stored) {
// //       try {
// //         const parsed = JSON.parse(stored);
// //         console.log("[SessionManager] Retrieved session metadata:", parsed);
// //         return parsed;
// //       } catch {
// //         console.error("[SessionManager] Failed to parse session metadata");
// //         return null;
// //       }
// //     }
// //     console.log("[SessionManager] No session metadata found");
// //     return null;
// //   }

// //   static clearSessionData(): void {
// //     console.log("[SessionManager] Clearing all session data");
// //     sessionStorage.removeItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
// //     sessionStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
// //     localStorage.removeItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
// //     localStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
// //   }

// //   static updateLastActivity(): void {
// //     const metadata = this.getSessionMetadata();
// //     if (metadata) {
// //       metadata.lastActivityAt = Date.now();
// //       this.storeSessionMetadata(metadata);
// //       console.log(
// //         "[SessionManager] Updated last activity:",
// //         metadata.lastActivityAt
// //       );
// //     } else {
// //       console.warn("[SessionManager] No metadata to update activity");
// //     }
// //   }

// //   static getSessionTimeoutMs(metadata: SessionMetadata): number {
// //     const timeoutMs = metadata.sessionTimeoutMinutes * 60 * 1000;
// //     console.log("[SessionManager] Session timeout in ms:", timeoutMs);
// //     return timeoutMs;
// //   }

// //   static isSessionExpired(metadata: SessionMetadata): boolean {
// //     const inactivity = Date.now() - metadata.lastActivityAt;
// //     const max = metadata.rememberMe
// //       ? 24 * 60 * 60 * 1000
// //       : this.getSessionTimeoutMs(metadata);
// //     const isExpired = inactivity > max;
// //     console.log("[SessionManager] Session expiration check:", {
// //       inactivity,
// //       max,
// //       isExpired,
// //     });
// //     return isExpired;
// //   }
// // }

// // export const useCookieAuthStore = create<AuthState>()((set, get) => ({
// //   user: null,
// //   isAuthenticated: false,
// //   isAdmin: false,
// //   userPermissions: null,
// //   csrfToken: null,
// //   isLoading: false,
// //   initialized: false,
// //   sessionMetadata: null,
// //   rememberMeEnabled: false,

// //   login: async (credentials: LoginCredentials, rememberMe = false) => {
// //     console.log("[AuthStore] Starting login process:", {
// //       credentials: { ...credentials, password: "***" },
// //       rememberMe,
// //     });
// //     set({ isLoading: true });
// //     try {
// //       const sessionMetadata = SessionManager.createSessionMetadata(
// //         rememberMe,
// //         30
// //       );

// //       const response = await axiosInstance.post(
// //         `${API_URL}/auth/login`,
// //         credentials,
// //         { withCredentials: true }
// //       );
// //       console.log("[AuthStore] Login response received:", response);

// //       if (response.data.requires2FA) {
// //         console.log("[AuthStore] 2FA required, storing temporary data");
// //         sessionStorage.setItem("twoFAEmail", response.data.email);
// //         sessionStorage.setItem(
// //           "temp_session_metadata",
// //           JSON.stringify(sessionMetadata)
// //         );
// //         throw new Error("2FA_REQUIRED");
// //       }

// //       const { user, csrf_token } = response.data;
// //       const isAdmin = user.role === UserRole.ADMIN;
// //       console.log("[AuthStore] Login successful:", {
// //         user,
// //         isAdmin,
// //         csrf_token,
// //       });

// //       const backendSessionTimeout = user.session_timeout || 30;
// //       sessionMetadata.sessionTimeoutMinutes = backendSessionTimeout;

// //       if (response.data.session_id) {
// //         sessionMetadata.backendSessionId = response.data.session_id;
// //         console.log(
// //           "[AuthStore] Backend session ID stored:",
// //           response.data.session_id
// //         );
// //       }

// //       SessionManager.storeSessionMetadata(sessionMetadata);

// //       set({
// //         user,
// //         isAuthenticated: true,
// //         isAdmin,
// //         csrfToken: csrf_token,
// //         isLoading: false,
// //         sessionMetadata,
// //         rememberMeEnabled: rememberMe,
// //         initialized: true,
// //       });
// //       console.log("[AuthStore] State updated after login");

// //       if (csrf_token) {
// //         axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
// //         console.log("[AuthStore] CSRF token set in axios defaults");
// //       }

// //       await get().loadUserPermissions();
// //       console.log("[AuthStore] User permissions loaded after login");
// //     } catch (error: any) {
// //       console.error("[AuthStore] Login failed:", error);
// //       set({ isLoading: false });
// //       throw error;
// //     }
// //   },

// //   logout: async () => {
// //     console.log("[AuthStore] Starting logout process");
// //     try {
// //       const { csrfToken, sessionMetadata } = get();

// //       const headers: Record<string, string> = {};
// //       if (csrfToken) {
// //         headers["X-CSRF-Token"] = csrfToken;
// //       }
// //       if (sessionMetadata?.backendSessionId) {
// //         headers["X-Session-Id"] = sessionMetadata.backendSessionId;
// //       }

// //       console.log(
// //         "[AuthStore] Sending logout request to backend with headers:",
// //         headers
// //       );
// //       await axiosInstance.post(
// //         `${API_URL}/auth/logout`,
// //         {},
// //         { withCredentials: true, headers }
// //       );
// //       console.log("[AuthStore] Backend logout completed");
// //     } catch (error) {
// //       console.error(
// //         "[AuthStore] Backend logout failed (continuing with frontend logout):",
// //         error
// //       );
// //       // Continue with frontend logout even if backend call fails
// //     }

// //     sessionStorage.removeItem("auth_session");
// //     localStorage.setItem("SESSION_INVALIDATED", "1");
// //     setTimeout(() => localStorage.removeItem("SESSION_INVALIDATED"), 100);

// //     sessionStorage.setItem("LOGGED_OUT", "1");

// //     SessionManager.clearSessionData();
// //     delete axiosInstance.defaults.headers.common["X-CSRF-Token"];
// //     console.log("[AuthStore] Frontend session cleared");

// //     set({
// //       user: null,
// //       isAuthenticated: false,
// //       isAdmin: false,
// //       csrfToken: null,
// //       userPermissions: null,
// //       sessionMetadata: null,
// //       initialized: true,
// //     });
// //     console.log("[AuthStore] State updated after logout");

// //     window.location.href = "/login";
// //     console.log("[AuthStore] Redirecting to login page");
// //   },

// //   validateSession: async () => {
// //     console.log("[AuthStore] Validating session");
// //     const metadata = SessionManager.getSessionMetadata();

// //     if (!metadata) {
// //       console.log("[AuthStore] No session metadata found, validation passed");
// //       return true;
// //     }

// //     if (!SessionManager.validateDeviceFingerprint(metadata.deviceFingerprint)) {
// //       console.log("[AuthStore] Device fingerprint mismatch, logging out");
// //       await get().logout();
// //       return false;
// //     }

// //     if (SessionManager.isSessionExpired(metadata)) {
// //       console.log("[AuthStore] Session expired, logging out");
// //       await get().logout();
// //       return false;
// //     }

// //     console.log("[AuthStore] Session validation passed");
// //     return true;
// //   },

// //   rotateTokens: async () => {
// //     console.log("[AuthStore] Attempting token rotation");
// //     try {
// //       const isValid = await get().validateSession();
// //       if (!isValid) {
// //         console.log("[AuthStore] Session invalid, token rotation failed");
// //         return false;
// //       }

// //       const response = await axiosInstance.post(
// //         `${API_URL}/auth/refresh`,
// //         {},
// //         { withCredentials: true }
// //       );
// //       const { csrf_token } = response.data;
// //       console.log("[AuthStore] Token refresh response:", response);

// //       set({ csrfToken: csrf_token });
// //       if (csrf_token) {
// //         axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
// //         console.log("[AuthStore] New CSRF token set in axios defaults");
// //       }

// //       SessionManager.updateLastActivity();
// //       console.log("[AuthStore] Tokens rotated successfully");
// //       return true;
// //     } catch (error) {
// //       console.error("[AuthStore] Token rotation failed:", error);
// //       return false;
// //     }
// //   },

// //   extendSession: async () => {
// //     console.log("[AuthStore] Extending session");
// //     const metadata = SessionManager.getSessionMetadata();
// //     if (metadata && metadata.rememberMe) {
// //       metadata.lastActivityAt = Date.now();
// //       SessionManager.storeSessionMetadata(metadata);
// //       set({ sessionMetadata: metadata });
// //       console.log("[AuthStore] Session extended:", metadata.lastActivityAt);
// //     } else {
// //       console.log(
// //         "[AuthStore] Session not extended - no metadata or rememberMe disabled"
// //       );
// //     }
// //   },

// //   clearRememberMe: () => {
// //     console.log("[AuthStore] Clearing remember me data");
// //     sessionStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
// //     set({ rememberMeEnabled: false });
// //   },

// //   checkAuthStatus: async () => {
// //     console.log("[AuthStore] Checking authentication status");
// //     if (sessionStorage.getItem("LOGGED_OUT") === "1") {
// //       console.log("[AuthStore] User logged out in another tab");
// //       return false;
// //     }

// //     set({ isLoading: true });

// //     const clearSession = () => {
// //       console.log("[AuthStore] Clearing session due to auth failure");
// //       delete axiosInstance.defaults.headers.common["X-CSRF-Token"];
// //       SessionManager.clearSessionData();
// //       sessionStorage.removeItem("LOGGED_OUT");
// //       set({
// //         user: null,
// //         isAuthenticated: false,
// //         isAdmin: false,
// //         userPermissions: null,
// //         csrfToken: null,
// //         sessionMetadata: null,
// //         rememberMeEnabled: false,
// //         isLoading: false,
// //         initialized: true,
// //       });
// //     };

// //     try {
// //       const validSession = await get().validateSession();
// //       if (!validSession) {
// //         console.log("[AuthStore] Session validation failed");
// //         clearSession();
// //         return false;
// //       }
// //     } catch (error) {
// //       console.error("[AuthStore] Session validation error:", error);
// //       clearSession();
// //       return false;
// //     }

// //     try {
// //       console.log("[AuthStore] Fetching user data from /auth/me");
// //       const response = await axiosInstance.get(`${API_URL}/auth/me`, {
// //         withCredentials: true,
// //       });

// //       const user = response.data;
// //       const isAdmin = user?.role === UserRole.ADMIN;
// //       console.log("[AuthStore] User data retrieved:", { user, isAdmin });

// //       const metadata = SessionManager.getSessionMetadata();
// //       if (metadata && user.session_timeout) {
// //         metadata.sessionTimeoutMinutes = user.session_timeout;
// //         SessionManager.storeSessionMetadata(metadata);
// //         console.log(
// //           "[AuthStore] Updated session timeout from backend:",
// //           user.session_timeout
// //         );
// //       }

// //       set({
// //         user,
// //         isAuthenticated: true,
// //         isAdmin,
// //         isLoading: false,
// //         initialized: true,
// //         sessionMetadata: metadata,
// //       });
// //       console.log("[AuthStore] State updated after auth check");

// //       if (user?.csrf_token) {
// //         axiosInstance.defaults.headers.common["X-CSRF-Token"] = user.csrf_token;
// //         set({ csrfToken: user.csrf_token });
// //         console.log("[AuthStore] CSRF token updated from user data");
// //       }

// //       SessionManager.updateLastActivity();
// //       await get().loadUserPermissions();
// //       console.log(
// //         "[AuthStore] Authentication status check completed successfully"
// //       );
// //       return true;
// //     } catch (error: any) {
// //       console.error("[AuthStore] Auth check failed:", error);
// //       if (
// //         error?.response?.status === 401 &&
// //         !sessionStorage.getItem("LOGGED_OUT")
// //       ) {
// //         console.log("[AuthStore] 401 received, attempting token refresh");
// //         const refreshed = await get().refreshToken();
// //         if (refreshed) {
// //           console.log(
// //             "[AuthStore] Token refresh successful, retrying auth check"
// //           );
// //           try {
// //             const response = await axiosInstance.get(`${API_URL}/auth/me`, {
// //               withCredentials: true,
// //             });

// //             const user = response.data;
// //             const isAdmin = user?.role === UserRole.ADMIN;

// //             const metadata = SessionManager.getSessionMetadata();
// //             if (metadata && user.session_timeout) {
// //               metadata.sessionTimeoutMinutes = user.session_timeout;
// //               SessionManager.storeSessionMetadata(metadata);
// //             }

// //             set({
// //               user,
// //               isAuthenticated: true,
// //               isAdmin,
// //               isLoading: false,
// //               initialized: true,
// //               sessionMetadata: metadata,
// //             });

// //             SessionManager.updateLastActivity();
// //             await get().loadUserPermissions();
// //             console.log("[AuthStore] Auth check completed after refresh");
// //             return true;
// //           } catch (refreshError) {
// //             console.error(
// //               "[AuthStore] Auth check failed after refresh:",
// //               refreshError
// //             );
// //             clearSession();
// //             return false;
// //           }
// //         }
// //       }

// //       clearSession();
// //       return false;
// //     }
// //   },

// //   refreshToken: async () => {
// //     console.log("[AuthStore] Starting token refresh process");
// //     try {
// //       // Step 1: Refresh access token
// //       const refreshResponse = await axiosInstance.post(
// //         `${API_URL}/auth/refresh`,
// //         {},
// //         { withCredentials: true }
// //       );
// //       const { csrf_token } = refreshResponse.data;
// //       console.log(
// //         "[AuthStore] Token refresh response received:",
// //         refreshResponse
// //       );

// //       set({ csrfToken: csrf_token });
// //       if (csrf_token) {
// //         axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
// //         console.log("[AuthStore] Updated CSRF token after refresh");
// //       }

// //       SessionManager.updateLastActivity();

// //       // Step 2: CRITICAL — Validate session against backend
// //       const sessionMetadata = SessionManager.getSessionMetadata();
// //       if (!sessionMetadata?.backendSessionId) {
// //         console.warn("[AuthStore] No backend session ID, skipping validation");
// //         // Optionally fallback to /auth/me
// //       } else {
// //         try {
// //           console.log(
// //             "[AuthStore] Validating session with backend session ID:",
// //             sessionMetadata.backendSessionId
// //           );
// //           const validateResponse = await axiosInstance.post(
// //             `${API_URL}/sessions/validate`,
// //             {},
// //             {
// //               headers: { "X-Session-Id": sessionMetadata.backendSessionId },
// //               withCredentials: true,
// //             }
// //           );

// //           const { is_valid, is_expired, requires_logout } =
// //             validateResponse.data;

// //           if (!is_valid || is_expired || requires_logout) {
// //             console.log(
// //               "[refreshToken] Backend session invalid → forcing logout",
// //               { is_valid, is_expired, requires_logout }
// //             );
// //             await get().logout();
// //             return false;
// //           }
// //           console.log("[AuthStore] Backend session validation passed");
// //         } catch (err: any) {
// //           if (err.response?.status === 401) {
// //             console.log(
// //               "[refreshToken] Session validation failed → logout",
// //               err
// //             );
// //             await get().logout();
// //             return false;
// //           }
// //           console.warn(
// //             "[AuthStore] Non-401 session validation error (continuing):",
// //             err
// //           );
// //           // Non-401 errors: continue (don't block refresh)
// //         }
// //       }

// //       // Step 3: Load user data
// //       console.log("[AuthStore] Loading user data after refresh");
// //       const userResponse = await axiosInstance.get(`${API_URL}/auth/me`, {
// //         withCredentials: true,
// //       });
// //       const user = userResponse.data;
// //       const isAdmin = user?.role === UserRole.ADMIN;

// //       set({
// //         user,
// //         isAuthenticated: true,
// //         isAdmin,
// //         initialized: true,
// //       });
// //       console.log("[AuthStore] User data loaded after refresh:", {
// //         user,
// //         isAdmin,
// //       });

// //       await get().loadUserPermissions();
// //       console.log("[AuthStore] User permissions loaded after refresh");
// //       return true;
// //     } catch (error) {
// //       console.error("[refreshToken] Failed:", error);
// //       return false;
// //     }
// //   },

// //   loadUserPermissions: async () => {
// //     console.log("[AuthStore] Loading user permissions");
// //     try {
// //       const { csrfToken } = get();
// //       const response = await axiosInstance.get(`${API_URL}/permissions/me`, {
// //         withCredentials: true,
// //         headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
// //       });
// //       set({ userPermissions: response.data.permissions });
// //       console.log(
// //         "[AuthStore] User permissions loaded:",
// //         response.data.permissions
// //       );
// //     } catch (error) {
// //       console.error("[AuthStore] Failed to load user permissions:", error);
// //       // set({ userPermissions: null });
// //     }
// //   },

// //   getCsrfToken: () => {
// //     const token = get().csrfToken;
// //     console.log("[AuthStore] Getting CSRF token:", token);
// //     return token;
// //   },

// //   setInitialized: (value: boolean) => {
// //     console.log("[AuthStore] Setting initialized state:", value);
// //     set({ initialized: value });
// //   },

// //   checkAuth: async () => {
// //     console.log("[AuthStore] Running comprehensive auth check");
// //     try {
// //       if (sessionStorage.getItem("LOGGED_OUT") === "1") {
// //         console.log("[AuthStore] User logged out in another tab");
// //         return false;
// //       }

// //       set({ isLoading: true });

// //       const clearSession = () => {
// //         console.log("[AuthStore] Clearing session in checkAuth");
// //         delete axiosInstance.defaults.headers.common["X-CSRF-Token"];
// //         SessionManager.clearSessionData();
// //         sessionStorage.removeItem("LOGGED_OUT");
// //         set({
// //           user: null,
// //           isAuthenticated: false,
// //           isAdmin: false,
// //           userPermissions: null,
// //           csrfToken: null,
// //           sessionMetadata: null,
// //           rememberMeEnabled: false,
// //           isLoading: false,
// //           initialized: true,
// //         });
// //       };

// //       try {
// //         const validSession = await get().validateSession();
// //         if (!validSession) {
// //           console.log("[AuthStore] Session validation failed in checkAuth");
// //           clearSession();
// //           return false;
// //         }
// //       } catch (error) {
// //         console.error(
// //           "[AuthStore] Session validation error in checkAuth:",
// //           error
// //         );
// //         clearSession();
// //         return false;
// //       }

// //       try {
// //         console.log("[AuthStore] Fetching user data in checkAuth");
// //         const response = await axiosInstance.get(`${API_URL}/auth/me`, {
// //           withCredentials: true,
// //         });

// //         const user = response.data;
// //         const isAdmin = user?.role === UserRole.ADMIN;
// //         console.log("[AuthStore] User data retrieved in checkAuth:", {
// //           user,
// //           isAdmin,
// //         });

// //         const metadata = SessionManager.getSessionMetadata();
// //         if (metadata && user.session_timeout) {
// //           metadata.sessionTimeoutMinutes = user.session_timeout;
// //           SessionManager.storeSessionMetadata(metadata);
// //         }

// //         set({
// //           user,
// //           isAuthenticated: true,
// //           isAdmin,
// //           isLoading: false,
// //           initialized: true,
// //           sessionMetadata: metadata,
// //         });

// //         if (user?.csrf_token) {
// //           axiosInstance.defaults.headers.common["X-CSRF-Token"] =
// //             user.csrf_token;
// //           set({ csrfToken: user.csrf_token });
// //         }

// //         SessionManager.updateLastActivity();
// //         await get().loadUserPermissions();
// //         console.log("[AuthStore] Auth check completed successfully");
// //         return true;
// //       } catch (error: any) {
// //         console.error("[AuthStore] Auth check error:", error);
// //         if (error?.response?.status === 401) {
// //           console.log(
// //             "[AuthStore] 401 received in checkAuth, attempting refresh"
// //           );
// //           if (!sessionStorage.getItem("LOGGED_OUT")) {
// //             const refreshed = await get().refreshToken();
// //             if (refreshed) {
// //               console.log(
// //                 "[AuthStore] Refresh successful in checkAuth, retrying"
// //               );
// //               try {
// //                 const response = await axiosInstance.get(`${API_URL}/auth/me`, {
// //                   withCredentials: true,
// //                 });

// //                 const user = response.data;
// //                 const isAdmin = user?.role === UserRole.ADMIN;

// //                 const metadata = SessionManager.getSessionMetadata();
// //                 if (metadata && user.session_timeout) {
// //                   metadata.sessionTimeoutMinutes = user.session_timeout;
// //                   SessionManager.storeSessionMetadata(metadata);
// //                 }

// //                 set({
// //                   user,
// //                   isAuthenticated: true,
// //                   isAdmin,
// //                   isLoading: false,
// //                   initialized: true,
// //                   sessionMetadata: metadata,
// //                 });

// //                 SessionManager.updateLastActivity();
// //                 await get().loadUserPermissions();
// //                 console.log(
// //                   "[AuthStore] Auth check completed after refresh in checkAuth"
// //                 );
// //                 return true;
// //               } catch (refreshError) {
// //                 console.error(
// //                   "[AuthStore] Auth check failed after refresh in checkAuth:",
// //                   refreshError
// //                 );
// //                 clearSession();
// //                 return false;
// //               }
// //             }
// //           }
// //         }

// //         clearSession();
// //         return false;
// //       }
// //     } catch (error) {
// //       console.error("[AuthStore] Critical error in checkAuth:", error);
// //       return false;
// //     }
// //   },
// // }));

// // export const verify2FA = async (email: string, code: string) => {
// //   console.log("[AuthStore] Verifying 2FA:", { email, code: "***" });
// //   try {
// //     const response = await axiosInstance.post(
// //       `${API_URL}/auth/2fa/verify`,
// //       { email, code },
// //       { withCredentials: true }
// //     );
// //     console.log("[AuthStore] 2FA verification response:", response);

// //     const { user, csrf_token } = response.data;
// //     const isAdmin = user?.role === UserRole.ADMIN;

// //     const tempMetadata = sessionStorage.getItem("temp_session_metadata");
// //     let sessionMetadata;
// //     if (tempMetadata) {
// //       sessionMetadata = JSON.parse(tempMetadata);
// //       console.log("[AuthStore] Using temporary session metadata from 2FA flow");
// //     } else {
// //       sessionMetadata = SessionManager.createSessionMetadata(false, 30);
// //       console.log(
// //         "[AuthStore] Creating new session metadata for 2FA completion"
// //       );
// //     }

// //     const backendSessionTimeout = user.session_timeout || 30;
// //     sessionMetadata.sessionTimeoutMinutes = backendSessionTimeout;

// //     SessionManager.storeSessionMetadata(sessionMetadata);
// //     useCookieAuthStore.setState({
// //       user,
// //       isAuthenticated: true,
// //       isAdmin,
// //       csrfToken: csrf_token,
// //       sessionMetadata,
// //       rememberMeEnabled: sessionMetadata.rememberMe,
// //       initialized: true,
// //     });
// //     console.log("[AuthStore] State updated after 2FA verification");

// //     if (csrf_token) {
// //       axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
// //       console.log("[AuthStore] CSRF token set after 2FA verification");
// //     }

// //     sessionStorage.removeItem("temp_session_metadata");
// //     await useCookieAuthStore.getState().loadUserPermissions();
// //     console.log("[AuthStore] 2FA verification completed successfully");

// //     return { user, success: true };
// //   } catch (error: any) {
// //     console.error("[AuthStore] 2FA verification failed:", error);
// //     throw error;
// //   }
// // };

// // // Token refresh queue
// // const isRefreshing = false;
// // let failedQueue: Array<{
// //   resolve: (value?: any) => void;
// //   reject: (error?: any) => void;
// // }> = [];

// // const processQueue = (error: any, token: string | null = null) => {
// //   console.log("[TokenQueue] Processing failed request queue:", {
// //     error,
// //     token,
// //     queueLength: failedQueue.length,
// //   });
// //   failedQueue.forEach(({ resolve, reject }) => {
// //     if (error) {
// //       reject(error);
// //     } else {
// //       resolve(token);
// //     }
// //   });
// //   failedQueue = [];
// // };

// // // Axios interceptor
// // axiosInstance.interceptors.response.use(
// //   (response) => {
// //     SessionManager.updateLastActivity();
// //     return response;
// //   },
// //   async (error) => {
// //     const originalRequest = error.config;

// //     if (error.response?.status === 401 && !originalRequest._retry) {
// //       if (
// //         error.response?.data?.message?.includes("session") ||
// //         error.response?.data?.message?.includes("expired")
// //       ) {
// //         console.log(
// //           "[AxiosInterceptor] Backend session expired - forcing logout",
// //           error.response?.data
// //         );
// //         await useCookieAuthStore.getState().logout();
// //         return Promise.reject(error);
// //       }

// //       return Promise.reject(error);
// //     }

// //     return Promise.reject(error);
// //   }
// // );

// // // Activity listeners
// // ["mousemove", "keypress", "click", "scroll", "touchstart"].forEach((event) => {
// //   document.addEventListener(
// //     event,
// //     () => {
// //       SessionManager.updateLastActivity();
// //       console.log("[ActivityListener] Activity detected:", event);
// //     },
// //     { passive: true }
// //   );
// // });

// // src/shared/store/cookieAuthStore.ts

// import { create } from "zustand";
// import axiosInstance from "../../shared/lib/axiosInstance";
// import { type User, type LoginCredentials, UserRole } from "../types";
// import { API_URL } from "../../shared/config/constants";

// interface SessionConfig {
//   readonly SESSION_STORAGE_KEY: string;
//   readonly REMEMBER_ME_STORAGE_KEY: string;
//   readonly TOKEN_ROTATION_INTERVAL_MS: number;
// }

// interface SessionMetadata {
//   sessionId: string;
//   createdAt: number;
//   lastActivityAt: number;
//   rememberMe: boolean;
//   deviceFingerprint: string;
//   ipAddress?: string;
//   userAgent: string;
//   backendSessionId?: string;
//   sessionTimeoutMinutes: number;
// }

// interface AuthState {
//   user: User | null;
//   isAuthenticated: boolean;
//   isAdmin: boolean;
//   userPermissions: Record<string, any> | null;
//   csrfToken: string | null;
//   isLoading: boolean;
//   initialized: boolean;
//   sessionMetadata: SessionMetadata | null;
//   rememberMeEnabled: boolean;
//   login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
//   logout: () => Promise<void>;
//   checkAuthStatus: () => Promise<boolean>;
//   loadUserPermissions: () => Promise<void>;
//   refreshToken: () => Promise<boolean>;
//   getCsrfToken: () => string | null;
//   validateSession: () => Promise<boolean>;
//   rotateTokens: () => Promise<boolean>;
//   extendSession: () => Promise<void>;
//   clearRememberMe: () => void;
//   setInitialized: (value: boolean) => void;
//   checkAuth: () => Promise<boolean>;
// }

// const SESSION_CONFIG: SessionConfig = {
//   SESSION_STORAGE_KEY: "auth_session",
//   REMEMBER_ME_STORAGE_KEY: "remember_me_token",
//   TOKEN_ROTATION_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
// };

// class SessionManager {
//   static generateSessionId(): string {
//     const array = new Uint8Array(32);
//     crypto.getRandomValues(array);
//     return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
//       ""
//     );
//   }

//   static generateDeviceFingerprint(): string {
//     const fingerprint = {
//       userAgent: navigator.userAgent,
//       language: navigator.language,
//       platform: navigator.platform,
//       hardwareConcurrency: navigator.hardwareConcurrency,
//       deviceMemory: (navigator as any).deviceMemory,
//       maxTouchPoints: navigator.maxTouchPoints,
//     };
//     return btoa(JSON.stringify(fingerprint));
//   }

//   static validateDeviceFingerprint(storedFingerprint: string): boolean {
//     const current = this.generateDeviceFingerprint();
//     const isValid = storedFingerprint === current;
//     if (!isValid) {
//       console.warn(
//         "[SessionManager] Device fingerprint mismatch - session may have changed devices"
//       );
//     }
//     return isValid;
//   }

//   static createSessionMetadata(
//     rememberMe: boolean,
//     sessionTimeoutMinutes = 30
//   ): SessionMetadata {
//     return {
//       sessionId: this.generateSessionId(),
//       createdAt: Date.now(),
//       lastActivityAt: Date.now(),
//       rememberMe,
//       deviceFingerprint: this.generateDeviceFingerprint(),
//       userAgent: navigator.userAgent,
//       sessionTimeoutMinutes,
//     };
//   }

//   static storeSessionMetadata(metadata: SessionMetadata): void {
//     sessionStorage.setItem(
//       SESSION_CONFIG.SESSION_STORAGE_KEY,
//       JSON.stringify(metadata)
//     );
//     if (metadata.rememberMe) {
//       localStorage.setItem(
//         SESSION_CONFIG.SESSION_STORAGE_KEY,
//         JSON.stringify(metadata)
//       );
//     } else {
//       localStorage.removeItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
//     }
//   }

//   static getSessionMetadata(): SessionMetadata | null {
//     let stored = sessionStorage.getItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
//     if (!stored) {
//       stored = localStorage.getItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
//     }
//     if (stored) {
//       try {
//         return JSON.parse(stored);
//       } catch {
//         return null;
//       }
//     }
//     return null;
//   }

//   static clearSessionData(): void {
//     sessionStorage.removeItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
//     sessionStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
//     localStorage.removeItem(SESSION_CONFIG.SESSION_STORAGE_KEY);
//     localStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
//   }

//   static updateLastActivity(): void {
//     const metadata = this.getSessionMetadata();
//     if (metadata) {
//       const oldActivityTime = metadata.lastActivityAt;
//       metadata.lastActivityAt = Date.now();
//       this.storeSessionMetadata(metadata);
//       if (Date.now() - oldActivityTime > 5000) {
//         console.log(
//           "[SessionManager] Activity updated (5+ seconds since last update)"
//         );
//       }
//     }
//   }

//   static getSessionTimeoutMs(metadata: SessionMetadata): number {
//     return metadata.sessionTimeoutMinutes * 60 * 1000;
//   }

//   static isSessionExpired(metadata: SessionMetadata): boolean {
//     const inactivity = Date.now() - metadata.lastActivityAt;
//     const max = metadata.rememberMe
//       ? 24 * 60 * 60 * 1000
//       : this.getSessionTimeoutMs(metadata);
//     return inactivity > max;
//   }
// }

// export const useCookieAuthStore = create<AuthState>()((set, get) => ({
//   user: null,
//   isAuthenticated: false,
//   isAdmin: false,
//   userPermissions: null,
//   csrfToken: null,
//   isLoading: false,
//   initialized: false,
//   sessionMetadata: null,
//   rememberMeEnabled: false,

//   login: async (credentials: LoginCredentials, rememberMe = false) => {
//     set({ isLoading: true });
//     try {
//       const sessionMetadata = SessionManager.createSessionMetadata(
//         rememberMe,
//         0 // placeholder, will be set from backend
//       );

//       const response = await axiosInstance.post(
//         `${API_URL}/auth/login`,
//         credentials,
//         { withCredentials: true }
//       );

//       if (response.data.requires2FA) {
//         sessionStorage.setItem("twoFAEmail", response.data.email);
//         sessionStorage.setItem(
//           "temp_session_metadata",
//           JSON.stringify(sessionMetadata)
//         );
//         throw new Error("2FA_REQUIRED");
//       }

//       const { user, csrf_token } = response.data;
//       const isAdmin = user.role === UserRole.ADMIN;

//       const backendSessionTimeout = user.session_timeout ?? 30;
//       sessionMetadata.sessionTimeoutMinutes = backendSessionTimeout;
//       console.log(
//         "[Login] Session timeout set to",
//         backendSessionTimeout,
//         "minutes from backend"
//       );

//       if (response.data.session_id) {
//         sessionMetadata.backendSessionId = response.data.session_id;
//       }

//       SessionManager.storeSessionMetadata(sessionMetadata);

//       set({
//         user,
//         isAuthenticated: true,
//         isAdmin,
//         csrfToken: csrf_token,
//         isLoading: false,
//         sessionMetadata,
//         rememberMeEnabled: rememberMe,
//         initialized: true,
//       });

//       if (csrf_token) {
//         axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
//       }

//       await get().loadUserPermissions();
//     } catch (error: any) {
//       set({ isLoading: false });
//       throw error;
//     }
//   },

//   logout: async () => {
//     try {
//       const { csrfToken, sessionMetadata } = get();

//       const headers: Record<string, string> = {};
//       if (csrfToken) {
//         headers["X-CSRF-Token"] = csrfToken;
//       }
//       if (sessionMetadata?.backendSessionId) {
//         headers["X-Session-Id"] = sessionMetadata.backendSessionId;
//       }

//       await axiosInstance.post(
//         `${API_URL}/auth/logout`,
//         {},
//         { withCredentials: true, headers }
//       );
//     } catch {
//       // Continue with frontend logout even if backend call fails
//     }

//     sessionStorage.removeItem("auth_session");
//     localStorage.setItem("SESSION_INVALIDATED", "1");
//     setTimeout(() => localStorage.removeItem("SESSION_INVALIDATED"), 100);

//     sessionStorage.setItem("LOGGED_OUT", "1");

//     SessionManager.clearSessionData();
//     delete axiosInstance.defaults.headers.common["X-CSRF-Token"];

//     set({
//       user: null,
//       isAuthenticated: false,
//       isAdmin: false,
//       csrfToken: null,
//       userPermissions: null,
//       sessionMetadata: null,
//       initialized: true,
//     });

//     window.location.href = "/login";
//   },

//   validateSession: async () => {
//     const metadata = SessionManager.getSessionMetadata();

//     if (!metadata) {
//       return true;
//     }

//     if (!SessionManager.validateDeviceFingerprint(metadata.deviceFingerprint)) {
//       await get().logout();
//       return false;
//     }

//     if (SessionManager.isSessionExpired(metadata)) {
//       await get().logout();
//       return false;
//     }

//     return true;
//   },

//   rotateTokens: async () => {
//     try {
//       const isValid = await get().validateSession();
//       if (!isValid) {
//         return false;
//       }

//       const response = await axiosInstance.post(
//         `${API_URL}/auth/refresh`,
//         {},
//         { withCredentials: true }
//       );
//       const { csrf_token } = response.data;

//       set({ csrfToken: csrf_token });
//       if (csrf_token) {
//         axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
//       }

//       SessionManager.updateLastActivity();
//       return true;
//     } catch {
//       return false;
//     }
//   },

//   extendSession: async () => {
//     const metadata = SessionManager.getSessionMetadata();
//     if (metadata && metadata.rememberMe) {
//       metadata.lastActivityAt = Date.now();
//       SessionManager.storeSessionMetadata(metadata);
//       set({ sessionMetadata: metadata });
//     }
//   },

//   clearRememberMe: () => {
//     sessionStorage.removeItem(SESSION_CONFIG.REMEMBER_ME_STORAGE_KEY);
//     set({ rememberMeEnabled: false });
//   },

//   checkAuthStatus: async () => {
//     if (sessionStorage.getItem("LOGGED_OUT") === "1") {
//       return false;
//     }

//     set({ isLoading: true });

//     const clearSession = () => {
//       delete axiosInstance.defaults.headers.common["X-CSRF-Token"];
//       SessionManager.clearSessionData();
//       sessionStorage.removeItem("LOGGED_OUT");
//       set({
//         user: null,
//         isAuthenticated: false,
//         isAdmin: false,
//         userPermissions: null,
//         csrfToken: null,
//         sessionMetadata: null,
//         rememberMeEnabled: false,
//         isLoading: false,
//         initialized: true,
//       });
//     };

//     try {
//       const validSession = await get().validateSession();
//       if (!validSession) {
//         clearSession();
//         return false;
//       }
//     } catch {
//       clearSession();
//       return false;
//     }

//     try {
//       const response = await axiosInstance.get(`${API_URL}/auth/me`, {
//         withCredentials: true,
//       });

//       const user = response.data;
//       const isAdmin = user?.role === UserRole.ADMIN;

//       const metadata = SessionManager.getSessionMetadata();
//       if (metadata && user.session_timeout) {
//         metadata.sessionTimeoutMinutes = user.session_timeout ?? 30;
//         SessionManager.storeSessionMetadata(metadata);
//         console.log(
//           "[checkAuthStatus] Updated session timeout to",
//           metadata.sessionTimeoutMinutes,
//           "minutes"
//         );
//       }

//       set({
//         user,
//         isAuthenticated: true,
//         isAdmin,
//         isLoading: false,
//         initialized: true,
//         sessionMetadata: metadata,
//       });

//       if (user?.csrf_token) {
//         axiosInstance.defaults.headers.common["X-CSRF-Token"] = user.csrf_token;
//         set({ csrfToken: user.csrf_token });
//       }

//       SessionManager.updateLastActivity();
//       await get().loadUserPermissions();
//       return true;
//     } catch (error: any) {
//       if (
//         error?.response?.status === 401 &&
//         !sessionStorage.getItem("LOGGED_OUT")
//       ) {
//         const refreshed = await get().refreshToken();
//         if (refreshed) {
//           try {
//             const response = await axiosInstance.get(`${API_URL}/auth/me`, {
//               withCredentials: true,
//             });

//             const user = response.data;
//             const isAdmin = user?.role === UserRole.ADMIN;

//             const metadata = SessionManager.getSessionMetadata();
//             if (metadata && user.session_timeout) {
//               metadata.sessionTimeoutMinutes = user.session_timeout ?? 30;
//               SessionManager.storeSessionMetadata(metadata);
//               console.log(
//                 "[checkAuthStatus-refresh] Updated session timeout to",
//                 metadata.sessionTimeoutMinutes,
//                 "minutes"
//               );
//             }

//             set({
//               user,
//               isAuthenticated: true,
//               isAdmin,
//               isLoading: false,
//               initialized: true,
//               sessionMetadata: metadata,
//             });

//             SessionManager.updateLastActivity();
//             await get().loadUserPermissions();
//             return true;
//           } catch {
//             clearSession();
//             return false;
//           }
//         }
//       }

//       clearSession();
//       return false;
//     }
//   },

//   refreshToken: async () => {
//     try {
//       // Step 1: Refresh access token
//       const refreshResponse = await axiosInstance.post(
//         `${API_URL}/auth/refresh`,
//         {},
//         { withCredentials: true }
//       );
//       const { csrf_token } = refreshResponse.data;

//       set({ csrfToken: csrf_token });
//       if (csrf_token) {
//         axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
//       }

//       SessionManager.updateLastActivity();

//       // Step 2: CRITICAL — Validate session against backend
//       const sessionMetadata = SessionManager.getSessionMetadata();
//       if (!sessionMetadata?.backendSessionId) {
//         console.warn("No backend session ID, skipping validation");
//         // Optionally fallback to /auth/me
//       } else {
//         try {
//           const validateResponse = await axiosInstance.post(
//             `${API_URL}/sessions/validate`,
//             {},
//             {
//               headers: { "X-Session-Id": sessionMetadata.backendSessionId },
//               withCredentials: true,
//             }
//           );

//           const { is_valid, is_expired, requires_logout } =
//             validateResponse.data;

//           if (!is_valid || is_expired || requires_logout) {
//             console.log(
//               "[refreshToken] Backend session invalid → forcing logout"
//             );
//             await get().logout();
//             return false;
//           }
//         } catch (err: any) {
//           if (err.response?.status === 401) {
//             console.log("[refreshToken] Session validation failed → logout");
//             await get().logout();
//             return false;
//           }
//           // Non-401 errors: continue (don't block refresh)
//         }
//       }

//       // Step 3: Load user data
//       const userResponse = await axiosInstance.get(`${API_URL}/auth/me`, {
//         withCredentials: true,
//       });
//       const user = userResponse.data;
//       const isAdmin = user?.role === UserRole.ADMIN;

//       set({
//         user,
//         isAuthenticated: true,
//         isAdmin,
//         initialized: true,
//       });

//       await get().loadUserPermissions();
//       return true;
//     } catch (error) {
//       console.error("[refreshToken] Failed:", error);
//       return false;
//     }
//   },

//   loadUserPermissions: async () => {
//     try {
//       const { csrfToken } = get();
//       const response = await axiosInstance.get(`${API_URL}/permissions/me`, {
//         withCredentials: true,
//         headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
//       });
//       set({ userPermissions: response.data.permissions });
//     } catch {
//       // set({ userPermissions: null });
//     }
//   },

//   getCsrfToken: () => {
//     return get().csrfToken;
//   },

//   setInitialized: (value: boolean) => {
//     set({ initialized: value });
//   },

//   checkAuth: async () => {
//     try {
//       if (sessionStorage.getItem("LOGGED_OUT") === "1") {
//         return false;
//       }

//       set({ isLoading: true });

//       const clearSession = () => {
//         delete axiosInstance.defaults.headers.common["X-CSRF-Token"];
//         SessionManager.clearSessionData();
//         sessionStorage.removeItem("LOGGED_OUT");
//         set({
//           user: null,
//           isAuthenticated: false,
//           isAdmin: false,
//           userPermissions: null,
//           csrfToken: null,
//           sessionMetadata: null,
//           rememberMeEnabled: false,
//           isLoading: false,
//           initialized: true,
//         });
//       };

//       try {
//         const validSession = await get().validateSession();
//         if (!validSession) {
//           clearSession();
//           return false;
//         }
//       } catch {
//         clearSession();
//         return false;
//       }

//       try {
//         const response = await axiosInstance.get(`${API_URL}/auth/me`, {
//           withCredentials: true,
//         });

//         const user = response.data;
//         const isAdmin = user?.role === UserRole.ADMIN;

//         const metadata = SessionManager.getSessionMetadata();
//         if (metadata && user.session_timeout) {
//           metadata.sessionTimeoutMinutes = user.session_timeout ?? 30;
//           SessionManager.storeSessionMetadata(metadata);
//         }

//         set({
//           user,
//           isAuthenticated: true,
//           isAdmin,
//           isLoading: false,
//           initialized: true,
//           sessionMetadata: metadata,
//         });

//         if (user?.csrf_token) {
//           axiosInstance.defaults.headers.common["X-CSRF-Token"] =
//             user.csrf_token;
//           set({ csrfToken: user.csrf_token });
//         }

//         SessionManager.updateLastActivity();
//         await get().loadUserPermissions();
//         return true;
//       } catch (error: any) {
//         if (error?.response?.status === 401) {
//           if (!sessionStorage.getItem("LOGGED_OUT")) {
//             const refreshed = await get().refreshToken();
//             if (refreshed) {
//               try {
//                 const response = await axiosInstance.get(`${API_URL}/auth/me`, {
//                   withCredentials: true,
//                 });

//                 const user = response.data;
//                 const isAdmin = user?.role === UserRole.ADMIN;

//                 const metadata = SessionManager.getSessionMetadata();
//                 if (metadata && user.session_timeout) {
//                   metadata.sessionTimeoutMinutes = user.session_timeout ?? 30;
//                   SessionManager.storeSessionMetadata(metadata);
//                 }

//                 set({
//                   user,
//                   isAuthenticated: true,
//                   isAdmin,
//                   isLoading: false,
//                   initialized: true,
//                   sessionMetadata: metadata,
//                 });

//                 SessionManager.updateLastActivity();
//                 await get().loadUserPermissions();
//                 return true;
//               } catch {
//                 clearSession();
//                 return false;
//               }
//             }
//           }
//         }

//         clearSession();
//         return false;
//       }
//     } catch {
//       return false;
//     }
//   },
// }));

// export const verify2FA = async (email: string, code: string) => {
//   try {
//     const response = await axiosInstance.post(
//       `${API_URL}/auth/2fa/verify`,
//       { email, code },
//       { withCredentials: true }
//     );

//     const { user, csrf_token } = response.data;
//     const isAdmin = user?.role === UserRole.ADMIN;

//     const tempMetadata = sessionStorage.getItem("temp_session_metadata");
//     let sessionMetadata;
//     if (tempMetadata) {
//       sessionMetadata = JSON.parse(tempMetadata);
//     } else {
//       sessionMetadata = SessionManager.createSessionMetadata(false, 0);
//     }

//     const backendSessionTimeout = user.session_timeout ?? 30;
//     sessionMetadata.sessionTimeoutMinutes = backendSessionTimeout;
//     console.log(
//       "[verify2FA] Session timeout set to",
//       backendSessionTimeout,
//       "minutes from backend"
//     );

//     SessionManager.storeSessionMetadata(sessionMetadata);
//     useCookieAuthStore.setState({
//       user,
//       isAuthenticated: true,
//       isAdmin,
//       csrfToken: csrf_token,
//       sessionMetadata,
//       rememberMeEnabled: sessionMetadata.rememberMe,
//       initialized: true,
//     });

//     if (csrf_token) {
//       axiosInstance.defaults.headers.common["X-CSRF-Token"] = csrf_token;
//     }

//     sessionStorage.removeItem("temp_session_metadata");
//     await useCookieAuthStore.getState().loadUserPermissions();

//     return { user, success: true };
//   } catch (error: any) {
//     throw error;
//   }
// };

// // Token refresh queue
// const isRefreshing = false;
// let failedQueue: Array<{
//   resolve: (value?: any) => void;
//   reject: (error?: any) => void;
// }> = [];

// const processQueue = (error: any, token: string | null = null) => {
//   failedQueue.forEach(({ resolve, reject }) => {
//     if (error) {
//       reject(error);
//     } else {
//       resolve(token);
//     }
//   });
//   failedQueue = [];
// };

// // Axios interceptor
// axiosInstance.interceptors.response.use(
//   (response) => {
//     SessionManager.updateLastActivity();
//     return response;
//   },
//   async (error) => {
//     const originalRequest = error.config;

//     if (error.response?.status === 401 && !originalRequest._retry) {
//       if (
//         error.response?.data?.message?.includes("session") ||
//         error.response?.data?.message?.includes("expired")
//       ) {
//         console.log(
//           "[AxiosInterceptor] Backend session expired - forcing logout"
//         );
//         await useCookieAuthStore.getState().logout();
//         return Promise.reject(error);
//       }

//       return Promise.reject(error);
//     }

//     return Promise.reject(error);
//   }
// );

// // Activity listeners
// ["mousemove", "keypress", "click", "scroll", "touchstart"].forEach((event) => {
//   document.addEventListener(
//     event,
//     () => {
//       SessionManager.updateLastActivity();
//     },
//     { passive: true }
//   );
// });

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
