import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type AssetCategoryType, PermissionLevel } from "../types";

interface PermissionState {
  userPermissions: Record<
    string,
    {
      has_access: boolean;
      permission_level: string;
      can_read: boolean;
      can_write: boolean;
      can_admin: boolean;
      expires_at?: string;
    }
  >;
  setUserPermissions: (permissions: Record<string, any>) => void;
  hasPermission: (
    category: AssetCategoryType,
    level?: PermissionLevel
  ) => boolean;
  canAccessCategory: (category: AssetCategoryType) => boolean;
  getPermissionLevel: (category: AssetCategoryType) => PermissionLevel;
  clearPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      userPermissions: {},

      setUserPermissions: (permissions) => {
        set({ userPermissions: permissions });
      },

      hasPermission: (
        category: AssetCategoryType,
        level: PermissionLevel = PermissionLevel.READ
      ) => {
        const { userPermissions } = get();
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
      },

      canAccessCategory: (category: AssetCategoryType) => {
        const { userPermissions } = get();
        const permission = userPermissions[category];
        return permission?.has_access || false;
      },

      getPermissionLevel: (category: AssetCategoryType) => {
        const { userPermissions } = get();
        const permission = userPermissions[category];
        return (
          (permission?.permission_level as PermissionLevel) ||
          PermissionLevel.NONE
        );
      },

      clearPermissions: () => {
        set({ userPermissions: {} });
      },
    }),
    {
      name: "permission-storage",
      partialize: (state) => ({
        userPermissions: state.userPermissions,
      }),
    }
  )
);
