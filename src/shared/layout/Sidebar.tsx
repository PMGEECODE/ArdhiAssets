"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart2,
  Settings,
  Users,
  FileText,
  ClipboardList,
  LogOut,
  Menu,
  X,
  FolderOpen,
  Monitor,
  Building,
  Car,
  Printer,
  MapPin,
  Sofa,
  Gift,
  Shield,
  Plus,
  Minus,
  Database,
  Globe,
  BrickWallShield,
} from "lucide-react";
import { useCookieAuthStore } from "../../shared/store/cookieAuthStore";
import { usePermissions } from "../../features/auth/hooks/usePermissions";
import Logo from "./Logo";
import Tooltip from "./Tooltip";
import { AssetCategoryType } from "../../shared/types";

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const HamburgerIcon: React.FC<{
  isOpen?: boolean;
  className?: string;
  size?: number;
}> = ({ isOpen = false, className = "", size = 20 }) => {
  return (
    <div
      className={`hamburger-icon ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform duration-200 ${
          isOpen ? "rotate-90" : ""
        }`}
      >
        <line
          x1="3"
          y1="6"
          x2="21"
          y2="6"
          className={`transition-all duration-200 ${
            isOpen ? "opacity-0" : "opacity-100"
          }`}
        />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line
          x1="3"
          y1="18"
          x2="21"
          y2="18"
          className={`transition-all duration-200 ${
            isOpen ? "opacity-0" : "opacity-100"
          }`}
        />
      </svg>
    </div>
  );
};

