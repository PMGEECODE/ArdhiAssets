import type {
  LoginCredentials,
  MFAVerification,
  AuthResponse,
  User,
} from "../../features/auth/types/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

class ApiService {
  private accessToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || this.accessToken;
  }

  setRefreshToken(token: string | null) {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    const token = localStorage.getItem(ACCESS_TOKEN_KEY) || this.accessToken;
    if (token && !endpoint.includes("/refresh")) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const csrfToken = this.getCookie("csrf_token");
    if (
      csrfToken &&
      (options.method === "POST" ||
        options.method === "PUT" ||
        options.method === "DELETE")
    ) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: "An error occurred",
      }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null;
    }
    return null;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async verifyMFA(data: MFAVerification): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async refresh(): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/refresh", {
      method: "POST",
    });
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", {
      method: "POST",
    });
    this.accessToken = null;
    this.setRefreshToken(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>("/auth/me");
  }
}

export const api = new ApiService();
