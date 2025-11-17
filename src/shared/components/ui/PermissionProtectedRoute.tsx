import type React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useCookieAuthStore } from "../../store/cookieAuthStore";
import { type AssetCategoryType, PermissionLevel } from "../../types";
import { usePermissions } from "../../../features/auth/hooks/usePermissions";
import AccessDenied from "./AccessDenied";

interface PermissionProtectedRouteProps {
  children?: React.ReactNode;
  requiredCategory?: AssetCategoryType;
  category?: AssetCategoryType; // Added for backward compatibility
  requiredLevel?: PermissionLevel;
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

const PermissionProtectedRoute: React.FC<PermissionProtectedRouteProps> = ({
  children,
  requiredCategory,
  category, // Support legacy prop name
  requiredLevel = PermissionLevel.READ,
  fallbackPath = "/dashboard",
  showAccessDenied = true,
}) => {
  const { isAdmin } = useCookieAuthStore();
  const { hasPermission } = usePermissions();
  const location = useLocation();

  const categoryToCheck = requiredCategory || category;

  // Admin users have access to everything
  if (isAdmin) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (!categoryToCheck) {
    return children ? <>{children}</> : <Outlet />;
  }

  // Check if user has required permission
  if (!hasPermission(categoryToCheck, requiredLevel)) {
    if (showAccessDenied) {
      return (
        <AccessDenied
          message={`You don't have permission to access ${categoryToCheck
            .toLowerCase()
            .replace(/_/g, " ")} resources.`}
        />
      );
    }
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default PermissionProtectedRoute;
