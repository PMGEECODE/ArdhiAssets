import { useCookieAuthStore } from "../../../shared/store/cookieAuthStore";
import { type AssetCategoryType, PermissionLevel } from "../../../shared/types";

export const usePermissions = () => {
  const { userPermissions, isAdmin } = useCookieAuthStore();

  const hasPermission = (
    category: AssetCategoryType,
    level: PermissionLevel = PermissionLevel.READ
  ): boolean => {
    // Admin users have full access
    if (isAdmin) return true;

    const permission = userPermissions?.[category];
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
  };

  const canAccessCategory = (category: AssetCategoryType): boolean => {
    if (isAdmin) return true;
    return userPermissions?.[category]?.has_access || false;
  };

  const getPermissionLevel = (category: AssetCategoryType): PermissionLevel => {
    if (isAdmin) return PermissionLevel.ADMIN;
    const permission = userPermissions?.[category];
    return (
      (permission?.permission_level as PermissionLevel) || PermissionLevel.NONE
    );
  };

  const isExpired = (category: AssetCategoryType): boolean => {
    const permission = userPermissions?.[category];
    if (!permission?.expires_at) return false;
    return new Date() > new Date(permission.expires_at);
  };

  return {
    hasPermission,
    canAccessCategory,
    getPermissionLevel,
    isExpired,
    userPermissions,
    isAdmin,
  };
};
