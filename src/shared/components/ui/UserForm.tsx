"use client";

import type React from "react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart2,
  Server,
  Settings,
  Users,
  FileText,
  ClipboardList,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useCookieAuthStore } from "../../store/cookieAuthStore";
import Logo from "../layout/Logow";

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile, isOpen, onToggle }) => {
  const location = useLocation();
  const { isAdmin, logout } = useCookieAuthStore();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Helper to check if a link is active
  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const linkClassName = (path: string) => `
    flex items-center py-3 px-4 text-sm font-medium rounded-md transition-all
    ${
      isActive(path)
        ? "bg-primary-700 text-white"
        : "text-primary-200 hover:bg-primary-700/50 hover:text-white"
    }
  `;

  const closeSidebar = () => {
    if (isMobile && isOpen) {
      onToggle();
    }
  };

  // Sidebar content
  const sidebarContent = (
    <>
      <div className="flex justify-between items-center px-4 py-6">
        <Logo />
        {isMobile && (
          <button
            onClick={onToggle}
            className="p-1 text-white rounded-md transition-colors hover:bg-primary-700"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <nav className="flex flex-col px-3 mt-6 space-y-1">
        <NavLink
          to="/dashboard"
          className={linkClassName("/dashboard")}
          onClick={closeSidebar}
        >
          <BarChart2 className="mr-3 w-5 h-5" />
          Dashboard
        </NavLink>

        <NavLink
          to="/devices"
          className={linkClassName("/devices")}
          onClick={closeSidebar}
        >
          <Server className="mr-3 w-5 h-5" />
          Devices
        </NavLink>

        <NavLink
          to="/settings"
          className={linkClassName("/settings")}
          onClick={closeSidebar}
        >
          <Settings className="mr-3 w-5 h-5" />
          Settings
        </NavLink>

        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => setAdminMenuOpen(!adminMenuOpen)}
              className={`flex justify-between items-center px-4 py-3 w-full text-sm font-medium rounded-md transition-all ${
                isActive("/admin")
                  ? "text-white bg-primary-700"
                  : "text-primary-200 hover:bg-primary-700/50 hover:text-white"
              }
              `}
            >
              <div className="flex items-center">
                <Users className="mr-3 w-5 h-5" />
                <span>Admin</span>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  adminMenuOpen ? "transform rotate-180" : ""
                }`}
              />
            </button>

            {adminMenuOpen && (
              <div className="mt-1 ml-8 space-y-1">
                <NavLink
                  to="/admin/users"
                  className={linkClassName("/admin/users")}
                  onClick={closeSidebar}
                >
                  <Users className="mr-3 w-4 h-4" />
                  User Management
                </NavLink>
                <NavLink
                  to="/admin/audit-logs"
                  className={linkClassName("/admin/audit-logs")}
                  onClick={closeSidebar}
                >
                  <ClipboardList className="mr-3 w-4 h-4" />
                  Audit Logs
                </NavLink>
                <NavLink
                  to="/admin/reports"
                  className={linkClassName("/admin/reports")}
                  onClick={closeSidebar}
                >
                  <FileText className="mr-3 w-4 h-4" />
                  Reports
                </NavLink>
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="px-3 py-4 mt-auto">
        <button
          onClick={logout}
          className="flex items-center px-4 py-3 w-full text-sm font-medium rounded-md transition-all text-primary-200 hover:bg-primary-700/50 hover:text-white"
        >
          <LogOut className="mr-3 w-5 h-5" />
          Sign Out
        </button>
      </div>
    </>
  );

  // Mobile sidebar overlay
  if (isMobile) {
    return (
      <>
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-20 p-2 text-white rounded-md bg-primary-700 md:hidden"
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

  // Desktop sidebar
  return (
    <div className="hidden w-64 h-full text-white md:flex md:flex-col bg-primary-800">
      {sidebarContent}
    </div>
  );
};

export default Sidebar;
