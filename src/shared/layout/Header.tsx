"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  User,
  ChevronDown,
  X,
  Check,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { useCookieAuthStore } from "../../shared/store/cookieAuthStore";
import {
  useNotificationStore,
  type Notification,
} from "../../shared/store/notificationStore";
import ConfirmationModal from "../../shared/components/ui/ConfirmationModal";
import { ThemeToggle } from "../components/ui/ThemeToggle";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useCookieAuthStore();
  const {
    notifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unread_count,
    startPolling,
    stopPolling,
  } = useNotificationStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const bellRef = useRef<HTMLButtonElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  useEffect(() => {
    if (notifOpen) {
      fetchNotifications();
    }
  }, [notifOpen, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notifOpen &&
        notifRef.current &&
        bellRef.current &&
        !notifRef.current.contains(e.target as Node) &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }

      if (
        dropdownOpen &&
        profileDropdownRef.current &&
        profileButtonRef.current &&
        !profileDropdownRef.current.contains(e.target as Node) &&
        !profileButtonRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifOpen, dropdownOpen]);

  const handleBellClick = () => {
    setNotifOpen((prev) => !prev);
    if (!notifOpen) setDropdownOpen(false);
  };

  const handleProfileClick = () => {
    setDropdownOpen((prev) => !prev);
    if (!dropdownOpen) setNotifOpen(false);
  };

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    setDropdownOpen(false);
    setNotifOpen(false);

    try {
      console.log("[v0] handleConfirmLogout - awaiting logout");
      await logout();
      console.log("[v0] handleConfirmLogout - logout completed");
    } catch (error) {
      console.error("[v0] handleConfirmLogout - logout error:", error);
    }

    // This ensures the page fully reloads and ProtectedRoute re-evaluates
    window.location.href = "/login";
  };

  const getNotificationIcon = (type?: Notification["type"]) => {
    switch (type) {
      case "device_transfer":
        return "📱";
      case "approval_request":
        return "⚠️";
      case "overdue_reminder":
        return "📅";
      case "system":
        return "⚙️";
      default:
        return "📢";
    }
  };

  const getPriorityColor = (priority?: Notification["priority"]) => {
    switch (priority) {
      case "urgent":
        return "border-l-red-500 bg-red-50 dark:bg-red-950 dark:border-l-red-600";
      case "high":
        return "border-l-orange-500 bg-orange-50 dark:bg-orange-950 dark:border-l-orange-600";
      case "medium":
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-l-blue-600";
      default:
        return "border-l-gray-300 bg-gray-50 dark:bg-slate-800 dark:border-l-slate-600";
    }
  };

  return (
    <header className="flex justify-between items-center px-3 sm:px-4 py-3 bg-white dark:bg-slate-900 shadow-sm relative transition-colors">
      <div
        className="absolute bottom-0 left-0 right-0 flag"
        style={{
          background:
            "linear-gradient(to right, #000000 0%, #000000 30%, #FFFFFF 30%, #FFFFFF 35%, #DC143C 35%, #DC143C 65%, #FFFFFF 65%, #FFFFFF 70%, #006B3F 70%, #006B3F 100%)",
        }}
      />

      <div className="flex-shrink-0">
        <div className="block sm:hidden text-lg font-semibold text-primary-800 dark:text-slate-100 pl-14">
          Assets MS
        </div>
        <div className="hidden sm:block text-xl font-semibold text-primary-800 dark:text-slate-100">
          Assets Management System
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <ThemeToggle />

        <div className="relative">
          <button
            ref={bellRef}
            className="relative p-2 rounded-full transition-colors text-primary-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-slate-700"
            onClick={handleBellClick}
          >
            <Bell size={20} />
            {unread_count > 0 && (
              <span className="flex absolute -top-1 -right-1 justify-center items-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                {unread_count > 99 ? "99+" : unread_count}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              ref={notifRef}
              className="overflow-hidden absolute top-full left-1/2 z-50 mt-2 w-96 max-h-96 bg-white dark:bg-slate-800 rounded-lg border shadow-xl transform -translate-x-1/2 border-primary-100 dark:border-slate-700 animate-fade-in"
            >
              <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-slate-700 border-b border-primary-100 dark:border-slate-600">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  Notifications
                </h4>
                <div className="flex items-center space-x-2">
                  {unread_count > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center px-2 py-1 space-x-1 text-xs text-blue-600 dark:text-blue-400 rounded transition-colors hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-600"
                      title="Mark all as read"
                    >
                      <CheckCheck size={12} />
                      <span>Mark all read</span>
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="p-1 text-gray-400 dark:text-slate-400 rounded transition-colors hover:text-gray-600 dark:hover:text-slate-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-80">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                    <Bell
                      size={32}
                      className="mx-auto mb-2 text-gray-300 dark:text-slate-500"
                    />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((n: Notification) => (
                    <div
                      key={n.id}
                      className={`border-l-4 transition-all hover:bg-gray-50 dark:hover:bg-slate-700 ${
                        n.read ? "opacity-60" : ""
                      } ${getPriorityColor(n.priority)}`}
                    >
                      <div className="flex justify-between items-start p-3 sm:p-4">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            markAsRead(n.id);
                            if (n.link) navigate(n.link);
                            setNotifOpen(false);
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-lg">
                              {getNotificationIcon(n.type)}
                            </span>
                            <div className="flex-1">
                              <p
                                className={`text-sm ${
                                  n.read
                                    ? "text-gray-600 dark:text-slate-400"
                                    : "text-gray-900 dark:text-slate-100 font-medium"
                                }`}
                              >
                                {n.message}
                              </p>
                              {n.time && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                                  {n.time}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center ml-2 space-x-1">
                          {!n.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                              }}
                              className="p-1 text-gray-400 dark:text-slate-500 rounded transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                              title="Mark as read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                            className="p-1 text-gray-400 dark:text-slate-500 rounded transition-colors hover:text-red-600 dark:hover:text-red-400"
                            title="Delete notification"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border-t border-gray-100 dark:border-slate-600">
                  <button
                    onClick={() => {
                      navigate("/notifications");
                      setNotifOpen(false);
                    }}
                    className="w-full text-xs text-center text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            ref={profileButtonRef}
            className="flex items-center px-1 sm:px-2 py-1 space-x-1 sm:space-x-2 rounded-md transition-colors text-primary-700 dark:text-slate-200 hover:text-primary-900 dark:hover:text-slate-100 hover:bg-primary-50 dark:hover:bg-slate-700"
            onClick={handleProfileClick}
          >
            <div className="flex justify-center items-center w-6 h-6 text-white rounded-full bg-primary-700 dark:bg-primary-600 flex-shrink-0">
              <User size={16} />
            </div>
            <div className="hidden sm:block text-sm font-medium truncate max-w-32">
              {user?.first_name} {user?.last_name}
            </div>
            <ChevronDown size={16} className="flex-shrink-0" />
          </button>

          {dropdownOpen && (
            <div
              ref={profileDropdownRef}
              className="absolute right-0 top-full z-50 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md border shadow-lg border-primary-100 dark:border-slate-700 animate-fade-in"
            >
              <div className="px-4 py-2 border-b border-primary-100 dark:border-slate-700">
                <p className="text-sm font-medium text-primary-900 dark:text-slate-100 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs truncate text-primary-500 dark:text-slate-400">
                  {user?.email}
                </p>
              </div>
              <button
                className="px-4 py-2 w-full text-sm text-left transition-colors text-primary-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-700"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/profile");
                }}
              >
                Your Profile
              </button>
              <button
                className="px-4 py-2 w-full text-sm text-left transition-colors text-primary-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-700"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/settings");
                }}
              >
                Settings
              </button>
              <div className="pt-1 mt-1 border-t border-primary-100 dark:border-slate-700">
                <button
                  className="px-4 py-2 w-full text-sm text-left transition-colors text-error-600 dark:text-red-400 hover:bg-primary-50 dark:hover:bg-slate-700"
                  onClick={handleLogoutClick}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Confirm Sign Out"
        message="Are you sure you want to sign out of your session?"
        confirmText="Sign Out"
        cancelText="Cancel"
        type="warning"
      />
    </header>
  );
};

export default Header;
