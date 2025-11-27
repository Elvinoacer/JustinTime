"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === id ? { ...n, isRead: true } : n
        ));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== id));
        toast.success("Notification deleted");
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
      });
      
      if (response.ok) {
        setNotifications([]);
        toast.success("All notifications cleared");
      } else {
        throw new Error("Failed to clear notifications");
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Failed to clear notifications");
    }
  };

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return "payments";
      case "BOOKING":
        return "calendar_month";
      case "MESSAGE":
        return "mail";
      case "SYSTEM":
        return "info";
      default:
        return "notifications";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return "text-emerald-600 bg-emerald-100";
      case "BOOKING":
        return "text-blue-600 bg-blue-100";
      case "MESSAGE":
        return "text-purple-600 bg-purple-100";
      case "SYSTEM":
        return "text-amber-600 bg-amber-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
        <p className="text-gray-600">Stay updated with your account activity</p>
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "all"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "unread"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">done_all</span>
            Mark all as read
          </button>
        )}
        {notifications.length > 0 && (
          <button
            onClick={clearAllNotifications}
            className="px-4 py-2 text-red-600 hover:text-red-700 font-medium flex items-center gap-2 ml-2"
          >
            <span className="material-symbols-outlined text-sm">delete_sweep</span>
            Clear All
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              notifications_off
            </span>
            <p className="text-gray-600 font-medium">No notifications</p>
            <p className="text-sm text-gray-500 mt-1">
              {filter === "unread" ? "You're all caught up!" : "Check back later for updates"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                notification.isRead ? "border-gray-200" : "border-emerald-200 bg-emerald-50/30"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                  <span className="material-symbols-outlined text-xl">
                    {getNotificationIcon(notification.type)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {notification.title}
                        {!notification.isRead && (
                          <span className="ml-2 inline-block w-2 h-2 bg-emerald-500 rounded-full" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <span className="material-symbols-outlined text-lg">check</span>
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        disabled={deletingId === notification.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === notification.id ? (
                          <div className="w-5 h-5 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-lg">delete</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
