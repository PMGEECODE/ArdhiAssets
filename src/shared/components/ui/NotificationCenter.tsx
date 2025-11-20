"use client";

import React from "react";
import { Bell, Check, CheckCheck, Trash2, Filter, Search } from "lucide-react";
import {
  useNotificationStore,
  type Notification,
} from "../../store/notificationStore";

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = "",
}) => {
  const {
    notifications,
    unread_count,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  const [filter, setFilter] = React.useState<
    "all" | "unread" | "device_transfer" | "approval_request"
  >("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredNotifications = notifications.filter((notification) => {
    let matchesFilter = false;

    if (filter === "all") {
      matchesFilter = true;
    } else if (filter === "unread") {
      matchesFilter = !notification.read;
    } else {
      // For specific notification types (device_transfer, approval_request)
      matchesFilter = notification.type === filter;
    }

    const matchesSearch =
      searchTerm === "" ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

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
        return "border-l-red-500 bg-red-50";
      case "high":
        return "border-l-orange-500 bg-orange-50";
      case "medium":
        return "border-l-blue-500 bg-blue-50";
      default:
        return "border-l-gray-300 bg-gray-50";
    }
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b">
        <div className="flex items-center space-x-3">
          <Bell className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Notification Center
          </h2>
          {unread_count > 0 && (
            <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">
              {unread_count}
            </span>
          )}
        </div>

        {unread_count > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center px-3 py-2 space-x-2 text-sm text-blue-600 rounded-lg transition-colors hover:text-blue-800 hover:bg-blue-50"
          >
            <CheckCheck size={16} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="device_transfer">Device Transfers</option>
              <option value="approval_request">Approval Requests</option>
            </select>
          </div>

          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 text-gray-400 transform -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="py-2 pr-4 pl-10 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto max-h-96">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No notifications found</p>
            <p className="text-sm">
              {filter === "unread"
                ? "All caught up!"
                : "Check back later for updates"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 transition-all hover:bg-gray-50 ${
                notification.read ? "opacity-60" : ""
              } ${getPriorityColor(notification.priority)}`}
            >
              <div className="flex justify-between items-start p-4">
                <div className="flex flex-1 items-start space-x-3">
                  <span className="text-xl">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        notification.read
                          ? "text-gray-600"
                          : "text-gray-900 font-medium"
                      }`}
                    >
                      {notification.message}
                    </p>
                    {notification.time && (
                      <p className="mt-1 text-xs text-gray-500">
                        {notification.time}
                      </p>
                    )}
                    {notification.type && (
                      <span className="inline-block px-2 py-1 mt-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                        {notification.type.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center ml-4 space-x-1">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-gray-400 rounded-lg transition-colors hover:text-blue-600"
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-gray-400 rounded-lg transition-colors hover:text-red-600"
                    title="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
