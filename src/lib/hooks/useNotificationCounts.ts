"use client";

import { useCallback, useEffect, useState } from "react";

type NotificationCounts = {
  unreadCount: number;
  unreadApplicationUpdatesCount: number;
};

const DEFAULT_COUNTS: NotificationCounts = {
  unreadCount: 0,
  unreadApplicationUpdatesCount: 0,
};

export function useNotificationCounts(
  refreshSignal?: string,
): NotificationCounts {
  const [counts, setCounts] = useState<NotificationCounts>(DEFAULT_COUNTS);

  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?counts=true", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        counts?: Partial<NotificationCounts>;
      };

      if (!data.counts) {
        return;
      }

      setCounts({
        unreadCount: Number(data.counts.unreadCount || 0),
        unreadApplicationUpdatesCount: Number(
          data.counts.unreadApplicationUpdatesCount || 0,
        ),
      });
    } catch {
      // Keep previous value if the network is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    void fetchCounts();
  }, [fetchCounts, refreshSignal]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchCounts();
    }, 45000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchCounts]);

  return counts;
}
