// // import axios, {
// //   type AxiosInstance,
// //   type AxiosError,
// //   type InternalAxiosRequestConfig,
// // } from "axios";
// // import { API_URL } from "../config/constants";
// // import { useCookieAuthStore } from "../../shared/store/cookieAuthStore";

// // let inMemoryToken: string | null = null;

// // export const setAuthToken = (token: string | null): void => {
// //   inMemoryToken = token;
// // };

// // const getCookie = (name: string): string | null => {
// //   const value = `; ${document.cookie}`;
// //   const parts = value.split(`; ${name}=`);
// //   return parts.length === 2 ? parts.pop()?.split(";").shift() ?? null : null;
// // };

// // const axiosInstance: AxiosInstance = axios.create({
// //   baseURL: API_URL,
// //   withCredentials: true,
// //   headers: {
// //     "Content-Type": "application/json",
// //   },
// // });

// // axiosInstance.interceptors.request.use(
// //   (config: InternalAxiosRequestConfig) => {
// //     if (inMemoryToken) {
// //       config.headers.Authorization = `Bearer ${inMemoryToken}`;
// //     }

// //     const csrfToken = getCookie("csrf_token");
// //     const method = config.method?.toUpperCase();
// //     if (
// //       csrfToken &&
// //       ["POST", "PUT", "DELETE", "PATCH"].includes(method || "")
// //     ) {
// //       config.headers["X-CSRF-Token"] = csrfToken;
// //     }

// //     const { sessionMetadata } = useCookieAuthStore.getState();
// //     if (sessionMetadata?.backendSessionId) {
// //       config.headers["X-Session-Id"] = sessionMetadata.backendSessionId;
// //     }

// //     return config;
// //   },
// //   (error) => Promise.reject(error)
// // );

// // axiosInstance.interceptors.response.use(
// //   (response) => response,
// //   async (error: AxiosError) => {
// //     const originalRequest = error.config as InternalAxiosRequestConfig & {
// //       _retry?: boolean;
// //     };

// //     if (error.response?.status === 401 && !originalRequest._retry) {
// //       const isLoggingOut = sessionStorage.getItem("LOGGED_OUT") === "true";
// //       if (isLoggingOut) return Promise.reject(error);

// //       originalRequest._retry = true;

// //       try {
// //         const { sessionMetadata } = useCookieAuthStore.getState();
// //         const sessionId = sessionMetadata?.backendSessionId;

// //         const refreshResponse = await axios.post(
// //           `${API_URL}/auth/refresh`,
// //           {},
// //           {
// //             withCredentials: true,
// //             headers: sessionId ? { "X-Session-Id": sessionId } : {},
// //           }
// //         );

// //         const authHeader = refreshResponse.headers["authorization"];
// //         const accessToken = authHeader?.startsWith("Bearer ")
// //           ? authHeader.slice(7)
// //           : null;
// //         const tokenFromBody = (refreshResponse.data as any)?.access_token;
// //         const newToken = accessToken ?? tokenFromBody;

// //         if (!newToken) throw new Error("Refresh did not return a token");

// //         setAuthToken(newToken);
// //         originalRequest.headers.Authorization = `Bearer ${newToken}`;

// //         return axiosInstance(originalRequest);
// //       } catch (refreshErr: any) {
// //         sessionStorage.removeItem("LOGGED_OUT");

// //         try {
// //           const { logout } = useCookieAuthStore.getState();
// //           if (typeof logout === "function") {
// //             logout();
// //           }
// //         } catch (logoutErr) {}

// //         setAuthToken(null);

// //         return Promise.reject(refreshErr);
// //       }
// //     }

// //     if (error.response?.status === 403) {
// //     }

// //     return Promise.reject(error);
// //   }
// // );

// // export default axiosInstance;

// // // // src/shared/lib/axiosInstance.ts

// import axios, {
//   type AxiosInstance,
//   type AxiosError,
//   type InternalAxiosRequestConfig,
// } from "axios";
// import { API_URL } from "../config/constants";
// import { useCookieAuthStore } from "../../shared/store/cookieAuthStore";

// /* ------------------------------------------------------------------ */
// /* In-memory token – used only for the Authorization header          */
// /* ------------------------------------------------------------------ */
// let inMemoryToken: string | null = null;

// export const setAuthToken = (token: string | null): void => {
//   inMemoryToken = token;
// };

// /* ------------------------------------------------------------------ */
// /* Helper – read a cookie by name                                      */
// /* ------------------------------------------------------------------ */
// const getCookie = (name: string): string | null => {
//   const value = `; ${document.cookie}`;
//   const parts = value.split(`; ${name}=`);
//   return parts.length === 2 ? parts.pop()?.split(";").shift() ?? null : null;
// };

