import { type AssetCategoryType, PermissionLevel } from "../types";
import {
  getCsrfTokenFromCookie,
  COOKIE_AUTH_CONFIG,
} from "../config/constants";

class PermissionService {
  private getToken(): string | null {
    // For cookie-based auth, we don't need to manually get the token
    // as it's automatically included in HTTP-only cookies

    // Check if using cookie-based auth
    if (COOKIE_AUTH_CONFIG.USE_COOKIES) {
      // For cookie auth, we don't need to manually handle tokens
      // They're automatically included via withCredentials
      return null;
    }

    // Fallback to localStorage for backward compatibility
    const storedAuth = localStorage.getItem("auth-storage");
    const parsed = storedAuth ? JSON.parse(storedAuth) : null;
    return parsed?.state?.token;
  }

  private async makeRequest(url: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (COOKIE_AUTH_CONFIG.USE_COOKIES) {
      // For cookie-based auth, add CSRF token if available
      const csrfToken = getCsrfTokenFromCookie();
      if (csrfToken) {
        headers[COOKIE_AUTH_CONFIG.CSRF_HEADER] = csrfToken;
      }
    } else {
      // For token-based auth, add Authorization header
      const token = this.getToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      ...options,
      credentials: "include", // Include cookies for cookie-based auth
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  async getUserPermissions(userId: string) {
    return this.makeRequest(`/permissions/user/${userId}`);
  }

  async getMyPermissions() {
    return this.makeRequest("/permissions/me");
  }

  async grantPermission(data: {
    user_id: string;
    category: AssetCategoryType;
    permission_level: PermissionLevel;
    reason?: string;
    notes?: string;
    expires_at?: string;
  }) {
    return this.makeRequest("/permissions/grant", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePermission(
    permissionId: string,
    data: {
      permission_level?: PermissionLevel;
      is_active?: boolean;
      reason?: string;
      notes?: string;
      expires_at?: string;
    }
  ) {
    return this.makeRequest(`/permissions/update/${permissionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async revokePermission(permissionId: string) {
    return this.makeRequest(`/permissions/revoke/${permissionId}`, {
      method: "DELETE",
    });
  }

  async bulkUpdatePermissions(data: {
    user_id: string;
    permissions: Array<{
      category: AssetCategoryType;
      permission_level: PermissionLevel;
    }>;
  }) {
    return this.makeRequest("/permissions/bulk-update", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getAvailableCategories() {
    return this.makeRequest("/permissions/categories");
  }

  async getPermissionLevels() {
    return this.makeRequest("/permissions/levels");
  }

  // Helper method to check if user has specific permission
  hasPermission(
    userPermissions: Record<string, any>,
    category: AssetCategoryType,
    level: PermissionLevel = PermissionLevel.READ
  ): boolean {
    const permission = userPermissions[category];
    if (!permission || !permission.has_access) return false;

    switch (level) {
      case PermissionLevel.READ:
        return permission.can_read;
      case PermissionLevel.WRITE:
        return permission.can_write;
      case PermissionLevel.ADMIN:
        return permission.can_admin;
      default:
        return false;
    }
  }

  // Helper method to check if user can access category
  canAccessCategory(
    userPermissions: Record<string, any>,
    category: AssetCategoryType
  ): boolean {
    return userPermissions[category]?.has_access || false;
  }
}

export const permissionService = new PermissionService();
