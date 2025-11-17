import { AssetCategoryType, PermissionLevel } from "../types";

// Map routes to required permissions
export const routePermissions: Record<
  string,
  { category: AssetCategoryType; level: PermissionLevel }
> = {
  "/devices": {
    category: AssetCategoryType.DEVICES,
    level: PermissionLevel.READ,
  },
  "/devices/new": {
    category: AssetCategoryType.DEVICES,
    level: PermissionLevel.WRITE,
  },
  "/devices/:id/edit": {
    category: AssetCategoryType.DEVICES,
    level: PermissionLevel.WRITE,
  },
  "/devices/:id/transfer": {
    category: AssetCategoryType.DEVICES,
    level: PermissionLevel.WRITE,
  },

  "/categories/land-register": {
    category: AssetCategoryType.LAND_REGISTER,
    level: PermissionLevel.READ,
  },
  "/categories/land-register/new": {
    category: AssetCategoryType.LAND_REGISTER,
    level: PermissionLevel.WRITE,
  },
  "/categories/land-register/:id/edit": {
    category: AssetCategoryType.LAND_REGISTER,
    level: PermissionLevel.WRITE,
  },

  "/categories/buildings": {
    category: AssetCategoryType.BUILDINGS_REGISTER,
    level: PermissionLevel.READ,
  },
  "/categories/buildings/new": {
    category: AssetCategoryType.BUILDINGS_REGISTER,
    level: PermissionLevel.WRITE,
  },
  "/categories/buildings/:id/edit": {
    category: AssetCategoryType.BUILDINGS_REGISTER,
    level: PermissionLevel.WRITE,
  },

  "/categories/vehicles": {
    category: AssetCategoryType.MOTOR_VEHICLES_REGISTER,
    level: PermissionLevel.READ,
  },
  "/categories/vehicles/new": {
    category: AssetCategoryType.MOTOR_VEHICLES_REGISTER,
    level: PermissionLevel.WRITE,
  },
  "/categories/vehicles/:id/edit": {
    category: AssetCategoryType.MOTOR_VEHICLES_REGISTER,
    level: PermissionLevel.WRITE,
  },

  "/categories/office-equipment": {
    category: AssetCategoryType.OFFICE_EQUIPMENT,
    level: PermissionLevel.READ,
  },
  "/categories/office-equipment/new": {
    category: AssetCategoryType.OFFICE_EQUIPMENT,
    level: PermissionLevel.WRITE,
  },
  "/categories/office-equipment/:id/edit": {
    category: AssetCategoryType.OFFICE_EQUIPMENT,
    level: PermissionLevel.WRITE,
  },

  "/categories/furniture-equipment": {
    category: AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT,
    level: PermissionLevel.READ,
  },
  "/categories/furniture-equipment/new": {
    category: AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT,
    level: PermissionLevel.WRITE,
  },
  "/categories/furniture-equipment/:id/edit": {
    category: AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT,
    level: PermissionLevel.WRITE,
  },

  "/categories/plant-machinery": {
    category: AssetCategoryType.PLANT_MACHINERY,
    level: PermissionLevel.READ,
  },
  "/categories/plant-machinery/new": {
    category: AssetCategoryType.PLANT_MACHINERY,
    level: PermissionLevel.WRITE,
  },
  "/categories/plant-machinery/:id/edit": {
    category: AssetCategoryType.PLANT_MACHINERY,
    level: PermissionLevel.WRITE,
  },

  "/categories/portable-items": {
    category: AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS,
    level: PermissionLevel.READ,
  },
  "/categories/portable-items/new": {
    category: AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS,
    level: PermissionLevel.WRITE,
  },
  "/categories/portable-items/:id/edit": {
    category: AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS,
    level: PermissionLevel.WRITE,
  },
};

export const getRoutePermission = (pathname: string) => {
  // Direct match first
  if (routePermissions[pathname]) {
    return routePermissions[pathname];
  }

  // Pattern matching for dynamic routes
  for (const [pattern, permission] of Object.entries(routePermissions)) {
    if (pattern.includes(":id")) {
      const regex = new RegExp("^" + pattern.replace(":id", "[^/]+") + "$");
      if (regex.test(pathname)) {
        return permission;
      }
    }
  }

  return null;
};