// /* ------------------------------------------------------------------ */
// /* Axios instance                                                     */
// /* ------------------------------------------------------------------ */
// const axiosInstance: AxiosInstance = axios.create({
//   baseURL: API_URL,
//   withCredentials: true,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// /* ------------------------------------------------------------------ */
// /* REQUEST INTERCEPTOR – add auth, CSRF, session-id                   */
// /* ------------------------------------------------------------------ */
// axiosInstance.interceptors.request.use(
//   (config: InternalAxiosRequestConfig) => {
//     // ---- Authorization ------------------------------------------------
//     if (inMemoryToken) {
//       config.headers.Authorization = `Bearer ${inMemoryToken}`;
//     }

//     // ---- CSRF (POST/PUT/DELETE/PATCH) --------------------------------
//     const csrfToken = getCookie("csrf_token");
//     const method = config.method?.toUpperCase();
//     if (
//       csrfToken &&
//       ["POST", "PUT", "DELETE", "PATCH"].includes(method || "")
//     ) {
//       config.headers["X-CSRF-Token"] = csrfToken;
//     }

//     // ---- X-Session-Id (backend-driven session) -----------------------
//     const { sessionMetadata } = useCookieAuthStore.getState();
//     if (sessionMetadata?.backendSessionId) {
//       config.headers["X-Session-Id"] = sessionMetadata.backendSessionId;
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// /* ------------------------------------------------------------------ */
// /* RESPONSE INTERCEPTOR – refresh token + session-expiry detection   */
// /* ------------------------------------------------------------------ */
// axiosInstance.interceptors.response.use(
//   (response) => response,
//   async (error: AxiosError) => {
//     const originalRequest = error.config as InternalAxiosRequestConfig & {
//       _retry?: boolean;
//     };

//     /* --------------------------------------------------------------
//        401 – could be expired access token OR expired *session*.
//        We try a refresh **once**. If the refresh itself returns 401
//        we know the backend session is dead → logout.
//        -------------------------------------------------------------- */
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       const isLoggingOut = sessionStorage.getItem("LOGGED_OUT") === "true";
//       if (isLoggingOut) return Promise.reject(error);

//       originalRequest._retry = true;

//       try {
//         const { sessionMetadata } = useCookieAuthStore.getState();
//         const sessionId = sessionMetadata?.backendSessionId;

//         const refreshResponse = await axios.post(
//           `${API_URL}/auth/refresh`,
//           {},
//           {
//             withCredentials: true,
//             headers: sessionId ? { "X-Session-Id": sessionId } : {},
//           }
//         );

//         // Extract new access token (header or body)
//         const authHeader = refreshResponse.headers["authorization"];
//         const accessToken = authHeader?.startsWith("Bearer ")
//           ? authHeader.slice(7)
//           : null;
//         const tokenFromBody = (refreshResponse.data as any)?.access_token;
//         const newToken = accessToken ?? tokenFromBody;

//         if (!newToken) throw new Error("Refresh did not return a token");

//         setAuthToken(newToken);
//         originalRequest.headers.Authorization = `Bearer ${newToken}`;

//         // Retry original request with fresh token
//         return axiosInstance(originalRequest);
//       } catch (refreshErr: any) {
//         console.error("[Axios] Refresh token request failed:", {
//           status: refreshErr?.response?.status,
//           statusText: refreshErr?.response?.statusText,
//           data: refreshErr?.response?.data,
//           message: refreshErr?.message,
//           code: refreshErr?.code,
//         });

//         sessionStorage.removeItem("LOGGED_OUT");

//         try {
//           const { logout } = useCookieAuthStore.getState();
//           if (typeof logout === "function") {
//             // Enhanced logging to show session terminated by backend
//             const reason =
//               refreshErr?.response?.data?.detail || "backend session expired";
//             console.warn(
//               "[Axios] Session expired (refresh failed) → executing logout. Reason:",
//               reason
//             );
//             logout();
//           } else {
//             console.error(
//               "[Axios] Logout function not available in store state"
//             );
//           }
//         } catch (logoutErr) {
//           console.error(
//             "[Axios] Error calling logout after refresh failure:",
//             logoutErr
//           );
//         }

//         // Clean in-memory token so no stale header is sent later
//         setAuthToken(null);

//         return Promise.reject(refreshErr);
//       }
//     }

