"use client";

import type React from "react";
import { useEffect } from "react";
import {
  useNotificationStore,
  type Notification,
} from "../../../shared/store/notificationStore";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ArrowLeft,
  Home,
  Clock,
  AlertCircle,
  Info,
  Zap,
  ChevronRight,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import Button from "../../../shared/components/ui/Button";
import Card from "../../../shared/components/ui/Card";

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unread_count,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const getNotificationIcon = (type?: Notification["type"]) => {
    switch (type) {
      case "device_transfer":
        return <Zap className="w-4 h-4 text-accent-600 dark:text-accent-400" />;
      case "approval_request":
        return (
          <AlertCircle className="w-4 h-4 text-warning-600 dark:text-warning-400" />
        );
      case "overdue_reminder":
        return <Clock className="w-4 h-4 text-error-600 dark:text-error-400" />;
      case "system":
        return (
          <Info className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        );
      default:
        return (
          <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        );
    }
  };

  const getPriorityStyles = (priority?: Notification["priority"]) => {
    switch (priority) {
      case "urgent":
        return {
          border: "border-l-error-500",
          bg: "bg-error-50 dark:bg-error-950",
          badge:
            "bg-error-100 dark:bg-error-900 text-error-800 dark:text-error-300",
        };
      case "high":
        return {
          border: "border-l-warning-500",
          bg: "bg-warning-50 dark:bg-warning-950",
          badge:
            "bg-warning-100 dark:bg-warning-900 text-warning-800 dark:text-warning-300",
        };
      case "medium":
        return {
          border: "border-l-accent-500",
          bg: "bg-accent-50 dark:bg-accent-950",
          badge:
            "bg-accent-100 dark:bg-accent-900 text-accent-800 dark:text-accent-300",
        };
      default:
        return {
          border: "border-l-primary-300 dark:border-l-primary-700",
          bg: "bg-white dark:bg-primary-900",
          badge:
            "bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300",
        };
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center mb-4 space-x-1 text-xs text-primary-600 dark:text-primary-400">
          <Link
            to="/"
            className="flex items-center hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
          >
            <Home className="w-3 h-3 mr-1" />
            Home
          </Link>
          <ChevronRight className="w-3 h-3 mx-1" />
          <span className="flex items-center font-medium text-primary-900 dark:text-primary-100">
            <Bell className="w-3 h-3 mr-1" />
            Notifications
          </span>
        </nav>

        <Card>
          {/* Sticky Header */}
          <div className="sticky top-0 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-primary-900 dark:text-primary-50">
                  Notifications
                </h1>
                <p className="text-xs text-primary-600 dark:text-primary-400">
                  {unread_count > 0
                    ? `${unread_count} unread`
                    : "All caught up!"}
                </p>
              </div>
            </div>

            {unread_count > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="secondary"
                size="sm"
                className="flex items-center space-x-1.5"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all as read</span>
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="p-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                  <Bell className="w-8 h-8 text-primary-500 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-medium text-primary-900 dark:text-primary-50 mb-1">
                  No notifications
                </h3>
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  You're all caught up! New alerts will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const styles = getPriorityStyles(notification.priority);
                  const isUnread = !notification.read;

                  return (
                    <div
                      key={notification.id}
                      className={`
                        rounded-lg border ${styles.border} ${styles.bg}
                        p-4 transition-all duration-200
                        ${isUnread ? "shadow-sm" : "opacity-75"}
                        hover:shadow-md cursor-pointer
                      `}
                      onClick={() => {
                        if (isUnread) markAsRead(notification.id);
                        if (notification.link) navigate(notification.link);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="p-2 bg-white dark:bg-primary-800 rounded-full shadow-sm">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <p
                              className={`
                                text-sm font-medium
                                ${
                                  isUnread
                                    ? "text-primary-900 dark:text-primary-100"
                                    : "text-primary-600 dark:text-primary-400"
                                }
                              `}
                            >
                              {notification.message}
                            </p>
                            {notification.time && (
                              <p className="mt-1 text-xs text-primary-500 dark:text-primary-500">
                                {notification.time}
                              </p>
                            )}
                            {notification.priority &&
                              notification.priority !== "low" && (
                                <span
                                  className={`
                                  inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full
                                  ${styles.badge}
                                `}
                                >
                                  {notification.priority.toUpperCase()}
                                </span>
                              )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 ml-3">
                          {isUnread && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1.5 rounded-lg text-primary-500 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1.5 rounded-lg text-error-500 dark:text-error-400 hover:bg-error-100 dark:hover:bg-error-900 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;
