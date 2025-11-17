"use client";

import type React from "react";
import { usePermissions } from "../../../features/auth/hooks/usePermissions";
import Card from "../../../shared/components/ui/Card";
import { AssetCategoryType } from "../../../shared/types";

interface CategoryStat {
  total: number;
  recent: number;
  category: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  backgroundImage: string;
  overlayColor: string;
}

interface AssetCategoriesCardProps {
  categoryStats: CategoryStat[];
  onCategoryClick: (route: string) => void;
}

export const AssetCategoriesCard: React.FC<AssetCategoriesCardProps> = ({
  categoryStats,
  onCategoryClick,
}) => {
  const { canAccessCategory } = usePermissions();

  const getAssetCategoryFromRoute = (
    route: string
  ): AssetCategoryType | null => {
    switch (route) {
      case "/categories/buildings":
        return AssetCategoryType.BUILDINGS_REGISTER;
      case "/categories/vehicles":
        return AssetCategoryType.MOTOR_VEHICLES_REGISTER;
      case "/categories/office-equipment":
        return AssetCategoryType.OFFICE_EQUIPMENT;
      case "/categories/land-register":
        return AssetCategoryType.LAND_REGISTER;
      case "/categories/furniture-equipment":
        return AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT;
      case "/categories/plant-machinery":
        return AssetCategoryType.PLANT_MACHINERY;
      case "/categories/portable-items":
        return AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS;
      case "/categories/ict-assets":
        return AssetCategoryType.ICT_ASSETS;
      default:
        return null;
    }
  };

  return (
    <Card title="Asset Categories Overview" className="p-4 sm:p-6">
      <div
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 sm:pb-4
                        scrollbar-visible scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100
                        hover:scrollbar-thumb-gray-500"
      >
        {categoryStats.map((category) => {
          const assetCategory = getAssetCategoryFromRoute(category.route);
          const hasAccess = assetCategory
            ? canAccessCategory(assetCategory)
            : false;

          return (
            <div
              key={category.category}
              className={`relative flex-shrink-0 w-48 sm:w-56 md:w-64 h-28 sm:h-32 md:h-40 rounded-lg overflow-hidden
                             transition-all duration-300 group ${
                               hasAccess
                                 ? "cursor-pointer hover:shadow-xl hover:-translate-y-1"
                                 : "cursor-not-allowed opacity-60"
                             }`}
              onClick={() => hasAccess && onCategoryClick(category.route)}
            >
              <div
                className={`absolute inset-0 bg-cover bg-center transition-transform duration-300 ${
                  hasAccess ? "group-hover:scale-110" : ""
                }`}
                style={{
                  backgroundImage: `url(${category.backgroundImage})`,
                }}
              />

              <div
                className={`absolute inset-0 ${
                  category.overlayColor
                } transition-opacity duration-300 ${
                  hasAccess ? "group-hover:opacity-80" : ""
                }`}
              />

              <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/40" />

              {!hasAccess && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                  <div className="text-center text-white">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto mb-1 sm:mb-2 rounded-full bg-red-500/80 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-xs font-medium">Access Restricted</p>
                  </div>
                </div>
              )}

              <div className="relative z-10 p-2 sm:p-3 md:p-4 h-full flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30">
                    <div className="text-white">{category.icon}</div>
                  </div>
                  <span className="text-xs text-white/90 bg-white/20 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-white/30">
                    +{category.recent} this week
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm md:text-lg mb-0.5 sm:mb-1 drop-shadow-md">
                    {category.category}
                  </h4>
                  <p className="text-sm sm:text-lg md:text-2xl font-bold text-white drop-shadow-md">
                    {category.total}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