//     /* --------------------------------------------------------------
//        403 – permission denied (keep original error)
//        -------------------------------------------------------------- */
//     if (error.response?.status === 403) {
//       console.error("Access denied:", error.response.data);
//     }

//     return Promise.reject(error);
//   }
// );

// export default axiosInstance;

// // // src/shared/lib/axiosInstance.ts

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_URL } from "../config/constants";
import { useCookieAuthStore } from "../../shared/store/cookieAuthStore";

/* ------------------------------------------------------------------ */
/* In-memory token – used only for the Authorization header          */
/* ------------------------------------------------------------------ */
let inMemoryToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  inMemoryToken = token;
};

/* ------------------------------------------------------------------ */
/* Helper – read a cookie by name                                      */
/* ------------------------------------------------------------------ */
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop()?.split(";").shift() ?? null : null;
};

/* ------------------------------------------------------------------ */
/* Axios instance                                                     */
/* ------------------------------------------------------------------ */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ------------------------------------------------------------------ */
/* REQUEST INTERCEPTOR – add auth, CSRF, session-id                   */
/* ------------------------------------------------------------------ */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // ---- Authorization ------------------------------------------------
    if (inMemoryToken) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }

    // ---- CSRF (POST/PUT/DELETE/PATCH) --------------------------------
    const csrfToken = getCookie("csrf_token");
    const method = config.method?.toUpperCase();
    if (
      csrfToken &&
      ["POST", "PUT", "DELETE", "PATCH"].includes(method || "")
    ) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }

    // ---- X-Session-Id (backend-driven session) -----------------------
    const { sessionMetadata } = useCookieAuthStore.getState();
    if (sessionMetadata?.backendSessionId) {
      config.headers["X-Session-Id"] = sessionMetadata.backendSessionId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ------------------------------------------------------------------ */
/* RESPONSE INTERCEPTOR – refresh token + session-expiry detection   */
/* ------------------------------------------------------------------ */
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    /* --------------------------------------------------------------
       401 – could be expired access token OR expired *session*.
       We try a refresh **once**. If the refresh itself returns 401
       we know the backend session is dead → logout.
       -------------------------------------------------------------- */
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isLoggingOut = sessionStorage.getItem("LOGGED_OUT") === "true";
      if (isLoggingOut) return Promise.reject(error);

      originalRequest._retry = true;

      try {
        const { sessionMetadata } = useCookieAuthStore.getState();
        const sessionId = sessionMetadata?.backendSessionId;

        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: sessionId ? { "X-Session-Id": sessionId } : {},
          }
        );

        // Extract new access token (header or body)
        const authHeader = refreshResponse.headers["authorization"];
        const accessToken = authHeader?.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null;
        const tokenFromBody = (refreshResponse.data as any)?.access_token;
        const newToken = accessToken ?? tokenFromBody;

        if (!newToken) throw new Error("Refresh did not return a token");

        setAuthToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Retry original request with fresh token
        return axiosInstance(originalRequest);
      } catch (refreshErr: any) {
        console.error("[Axios] Refresh token request failed:", {
          status: refreshErr?.response?.status,
          statusText: refreshErr?.response?.statusText,
          data: refreshErr?.response?.data,
          message: refreshErr?.message,
          code: refreshErr?.code,
        });

        sessionStorage.removeItem("LOGGED_OUT");

        const isSessionTerminated =
          refreshErr?.response?.data?.detail?.includes("session") ||
          refreshErr?.response?.data?.detail?.includes("terminated");

        if (isSessionTerminated) {
          console.warn("[Axios] Session was terminated by admin → logging out");
          sessionStorage.setItem("SESSION_TERMINATED_BY_ADMIN", "true");
        }

        try {
          const { logout } = useCookieAuthStore.getState();
          if (typeof logout === "function") {
            // Enhanced logging to show session terminated by backend
            const reason =
              refreshErr?.response?.data?.detail || "backend session expired";
            console.warn(
              "[Axios] Session expired (refresh failed) → executing logout. Reason:",
              reason
            );
            logout();
          } else {
            console.error(
              "[Axios] Logout function not available in store state"
            );
          }
        } catch (logoutErr) {
          console.error(
            "[Axios] Error calling logout after refresh failure:",
            logoutErr
          );
        }

        // Clean in-memory token so no stale header is sent later
        setAuthToken(null);

        return Promise.reject(refreshErr);
      }
    }

    /* --------------------------------------------------------------
       403 – permission denied (keep original error)
       -------------------------------------------------------------- */
    if (error.response?.status === 403) {
      console.error("Access denied:", error.response.data);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
