"use client";

import type React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building,
  Car,
  Printer,
  MapPin,
  ArrowRight,
  ChevronRight,
  Home,
  FolderOpen,
  Sofa,
  Settings,
  Gift,
  Lock,
  Computer,
} from "lucide-react";
import Card from "../../../shared/components/ui/Card";
import Button from "../../../shared/components/ui/Button";
import { useCookieAuthStore } from "../../../shared/store/cookieAuthStore";
import { AssetCategoryType } from "../../../shared/types";

const AssetCategories: React.FC = () => {
  const navigate = useNavigate();
  const { userPermissions, isAdmin } = useCookieAuthStore();

  const categories = [
    {
      id: "ict-assets",
      title: "ICT Assets",
      description:
        "Manage ICT equipment including computers, networking devices, and technology infrastructure with comprehensive tracking",
      icon: <Computer className="w-8 h-8" />,
      route: "/categories/ict-assets",
      color: "bg-indigo-500",
      hoverColor: "hover:bg-indigo-600",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      backgroundImage:
        "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=800",
      overlayColor: "bg-indigo-900/70",
      categoryType: AssetCategoryType.ICT_ASSETS,
    },
    {
      id: "land-register",
      title: "Land Register",
      description:
        "Manage land and investment property records including ownership, valuation, and legal documentation",
      icon: <MapPin className="w-8 h-8" />,
      route: "/categories/land-register",
      color: "bg-emerald-500",
      hoverColor: "hover:bg-emerald-600",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      backgroundImage:
        "https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=800",
      overlayColor: "bg-emerald-900/70",
      categoryType: AssetCategoryType.LAND_REGISTER,
    },
    {
      id: "buildings",
      title: "Buildings Register",
      description:
        "Track building assets, locations, floors, rooms, and property valuations",
      icon: <Building className="w-8 h-8" />,
      route: "/categories/buildings",
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      backgroundImage:
        "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=800",
      overlayColor: "bg-green-900/70",
      categoryType: AssetCategoryType.BUILDINGS_REGISTER,
    },
    {
      id: "vehicles",
      title: "Motor Vehicles Register",
      description:
        "Manage vehicle fleet including registration, maintenance, and ownership records",
      icon: <Car className="w-8 h-8" />,
      route: "/categories/vehicles",
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      backgroundImage:
        "https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800",
      overlayColor: "bg-purple-900/70",
      categoryType: AssetCategoryType.MOTOR_VEHICLES_REGISTER,
    },
    {
      id: "office-equipment",
      title: "Office Equipment",
      description:
        "Track office equipment, furniture, and supplies with depreciation and location management",
      icon: <Printer className="w-8 h-8" />,
      route: "/categories/office-equipment",
      color: "bg-orange-500",
      hoverColor: "hover:bg-orange-600",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      backgroundImage:
        "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=800",
      overlayColor: "bg-orange-900/70",
      categoryType: AssetCategoryType.OFFICE_EQUIPMENT,
    },
    {
      id: "furniture-equipment",
      title: "Furniture & Fittings Equipment",
      description:
        "Manage furniture and fittings inventory with depreciation tracking, location management, and condition monitoring",
      icon: <Sofa className="w-8 h-8" />,
      route: "/categories/furniture-equipment",
      color: "bg-amber-500",
      hoverColor: "hover:bg-amber-600",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      backgroundImage:
        "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800",
      overlayColor: "bg-amber-900/70",
      categoryType: AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT,
    },
    {
      id: "plant-machinery",
      title: "Plant & Machinery",
      description:
        "Manage plant equipment and machinery including purchase, depreciation, and maintenance records",
      icon: <Settings className="w-8 h-8" />,
      route: "/categories/plant-machinery",
      color: "bg-teal-500",
      hoverColor: "hover:bg-teal-600",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      backgroundImage:
        "https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=800",
      overlayColor: "bg-teal-900/70",
      categoryType: AssetCategoryType.PLANT_MACHINERY,
    },
    {
      id: "portable-items",
      title: "Portable & Attractive Items",
      description:
        "Track portable and attractive items including purchase details, location, depreciation, and disposal",
      icon: <Gift className="w-8 h-8" />,
      route: "/categories/portable-items",
      color: "bg-pink-500",
      hoverColor: "hover:bg-pink-600",
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600",
      backgroundImage:
        "https://images.pexels.com/photos/4792509/pexels-photo-4792509.jpeg?auto=compress&cs=tinysrgb&w=800",
      overlayColor: "bg-pink-900/70",
      categoryType: AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS,
    },
  ];

  const hasAccess = (categoryType: AssetCategoryType): boolean => {
    if (isAdmin) return true;
    return userPermissions?.[categoryType]?.has_access || false;
  };

  const handleCategoryClick = (
    route: string,
    categoryType: AssetCategoryType
  ) => {
    if (hasAccess(categoryType)) {
      navigate(route);
    }
  };

  return (
    <div className="space-y-6 mb-2 px-0.5 md:px-2 lg:px-4">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 flex items-center mb-6 space-x-2 text-sm text-gray-600">
        <Link
          to="/"
          className="flex items-center transition-colors hover:text-blue-600"
        >
          <Home size={16} className="mr-1" />
          Home
        </Link>
        <ChevronRight size={16} />
        <span className="flex items-center font-medium text-gray-900">
          <FolderOpen size={16} className="mr-1" />
          Asset Categories
        </span>
      </nav>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Categories</h1>
          <p className="mt-2 text-gray-600">
            Select a category to manage your organization's assets
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const hasAccessToCategory = hasAccess(category.categoryType);

          return (
            <div
              key={category.id}
              className={`transition-all duration-300 group ${
                hasAccessToCategory
                  ? "cursor-pointer hover:shadow-xl hover:-translate-y-2 active:scale-95"
                  : "cursor-not-allowed opacity-75"
              }`}
              onClick={() =>
                handleCategoryClick(category.route, category.categoryType)
              }
            >
              <Card
                className={`h-full border-2 overflow-hidden relative ${
                  hasAccessToCategory
                    ? "hover:border-gray-300"
                    : "border-gray-200"
                }`}
              >
                {/* Background Image with Overlay */}
                <div
                  className={`absolute inset-0 bg-cover bg-center transition-transform duration-300 ${
                    hasAccessToCategory ? "group-hover:scale-110" : ""
                  }`}
                  style={{
                    backgroundImage: `url(${category.backgroundImage})`,
                  }}
                />

                {/* Color Overlay */}
                <div
                  className={`absolute inset-0 ${
                    category.overlayColor
                  } transition-opacity duration-300 ${
                    hasAccessToCategory
                      ? "group-hover:opacity-80"
                      : "opacity-90"
                  }`}
                />

                {!hasAccessToCategory && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                    <div className="text-center text-white">
                      <Lock className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm font-medium">Access Restricted</p>
                    </div>
                  </div>
                )}

                {/* Gradient Overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/40" />

                {/* Content */}
                <div className="relative z-10 p-4 sm:p-6 text-white h-full flex flex-col">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div className="p-2 sm:p-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30">
                      <div className="text-white">{category.icon}</div>
                    </div>
                    {hasAccessToCategory && (
                      <ArrowRight className="w-5 h-5 text-white/70 transition-all duration-300 group-hover:text-white group-hover:translate-x-1" />
                    )}
                  </div>

                  <h3 className="mb-2 text-lg font-bold text-white transition-all duration-300 sm:text-xl group-hover:text-white drop-shadow-md">
                    {category.title}
                  </h3>

                  <p className="mb-3 text-xs leading-relaxed text-white/90 sm:text-sm sm:mb-4 line-clamp-2 sm:line-clamp-none drop-shadow-sm flex-grow">
                    {category.description}
                  </p>

                  <Button
                    variant={hasAccessToCategory ? "secondary" : "ghost"}
                    size="sm"
                    className={`w-full border-0 shadow-lg transition-all duration-300 text-xs sm:text-sm py-2 sm:py-2.5 font-semibold backdrop-blur-sm ${
                      hasAccessToCategory
                        ? "bg-white/90 hover:bg-white text-gray-900 hover:shadow-xl hover:scale-105"
                        : "bg-white/20 text-white/70 cursor-not-allowed"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasAccessToCategory) {
                        handleCategoryClick(
                          category.route,
                          category.categoryType
                        );
                      }
                    }}
                    disabled={!hasAccessToCategory}
                  >
                    {hasAccessToCategory
                      ? `Manage ${category.title}`
                      : "Access Restricted"}
                  </Button>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 mt-8  rounded-xl border shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-gray-700">
          Asset Management Overview
        </h2>
        <p className="text-sm text-gray-500">
          This centralized asset management system allows you to track and
          manage different types of organizational assets. Each category
          provides specialized tools and fields relevant to that asset type,
          ensuring comprehensive inventory management and reporting
          capabilities.
        </p>
      </div>
    </div>
  );
};

export default AssetCategories;
