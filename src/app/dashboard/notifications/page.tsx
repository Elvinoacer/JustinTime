"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isApplicationUpdateNotification } from "@/lib/notifications/applicationUpdates";
import {
  emitNotificationSync,
  subscribeToNotificationSync,
} from "@/lib/notifications/clientSync";
import { getNotificationActionUrl } from "@/lib/notifications/routing";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
  clickedAt?: string | null;
}

interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextPage: number | null;
}

interface NotificationListResponse {
  notifications: NotificationItem[];
  pagination: NotificationPagination;
}

const PAGE_SIZE = 20;

type NotificationRoleOverride = "CLIENT" | "PROVIDER" | "ADMIN";

interface NotificationsPageProps {
  roleOverride?: NotificationRoleOverride;
}

async function fetchNotificationsPage(
  page: number,
): Promise<NotificationListResponse> {
  const response = await fetch(
    `/api/notifications?page=${page}&limit=${PAGE_SIZE}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json() as Promise<NotificationListResponse>;
}

const NotificationsPage = ({ roleOverride }: NotificationsPageProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<"all" | "unread" | "applications">(
    "all",
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const notificationsQuery = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) => fetchNotificationsPage(Number(pageParam)),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? (lastPage.pagination.nextPage ?? undefined)
        : undefined,
    refetchOnWindowFocus: true,
  });

  const notifications = useMemo(
    () =>
      notificationsQuery.data?.pages.flatMap((page) => page.notifications) ??
      [],
    [notificationsQuery.data],
  );
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = notificationsQuery;

  const refreshNotifications = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    emitNotificationSync({ reason: "notification-mutation" });
  };

  const markAsReadMutation = useMutation({
    mutationFn: async ({
      id,
      markClicked = false,
    }: {
      id: string;
      markClicked?: boolean;
    }) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markClicked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update notification");
      }

      return response.json();
    },
    onSuccess: () => {
      refreshNotifications();
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      refreshNotifications();
    },
    onError: () => {
      toast.error("Failed to mark all notifications as read");
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Notification deleted");
      refreshNotifications();
    },
    onError: () => {
      toast.error("Failed to delete notification");
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear notifications");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Notifications archived");
      refreshNotifications();
    },
    onError: () => {
      toast.error("Failed to clear notifications");
    },
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    const element = loadMoreRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void fetchNextPage();
        }
      },
      {
        rootMargin: "200px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    return subscribeToNotificationSync((payload) => {
      if (payload.reason) {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    });
  }, [queryClient]);

  const markAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync({ id });
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    const roleSource = roleOverride
      ? { role: roleOverride }
      : {
          role: session?.user?.role,
          roles: session?.user?.roles,
        };

    const actionUrl = getNotificationActionUrl(
      notification.type,
      roleSource,
      notification.actionUrl,
    );

    try {
      await markAsReadMutation.mutateAsync({
        id: notification.id,
        markClicked: true,
      });
    } catch {
      // Keep navigation responsive even if read tracking fails.
    }

    if (actionUrl && !actionUrl.endsWith("/notifications")) {
      router.push(actionUrl);
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm("Are you sure you want to clear all notifications?")) {
      return;
    }

    try {
      await clearAllMutation.mutateAsync();
    } catch {
      // The mutation already reports toast errors.
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") {
      return !notification.isRead;
    }

    if (filter === "applications") {
      return isApplicationUpdateNotification(notification.type);
    }

    return true;
  });

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;
  const applicationCount = notifications.filter((notification) =>
    isApplicationUpdateNotification(notification.type),
  ).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return "payments";
      case "BOOKING":
      case "BOOKING_CREATED":
      case "BOOKING_PENDING":
      case "BOOKING_CONFIRMED":
      case "BOOKING_REJECTED":
      case "BOOKING_CANCELLED":
      case "BOOKING_COMPLETED":
        return "calendar_month";
      case "MESSAGE":
        return "mail";
      case "SYSTEM":
        return "info";
      case "JOB":
      case "JOB_ALERT":
        return "work";
      case "PROPOSAL":
      case "PROPOSAL_STATUS_UPDATE":
      case "NEW_PROPOSAL":
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
      case "BOOKING_CREATED":
      case "BOOKING_PENDING":
      case "BOOKING_CONFIRMED":
      case "BOOKING_REJECTED":
      case "BOOKING_CANCELLED":
      case "BOOKING_COMPLETED":
        return "text-blue-600 bg-blue-100";
      case "MESSAGE":
        return "text-purple-600 bg-purple-100";
      case "SYSTEM":
        return "text-amber-600 bg-amber-100";
      case "JOB":
      case "JOB_ALERT":
        return "text-indigo-600 bg-indigo-100";
      case "PROPOSAL":
      case "PROPOSAL_STATUS_UPDATE":
      case "NEW_PROPOSAL":
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

  if (notificationsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-75 sm:min-h-100">
        <div
          className={`border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin ${
            isMobile ? "w-8 h-8 border-3" : "w-10 h-10 sm:w-12 sm:h-12 border-4"
          }`}
        />
      </div>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-lg font-semibold text-gray-900">
          Failed to load notifications
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Please try again in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 pb-16 sm:pb-8 pt-2 sm:pt-4 md:pt-6">
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
              } text-gray-600 bg-gray-100 px-2 py-1 rounded-lg font-medium shrink-0 ml-2`}
            >
              {filter === "all"
                ? `${notifications.length}`
                : filter === "unread"
                  ? `${unreadCount}`
                  : `${applicationCount}`}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 -mx-2 px-2">
          {[
            { value: "all", label: "All" },
            {
              value: "unread",
              label: `Unread ${unreadCount > 0 ? `(${unreadCount})` : ""}`,
            },
            {
              value: "applications",
              label: `Application Updates${applicationCount > 0 ? ` (${applicationCount})` : ""}`,
            },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() =>
                setFilter(item.value as "all" | "unread" | "applications")
              }
              className={`rounded-lg font-medium transition-colors touch-manipulation whitespace-nowrap ${
                filter === item.value
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
              } ${isMobile ? "px-3 py-1.5 text-xs" : "px-3 py-2 sm:px-4 text-sm"}`}
            >
              {item.label.trim()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 mt-2 xs:mt-0">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
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
              onClick={() => {
                void clearAllNotifications();
              }}
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
                : filter === "applications"
                  ? "No application updates yet"
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
                <div
                  className={`rounded-full flex items-center justify-center shrink-0 ${getNotificationColor(
                    notification.type,
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

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    void openNotification(notification);
                  }}
                >
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
                            className={`bg-emerald-500 rounded-full shrink-0 ${
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

                    <div className="flex items-center gap-0.5 self-end sm:self-start mt-1 sm:mt-0">
                      {!notification.isRead && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void markAsRead(notification.id);
                          }}
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
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeletingId(notification.id);
                          deleteNotificationMutation.mutate(notification.id);
                        }}
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

        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage && (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
