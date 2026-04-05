import { useCallback } from "react";
import type { JobsEventName } from "@/lib/analytics/jobs-events-schema";

export interface JobsEventPayload {
  userRole?: "CLIENT" | "PROVIDER" | "ADMIN" | "GUEST";
  jobCategory?: string;
  budgetBand?: string;
  locationBand?: string;
  sourcePage?: string;
  experimentVariant?: string;
  timestamp?: number;
  jobId?: string;
  proposalId?: string;
  recommendationLabel?: string;
  isRecommended?: boolean;
}

export function useJobsEvents() {
  const trackEvent = useCallback(
    (event: JobsEventName, payload: JobsEventPayload = {}) => {
      const eventData = {
        event,
        ...payload,
        timestamp: payload.timestamp ?? Date.now(),
        url: typeof window !== "undefined" ? window.location.pathname : "",
        referrer: typeof document !== "undefined" ? document.referrer : "",
      };

      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(eventData)], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/analytics/jobs-events", blob);
        return;
      }

      fetch("/api/analytics/jobs-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
        keepalive: true,
      }).catch(() => {
        // Keep analytics non-blocking.
      });
    },
    [],
  );

  return { trackEvent };
}
