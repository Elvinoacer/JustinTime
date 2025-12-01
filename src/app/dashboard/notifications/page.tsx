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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
        setNotifications(
          notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        toast.success("Marked as read");
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (response.ok) {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotifications(notifications.filter((n) => n.id !== id));
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

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
      case "JOB":
        return "work";
      case "PROPOSAL":
        return "description";
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
      case "JOB":
        return "text-indigo-600 bg-indigo-100";
      case "PROPOSAL":
        return "text-pink-600 bg-pink-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div
          className={`border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin ${
            isMobile ? "w-8 h-8 border-3" : "w-10 h-10 sm:w-12 sm:h-12 border-4"
          }`}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 pb-16 sm:pb-8 pt-2 sm:pt-4 md:pt-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h1
              className={`font-bold text-gray-900 truncate ${
                isMobile
                  ? "text-lg sm:text-xl"
                  : "text-xl sm:text-2xl md:text-3xl"
              }`}
            >
              Notifications
            </h1>
            <p
              className={`text-gray-600 ${
                isMobile ? "text-xs sm:text-sm" : "text-sm sm:text-base"
              } mt-0.5`}
            >
              Stay updated with your account activity
            </p>
          </div>
          {notifications.length > 0 && (
            <div
              className={`${
                isMobile ? "text-xs" : "text-sm"
              } text-gray-600 bg-gray-100 px-2 py-1 rounded-lg font-medium flex-shrink-0 ml-2`}
            >
              {filter === "all" ? `${notifications.length}` : `${unreadCount}`}
            </div>
          )}
        </div>
      </div>

      {/* Filter and Actions */}
      <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 -mx-2 px-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg font-medium transition-colors touch-manipulation whitespace-nowrap ${
              filter === "all"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
            } ${
              isMobile ? "px-3 py-1.5 text-xs" : "px-3 py-2 sm:px-4 text-sm"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`rounded-lg font-medium transition-colors touch-manipulation whitespace-nowrap ${
              filter === "unread"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
            } ${
              isMobile ? "px-3 py-1.5 text-xs" : "px-3 py-2 sm:px-4 text-sm"
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 mt-2 xs:mt-0">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className={`text-emerald-600 hover:text-emerald-700 active:text-emerald-800 font-medium flex items-center gap-1 sm:gap-2 touch-manipulation ${
                isMobile
                  ? "text-xs px-2 py-1.5"
                  : "text-xs sm:text-sm px-3 py-2 sm:px-4"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                done_all
              </span>
              <span className={`${isMobile ? "hidden xs:inline" : ""}`}>
                Mark all read
              </span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className={`text-red-600 hover:text-red-700 active:text-red-800 font-medium flex items-center gap-1 sm:gap-2 touch-manipulation ${
                isMobile
                  ? "text-xs px-2 py-1.5"
                  : "text-xs sm:text-sm px-3 py-2 sm:px-4"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                delete_sweep
              </span>
              <span className={`${isMobile ? "hidden xs:inline" : ""}`}>
                Clear All
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2 sm:space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-6 sm:py-8 md:py-12 bg-gray-50 rounded-lg sm:rounded-xl">
            <span
              className={`material-symbols-outlined text-gray-300 mb-2 sm:mb-3 ${
                isMobile
                  ? "text-3xl sm:text-4xl"
                  : "text-4xl sm:text-5xl md:text-6xl"
              }`}
            >
              notifications_off
            </span>
            <p
              className={`text-gray-600 font-medium mb-1 ${
                isMobile ? "text-sm" : "text-sm sm:text-base"
              }`}
            >
              No notifications
            </p>
            <p
              className={`text-gray-500 ${
                isMobile ? "text-xs" : "text-xs sm:text-sm"
              }`}
            >
              {filter === "unread"
                ? "You're all caught up!"
                : "Check back later for updates"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`border rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-sm sm:hover:shadow-md transition-shadow touch-manipulation ${
                notification.isRead
                  ? "border-gray-200 bg-white"
                  : "border-emerald-200 bg-emerald-50/50"
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                {/* Icon */}
                <div
                  className={`rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(
                    notification.type
                  )} ${isMobile ? "w-8 h-8" : "w-9 h-9 sm:w-10 sm:h-10"}`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      isMobile ? "text-sm" : "text-base sm:text-lg"
                    }`}
                  >
                    {getNotificationIcon(notification.type)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3
                          className={`font-semibold text-gray-900 truncate ${
                            isMobile ? "text-sm" : "text-sm sm:text-base"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span
                            className={`bg-emerald-500 rounded-full flex-shrink-0 ${
                              isMobile ? "w-1.5 h-1.5" : "w-2 h-2"
                            }`}
                          />
                        )}
                      </div>
                      <p
                        className={`text-gray-600 line-clamp-2 ${
                          isMobile ? "text-xs" : "text-xs sm:text-sm"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p
                        className={`text-gray-500 mt-1 sm:mt-1.5 ${
                          isMobile ? "text-[10px]" : "text-xs"
                        }`}
                      >
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 self-end sm:self-start mt-1 sm:mt-0">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className={`text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 rounded-lg transition-colors touch-manipulation ${
                            isMobile ? "p-1" : "p-1.5"
                          }`}
                          title="Mark as read"
                          aria-label="Mark as read"
                        >
                          <span
                            className={`material-symbols-outlined ${
                              isMobile ? "text-sm" : "text-base"
                            }`}
                          >
                            check
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        disabled={deletingId === notification.id}
                        className={`text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation disabled:opacity-50 ${
                          isMobile ? "p-1" : "p-1.5"
                        }`}
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        {deletingId === notification.id ? (
                          <div
                            className={`border-red-500/20 border-t-red-500 rounded-full animate-spin ${
                              isMobile ? "w-3 h-3 border-2" : "w-4 h-4 border-2"
                            }`}
                          />
                        ) : (
                          <span
                            className={`material-symbols-outlined ${
                              isMobile ? "text-sm" : "text-base"
                            }`}
                          >
                            delete
                          </span>
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

      {/* Bottom action buttons for mobile */}
      {isMobile && notifications.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg p-3 z-10">
          <div className="flex justify-between items-center max-w-4xl mx-auto px-2">
            <span className="text-xs text-gray-600">
              {filter === "all"
                ? `${notifications.length} total`
                : `${unreadCount} unread`}
            </span>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors touch-manipulation whitespace-nowrap"
                >
                  Mark All Read
                </button>
              )}
              <button
                onClick={clearAllNotifications}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation whitespace-nowrap"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
