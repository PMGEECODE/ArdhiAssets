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
  isConnected: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  connectSSE: () => void;
  disconnectSSE: () => void;
}

let eventSource: EventSource | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unread_count: 0,
  isConnected: false,

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

  connectSSE: () => {
    if (eventSource) return;

    // Initial fetch to get current state
    get().fetchNotifications();

    eventSource = new EventSource(`${API_URL}/notifications/stream`, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      console.log("Notification SSE connected");
      set({ isConnected: true });
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.event === "new_notification") {
          const newNotification = payload.data;

          // Process the new notification
          const processed = {
            ...newNotification,
            time: formatNotificationTime(newNotification.created_at),
            type: detectNotificationType(newNotification.message),
            priority: detectNotificationPriority(newNotification.message),
          };

          set((state) => {
            // Avoid duplicates
            if (state.notifications.some((n) => n.id === processed.id)) {
              return state;
            }

            const updatedNotifications = [processed, ...state.notifications];
            return {
              notifications: updatedNotifications,
              unread_count: state.unread_count + 1,
            };
          });
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      eventSource?.close();
      eventSource = null;
      set({ isConnected: false });

      // Retry connection after 5 seconds
      setTimeout(() => {
        get().connectSSE();
      }, 5000);
    };
  },

  disconnectSSE: () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    set({ isConnected: false });
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
// ----------------------------------------------------------------------
