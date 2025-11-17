import { LoginCredentials, MFAVerification, AuthResponse, User } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiService {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.accessToken && !endpoint.includes('/refresh')) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const csrfToken = this.getCookie('csrf_token');
    if (csrfToken && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'An error occurred'
      }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async verifyMFA(data: MFAVerification): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refresh(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', {
      method: 'POST',
    });
    this.accessToken = null;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }
}

export const api = new ApiService();
