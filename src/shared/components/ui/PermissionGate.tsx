import type React from "react";
import { Lock, AlertTriangle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { type AssetCategoryType, PermissionLevel } from "../../types";

interface PermissionGateProps {
  category: AssetCategoryType;
  requiredLevel?: PermissionLevel;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLockMessage?: boolean;
}

const PermissionGate: React.FC<PermissionGateProps> = ({
  category,
  requiredLevel = PermissionLevel.READ,
  children,
  fallback,
  showLockMessage = true,
}) => {
  const { userPermissions, isAdmin } = useAuthStore();

  // Admin users have access to everything
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check if user has required permission
  const permission = userPermissions?.[category];
  const hasAccess = permission?.has_access || false;

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showLockMessage) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-gray-200">
          <Lock className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-500 text-center">
            You don't have permission to access this asset category.
            <br />
            Contact your administrator for access.
          </p>
        </div>
      );
    }

    return null;
  }

  // Check specific permission level
  let hasRequiredLevel = false;
  switch (requiredLevel) {
    case PermissionLevel.READ:
      hasRequiredLevel = permission?.can_read || false;
      break;
    case PermissionLevel.WRITE:
      hasRequiredLevel = permission?.can_write || false;
      break;
    case PermissionLevel.ADMIN:
      hasRequiredLevel = permission?.can_admin || false;
      break;
    default:
      hasRequiredLevel = true;
  }

  if (!hasRequiredLevel) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showLockMessage) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-yellow-50 rounded-lg border-2 border-yellow-200">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold text-yellow-700 mb-2">
            Insufficient Permissions
          </h3>
          <p className="text-yellow-600 text-center">
            You have read-only access to this category.
            <br />
            Contact your administrator for write access.
          </p>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
};

export default PermissionGate;
