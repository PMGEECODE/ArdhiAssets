// src/store/notificationStore.ts
import { create } from "zustand";
import { API_URL } from "../config/constants";

export interface Notification {
  id: string;
  message: string;
  time?: string;
  link?: string;
  read: boolean;
  type?:
    | "device_transfer"
    | "approval_request"
    | "overdue_reminder"
    | "system"
    | "general";
  priority?: "low" | "medium" | "high" | "urgent";
  created_at?: string;
}

interface NotificationState {
  notifications: Notification[];
  unread_count: number;
  isPolling: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
}

let pollingInterval: NodeJS.Timeout | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unread_count: 0,
  isPolling: false,

  fetchNotifications: async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        credentials: "include", // ✅ send cookies
      });

      if (!res.ok) throw new Error("Failed to fetch notifications");

      const data: Notification[] = await res.json();

      const processedData = data.map((notification) => ({
        ...notification,
        time: notification.created_at
          ? formatNotificationTime(notification.created_at)
          : undefined,
        type: detectNotificationType(notification.message),
        priority: detectNotificationPriority(notification.message),
      }));

      const unread = processedData.filter((n) => !n.read).length;
      set({ notifications: processedData, unread_count: unread });
    } catch (error) {
      console.error("Notification fetch error:", error);
    }
  },

  markAsRead: async (id: string) => {
    const current = get().notifications.find((n) => n.id === id);
    if (!current || current.read) return;

    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    const unread = updated.filter((n) => !n.read).length;
    set({ notifications: updated, unread_count: unread });

    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "POST",
        credentials: "include", // ✅ send cookies
      });
    } catch (err) {
      console.error("Mark-as-read failed:", err);
    }
  },

  markAllAsRead: async () => {
    const unreadNotifications = get().notifications.filter((n) => !n.read);
    if (unreadNotifications.length === 0) return;

    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: updated, unread_count: 0 });

    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          fetch(`${API_URL}/notifications/${notification.id}/read`, {
            method: "POST",
            credentials: "include", // ✅ send cookies
          })
        )
      );
    } catch (err) {
      console.error("Mark-all-as-read failed:", err);
    }
  },

  deleteNotification: async (id: string) => {
    const updated = get().notifications.filter((n) => n.id !== id);
    const unread = updated.filter((n) => !n.read).length;
    set({ notifications: updated, unread_count: unread });

    try {
      await fetch(`${API_URL}/notifications/${id}`, {
        method: "DELETE",
        credentials: "include", // ✅ send cookies
      });
    } catch (err) {
      console.error("Delete notification failed:", err);
    }
  },

  startPolling: () => {
    if (pollingInterval) return;

    set({ isPolling: true });

    get().fetchNotifications();

    pollingInterval = setInterval(() => {
      get().fetchNotifications();
    }, 30000);
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    set({ isPolling: false });
  },
}));

// --- Helpers ---
function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString();
}

function detectNotificationType(message: string): Notification["type"] {
  if (message.includes("transferred") || message.includes("transfer"))
    return "device_transfer";
  if (message.includes("approval") || message.includes("approve"))
    return "approval_request";
  if (message.includes("overdue") || message.includes("return"))
    return "overdue_reminder";
  if (message.includes("system") || message.includes("maintenance"))
    return "system";
  return "general";
}

function detectNotificationPriority(message: string): Notification["priority"] {
  if (message.includes("urgent") || message.includes("critical"))
    return "urgent";
  if (message.includes("overdue") || message.includes("approval"))
    return "high";
  if (message.includes("transferred") || message.includes("assigned"))
    return "medium";
  return "low";
}
