import { useCallback } from "react";

export type JobsEventName =
  | "job_post_started"
  | "job_post_minimal_submitted"
  | "job_post_details_completed"
  | "job_post_published"
  | "proposal_first_received"
  | "proposal_card_viewed"
  | "proposal_compare_opened"
  | "proposal_accepted"
  | "provider_apply_started"
  | "provider_apply_submitted"
  | "pricing_hint_seen"
  | "pricing_hint_applied"
  | "risk_badge_seen";

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
