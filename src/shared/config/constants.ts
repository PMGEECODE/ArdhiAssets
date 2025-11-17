export const API_URL =
  import.meta.env.VITE_API_URL || "https://assets-system-sigma.vercel.app/api";

export const AUTH_CONFIG = {
  BRUTE_FORCE_KEY_PREFIX: "bf_attempts",
  REMEMBER_FLAG_KEY: "auth_remember_flag",
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_TTL_MS: 15 * 60 * 1000,
  MIN_PASSWORD_LENGTH: 8,
} as const;

export const APP_NAME =
  import.meta.env.VITE_APP_NAME || "Device Management System";
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.1.0";
export const DEFAULT_PAGE_SIZE =
  Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 10;
export const DATE_FORMAT = "dd MMM yyyy, HH:mm:ss";
export const JWT_TIMEOUT = 60 * 60 * 1000;

// =======================
// Cookie & CSRF Config
// =======================

export const COOKIE_AUTH_CONFIG = {
  USE_COOKIES: true,
  CSRF_HEADER: "X-CSRF-Token",
  ACCESS_TOKEN_COOKIE: "access_token",
  REFRESH_TOKEN_COOKIE: "refresh_token",
  CSRF_TOKEN_COOKIE: "csrf_token",
};

// =======================
// Utility Functions
// =======================

export const getCsrfTokenFromCookie = (): string | null => {
  const name = `${COOKIE_AUTH_CONFIG.CSRF_TOKEN_COOKIE}=`;
  return (
    document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(name))
      ?.substring(name.length) || null
  );
};

export const isAuthenticatedViaCookie = (): boolean => {
  return document.cookie
    .split(";")
    .some((c) =>
      c.trim().startsWith(`${COOKIE_AUTH_CONFIG.ACCESS_TOKEN_COOKIE}=`)
    );
};