const ExpandableMenuIcon: React.FC<{
  isExpanded: boolean;
  size?: number;
  className?: string;
}> = ({ isExpanded, size = 16, className = "" }) => {
  return (
    <div className={`transition-transform duration-200 ${className}`}>
      {isExpanded ? (
        <Minus size={size} className="transition-transform duration-200" />
      ) : (
        <Plus size={size} className="transition-transform duration-200" />
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isMobile, isOpen, onToggle }) => {
  const location = useLocation();
  const { isAdmin, logout } = useCookieAuthStore();
  const { canAccessCategory } = usePermissions();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [assetCategoriesMenuOpen, setAssetCategoriesMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const linkClassName = (path: string) => `
    flex items-center py-2 px-3 text-sm font-medium rounded-md transition-all
    ${
      isActive(path)
        ? "bg-primary-700 text-white"
        : "text-primary-200 hover:bg-primary-700/50 hover:text-white"
    }
    ${isCollapsed ? "justify-center px-2" : ""}
  `;

  const closeSidebar = () => {
    if (isMobile && isOpen) {
      onToggle();
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setAdminMenuOpen(false);
      setAssetCategoriesMenuOpen(false);
    }
  };

  const canAccessAnyCategory = () => {
    const categories: AssetCategoryType[] = [
      AssetCategoryType.DEVICES,
      AssetCategoryType.LAND_REGISTER,
      AssetCategoryType.BUILDINGS_REGISTER,
      AssetCategoryType.MOTOR_VEHICLES_REGISTER,
      AssetCategoryType.OFFICE_EQUIPMENT,
      AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT,
      AssetCategoryType.PLANT_MACHINERY,
      AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS,
    ];

    return categories.some((category) => canAccessCategory(category));
  };

  const SecureAssetLink: React.FC<{
    to: string;
    category: AssetCategoryType;
    icon: React.ReactNode;
    children: React.ReactNode;
    tooltipText?: string;
  }> = ({ to, category, icon, children, tooltipText }) => {
    const hasAccess = canAccessCategory(category);

    if (!hasAccess) {
      const restrictedContent = (
        <div
          className={`flex items-center py-2 px-3 text-sm font-medium rounded-md text-primary-400 cursor-not-allowed opacity-50 ${
            isCollapsed ? "justify-center px-2" : ""
          }`}
        >
          {isCollapsed ? (
            <div className="relative">
              <div className="w-5 h-5 flex items-center justify-center">
                {icon}
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-2 h-2 text-white"
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
            </div>
          ) : (
            <>
              <div className="relative mr-3 flex-shrink-0">
                <div className="w-5 h-5 flex items-center justify-center">
                  {icon}
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-2 h-2 text-white"
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
              </div>
              <span className="flex items-center">
                {children}
                <svg
                  className="w-4 h-4 ml-2 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </>
          )}
        </div>
      );

      return isCollapsed ? (
        <Tooltip content={`${tooltipText || children} - Access Restricted`}>
          {restrictedContent}
        </Tooltip>
      ) : (
        restrictedContent
      );
    }

    const linkContent = (
      <NavLink to={to} className={linkClassName(to)} onClick={closeSidebar}>
        {isCollapsed ? (
          <div className="w-5 h-5 flex items-center justify-center">{icon}</div>
        ) : (
          <>
            <div className="mr-3 flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {icon}
            </div>
            <span>{children}</span>
          </>
        )}
      </NavLink>
    );

    return isCollapsed ? (
      <Tooltip content={tooltipText || (children as string)}>
        {linkContent}
      </Tooltip>
    ) : (
      linkContent
    );
  };

  const NavLinkWithTooltip: React.FC<{
    to: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    tooltipText?: string;
  }> = ({ to, icon, children, tooltipText }) => {
    const linkContent = (
      <NavLink to={to} className={linkClassName(to)} onClick={closeSidebar}>
        {isCollapsed ? (
          <div className="w-5 h-5 flex items-center justify-center">{icon}</div>
        ) : (
          <>
            <div className="mr-3 flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {icon}
            </div>
            <span>{children}</span>
          </>
        )}
      </NavLink>
    );

    return isCollapsed ? (
      <Tooltip content={tooltipText || (children as string)}>
        {linkContent}
      </Tooltip>
    ) : (
      linkContent
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div
        className={`sidebar_open flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-primary-700/50 ${
          isCollapsed ? "px-2" : ""
        }`}
      >
        {!isCollapsed && <Logo />}
        <div className="sidebar_menuIcon flex gap-2 items-center">
          {isMobile && (
            <button
              onClick={onToggle}
              className="p-1 text-white rounded-md transition-colors hover:bg-primary-700"
              aria-label="Close sidebar"
            >
              <X size={24} />
            </button>
          )}
          {!isMobile && (
            <Tooltip
              content={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              delay={0}
            >
              <button
                onClick={toggleCollapse}
                className="p-2 text-white rounded-md transition-all hover:bg-primary-700 hover:scale-105"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <HamburgerIcon isOpen={!isCollapsed} size={18} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scrollbar SideScrollbar">
        <nav
          className={`flex flex-col space-y-0.5 ${
            isCollapsed ? "px-2" : "px-3"
          } py-4`}
        >
          <NavLinkWithTooltip
            to="/dashboard"
            icon={<BarChart2 size={18} />}
            tooltipText="Dashboard"
          >
            Dashboard
          </NavLinkWithTooltip>

          {canAccessAnyCategory() && (
            <div className="relative">
              {!isCollapsed ? (
                <>
                  <button
                    onClick={() =>
                      setAssetCategoriesMenuOpen(!assetCategoriesMenuOpen)
                    }
                    className={`flex justify-between items-center px-3 py-2 w-full text-sm font-medium rounded-md transition-all ${
                      isActive("/asset-categories") ||
                      isActive("/categories") ||
                      isActive("/devices")
                        ? "text-white bg-primary-700"
                        : "text-primary-200 hover:bg-primary-700/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="mr-3 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        <FolderOpen size={18} />
                      </div>
                      <span>Asset Categories</span>
                    </div>
                    <ExpandableMenuIcon
                      isExpanded={assetCategoriesMenuOpen}
                      size={16}
                      className="text-current"
                    />
                  </button>

                  {assetCategoriesMenuOpen && (
                    <div className="mt-1 ml-8 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                      {canAccessAnyCategory() && (
                        <NavLink
                          to="/asset-categories"
                          className={linkClassName("/asset-categories")}
                          onClick={closeSidebar}
                        >
                          <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                            <FolderOpen size={16} />
                          </div>
                          <span>All Categories</span>
                        </NavLink>
                      )}
                      <SecureAssetLink
                        to="/categories/ict-assets"
                        category={AssetCategoryType.DEVICES}
                        icon={<Monitor size={16} />}
                        tooltipText="ICT Assets"
                      >
                        ICT Assets
                      </SecureAssetLink>
                      <SecureAssetLink
                        to="/categories/land-register"
                        category={AssetCategoryType.LAND_REGISTER}
                        icon={<MapPin size={16} />}
                        tooltipText="Land Register"
                      >
                        Land Register
                      </SecureAssetLink>
                      <SecureAssetLink
                        to="/categories/buildings"
                        category={AssetCategoryType.BUILDINGS_REGISTER}
                        icon={<Building size={16} />}
                        tooltipText="Buildings"
                      >
                        Buildings
                      </SecureAssetLink>
                      <SecureAssetLink
                        to="/categories/vehicles"
                        category={AssetCategoryType.MOTOR_VEHICLES_REGISTER}
                        icon={<Car size={16} />}
                        tooltipText="Motor Vehicles"
                      >
                        Motor Vehicles
                      </SecureAssetLink>
                      <SecureAssetLink
                        to="/categories/office-equipment"
                        category={AssetCategoryType.OFFICE_EQUIPMENT}
                        icon={<Printer size={16} />}
                        tooltipText="Office Equipment"
                      >
                        Office Equipment
                      </SecureAssetLink>
                      <SecureAssetLink
                        to="/categories/furniture-equipment"
                        category={
                          AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT
                        }
                        icon={<Sofa size={16} />}
                        tooltipText="Furniture & Fittings"
                      >
                        Furniture & Fittings
                      </SecureAssetLink>
                      <SecureAssetLink
                        to="/categories/plant-machinery"
                        category={AssetCategoryType.PLANT_MACHINERY}
                        icon={<Settings size={16} />}
                        tooltipText="Plant & Machinery"
                      >
                        Plant & Machinery
                      </SecureAssetLink>
                      <SecureAssetLink
                        to="/categories/portable-items"
                        category={AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS}
                        icon={<Gift size={16} />}
                        tooltipText="Portable & Attractive"
                      >
                        Portable & Attractive
                      </SecureAssetLink>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-0.5">
                  <NavLinkWithTooltip
                    to="/asset-categories"
                    icon={<FolderOpen size={18} />}
                    tooltipText="Asset Categories"
                  >
                    Asset Categories
                  </NavLinkWithTooltip>
                  <SecureAssetLink
                    to="/categories/ict-assets"
                    category={AssetCategoryType.DEVICES}
                    icon={<Monitor size={18} />}
                    tooltipText="ICT Assets"
                  >
                    ICT Assets
                  </SecureAssetLink>
                  <SecureAssetLink
                    to="/categories/land-register"
                    category={AssetCategoryType.LAND_REGISTER}
                    icon={<MapPin size={18} />}
                    tooltipText="Land Register"
                  >
                    Land Register
                  </SecureAssetLink>
                  <SecureAssetLink
                    to="/categories/buildings"
                    category={AssetCategoryType.BUILDINGS_REGISTER}
                    icon={<Building size={18} />}
                    tooltipText="Buildings"
                  >
                    Buildings
                  </SecureAssetLink>
                  <SecureAssetLink
                    to="/categories/vehicles"
                    category={AssetCategoryType.MOTOR_VEHICLES_REGISTER}
                    icon={<Car size={18} />}
                    tooltipText="Motor Vehicles"
                  >
                    Motor Vehicles
                  </SecureAssetLink>
                  <SecureAssetLink
                    to="/categories/office-equipment"
                    category={AssetCategoryType.OFFICE_EQUIPMENT}
                    icon={<Printer size={18} />}
                    tooltipText="Office Equipment"
                  >
                    Office Equipment
                  </SecureAssetLink>
                  <SecureAssetLink
                    to="/categories/furniture-equipment"
                    category={AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT}
                    icon={<Sofa size={18} />}
                    tooltipText="Furniture & Fittings"
                  >
                    Furniture & Fittings
                  </SecureAssetLink>
                  <SecureAssetLink
                    to="/categories/plant-machinery"
                    category={AssetCategoryType.PLANT_MACHINERY}
                    icon={<Settings size={18} />}
                    tooltipText="Plant & Machinery"
                  >
                    Plant & Machinery
                  </SecureAssetLink>
                  <SecureAssetLink
                    to="/categories/portable-items"
                    category={AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS}
                    icon={<Gift size={18} />}
                    tooltipText="Portable & Attractive"
                  >
                    Portable & Attractive
                  </SecureAssetLink>
                </div>
              )}
            </div>
          )}
          <hr className="my-2 mt-4 mb-4 border-t border-primary-700/40" />
          {isAdmin && (
            <div className="relative">
              {!isCollapsed ? (
                <>
                  <hr className="my-2 border-t border-primary-700/40" />

                  <button
                    onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                    className={`flex justify-between items-center px-3 py-2 w-full text-sm font-medium rounded-md transition-all ${
                      isActive("/admin")
                        ? "text-white bg-primary-700"
                        : "text-primary-200 hover:bg-primary-700/50 hover:text-white"
                    }
                    `}
                  >
                    <div className="flex items-center">
                      <div className="mr-3 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        <Users size={18} />
                      </div>
                      <span>Admin</span>
                    </div>
                    <ExpandableMenuIcon
                      isExpanded={adminMenuOpen}
                      size={16}
                      className="text-current"
                    />
                  </button>

                  {adminMenuOpen && (
                    <div className="mt-1 ml-8 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                      <NavLink
                        to="/admin"
                        className={linkClassName("/admin")}
                        onClick={closeSidebar}
                      >
                        <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                          <BrickWallShield size={16} color="orange" />
                        </div>
                        <span>Admin Dashboard</span>
                      </NavLink>
                      <NavLink
                        to="/admin/users"
                        className={linkClassName("/admin/users")}
                        onClick={closeSidebar}
                      >
                        <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                          <Users size={16} />
                        </div>
                        <span>User Management</span>
                      </NavLink>
                      <NavLink
                        to="/admin/permissions"
                        className={linkClassName("/admin/permissions")}
                        onClick={closeSidebar}
                      >
                        <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                          <Shield size={16} />
                        </div>
                        <span>User Permissions</span>
                      </NavLink>
                      <NavLink
                        to="/admin/security"
                        className={linkClassName("/admin/security")}
                        onClick={closeSidebar}
                      >
                        <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                          <Shield size={16} />
                        </div>
                        <span>Security Dashboard</span>
                      </NavLink>
                      <NavLink
                        to="/admin/audit-logs"
                        className={linkClassName("/admin/audit-logs")}
                        onClick={closeSidebar}
                      >
                        <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                          <ClipboardList size={16} />
                        </div>
                        <span>Audit Logs</span>
                      </NavLink>
                      <NavLink
                        to="/admin/reports"
                        className={linkClassName("/admin/reports")}
                        onClick={closeSidebar}
                      >
                        <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                          <FileText size={16} />
                        </div>
                        <span>Reports</span>
                      </NavLink>
                      <NavLink
                        to="/admin/backups"
                        className={linkClassName("/admin/backups")}
                        onClick={closeSidebar}
                      >
                        <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                          <Database size={16} />
                        </div>
                        <span>System Backups</span>
                      </NavLink>
                      <NavLink
                        to="/admin/session-monitor"
                        className={linkClassName("/admin/session-monitor")}
                        onClick={closeSidebar}
                      >
                        <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                          <Globe size={16} />
                        </div>
                        <span>Session Monitor</span>
                      </NavLink>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-0.5">
                  <NavLinkWithTooltip
                    to="/admin/users"
                    icon={<Users size={18} />}
                    tooltipText="User Management"
                  >
                    User Management
                  </NavLinkWithTooltip>
                  <NavLinkWithTooltip
                    to="/admin/permissions"
                    icon={<Shield size={18} />}
                    tooltipText="User Permissions"
                  >
                    User Permissions
                  </NavLinkWithTooltip>
                  <NavLinkWithTooltip
                    to="/admin/security"
                    icon={<Shield size={18} />}
                    tooltipText="Security Dashboard"
                  >
                    Security Dashboard
                  </NavLinkWithTooltip>
                  <NavLinkWithTooltip
                    to="/admin/audit-logs"
                    icon={<ClipboardList size={18} />}
                    tooltipText="Audit Logs"
                  >
                    Audit Logs
                  </NavLinkWithTooltip>
                  <NavLinkWithTooltip
                    to="/admin/reports"
                    icon={<FileText size={18} />}
                    tooltipText="Reports"
                  >
                    Reports
                  </NavLinkWithTooltip>
                  <NavLinkWithTooltip
                    to="/admin/backups"
                    icon={<Database size={18} />}
                    tooltipText="System Backups"
                  >
                    System Backups
                  </NavLinkWithTooltip>
                  <NavLinkWithTooltip
                    to="/admin/session-monitor"
                    icon={<Globe size={18} />}
                    tooltipText="Session Monitor"
                  >
                    Session Monitor
                  </NavLinkWithTooltip>
                </div>
              )}
            </div>
          )}

          <NavLinkWithTooltip
            to="/settings"
            icon={<Settings size={18} />}
            tooltipText="Settings"
          >
            Settings
          </NavLinkWithTooltip>
        </nav>
      </div>

      <div
        className={`flex-shrink-0 border-t border-primary-700/50 ${
          isCollapsed ? "px-2" : "px-3"
        } py-4`}
      >
        <Tooltip content="Sign Out" disabled={!isCollapsed} delay={0}>
          <button
            onClick={async () => await logout()}
            className={`flex items-center py-2 px-3 w-full text-sm font-medium rounded-md transition-all text-primary-200 hover:bg-primary-700/50 hover:text-white ${
              isCollapsed ? "justify-center px-2" : ""
            }`}
          >
            {isCollapsed ? (
              <div className="w-5 h-5 flex items-center justify-center">
                <LogOut size={18} />
              </div>
            ) : (
              <>
                <div className="mr-3 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  <LogOut size={18} />
                </div>
                <span>Sign Out</span>
              </>
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-20 p-2 text-white rounded-md bg-primary-700 md:hidden transition-all hover:bg-primary-600 hover:scale-105"
          aria-label="Toggle Menu"
        >
          <Menu size={24} />
        </button>

        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden">
            <div
              className={`
              fixed inset-y-0 left-0 w-64 bg-primary-800 transform
              ${isOpen ? "translate-x-0" : "-translate-x-full"}
              transition-transform duration-300 ease-in-out
            `}
            >
              {sidebarContent}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className={`hidden md:flex md:flex-col h-full bg-primary-800 text-white transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-14" : "w-64"
      }`}
    >
      {sidebarContent}
    </div>
  );
};

export default Sidebar;
