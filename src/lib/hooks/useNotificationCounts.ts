"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  emitNotificationSync,
  subscribeToNotificationSync,
} from "@/lib/notifications/clientSync";

type NotificationCounts = {
  unreadCount: number;
  unreadApplicationUpdatesCount: number;
};

const DEFAULT_COUNTS: NotificationCounts = {
  unreadCount: 0,
  unreadApplicationUpdatesCount: 0,
};

const POLL_INTERVAL_MS = 45000;
const LEADER_HEARTBEAT_MS = 20000;
const LEADER_LEASE_MS = 70000;
const LEADER_STORAGE_KEY = "jit:notifications:poll-leader";
const MIN_FETCH_GAP_MS = 1500;

type PollLeaderLease = {
  tabId: string;
  expiresAt: number;
};

function parsePollLeaderLease(value: string | null): PollLeaderLease | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as PollLeaderLease;
    if (
      !parsed ||
      typeof parsed.tabId !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useNotificationCounts(
  refreshSignal?: string,
  enabled = true,
): NotificationCounts {
  const [counts, setCounts] = useState<NotificationCounts>(DEFAULT_COUNTS);
  const [isLeader, setIsLeader] = useState(false);
  const tabId = useMemo(
    () => `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const lastFetchAtRef = useRef(0);
  const isLeaderRef = useRef(false);

  const releaseLeadership = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentLease = parsePollLeaderLease(
      window.localStorage.getItem(LEADER_STORAGE_KEY),
    );

    if (currentLease?.tabId === tabId) {
      window.localStorage.removeItem(LEADER_STORAGE_KEY);
    }
  }, [tabId]);

  const refreshLeadership = useCallback(() => {
    if (!enabled || typeof window === "undefined") {
      isLeaderRef.current = false;
      setIsLeader(false);
      return false;
    }

    const now = Date.now();
    const currentLease = parsePollLeaderLease(
      window.localStorage.getItem(LEADER_STORAGE_KEY),
    );

    const shouldClaimLease =
      !currentLease ||
      currentLease.expiresAt <= now ||
      currentLease.tabId === tabId;

    if (shouldClaimLease) {
      const nextLease: PollLeaderLease = {
        tabId,
        expiresAt: now + LEADER_LEASE_MS,
      };

      try {
        window.localStorage.setItem(
          LEADER_STORAGE_KEY,
          JSON.stringify(nextLease),
        );
      } catch {
        // localStorage is unavailable in some private browsing modes.
      }

      isLeaderRef.current = true;
      setIsLeader(true);
      return true;
    }

    isLeaderRef.current = false;
    setIsLeader(false);
    return false;
  }, [enabled, tabId]);

  const fetchCounts = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const now = Date.now();
    if (now - lastFetchAtRef.current < MIN_FETCH_GAP_MS) {
      return;
    }
    lastFetchAtRef.current = now;

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

      if (isLeaderRef.current) {
        emitNotificationSync({
          reason: "counts-poll",
          unreadCount: Number(data.counts.unreadCount || 0),
          unreadApplicationUpdatesCount: Number(
            data.counts.unreadApplicationUpdatesCount || 0,
          ),
        });
      }
    } catch {
      // Keep previous value if the network is temporarily unavailable.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCounts(DEFAULT_COUNTS);
      setIsLeader(false);
      isLeaderRef.current = false;
      releaseLeadership();
    }
  }, [enabled, releaseLeadership]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    refreshLeadership();

    const heartbeat = window.setInterval(() => {
      refreshLeadership();
    }, LEADER_HEARTBEAT_MS);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LEADER_STORAGE_KEY) {
        refreshLeadership();
      }
    };

    const handleBeforeUnload = () => {
      releaseLeadership();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      releaseLeadership();
    };
  }, [enabled, refreshLeadership, releaseLeadership]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void fetchCounts();
  }, [fetchCounts, refreshSignal, enabled]);

  useEffect(() => {
    if (!enabled || !isLeader) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchCounts();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, fetchCounts, isLeader]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribeToNotificationSync((payload) => {
      if (
        typeof payload.unreadCount === "number" &&
        typeof payload.unreadApplicationUpdatesCount === "number"
      ) {
        setCounts({
          unreadCount: payload.unreadCount,
          unreadApplicationUpdatesCount: payload.unreadApplicationUpdatesCount,
        });
        return;
      }

      if (payload.reason) {
        void fetchCounts();
      }
    });
  }, [enabled, fetchCounts]);

  return counts;
}
