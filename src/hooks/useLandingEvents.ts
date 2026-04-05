import { useCallback } from "react";
import type { LandingEventName } from "@/lib/analytics/landing-events-schema";

/**
 * Lightweight event tracking for landing page CRO
 * Sends events to analytics without blocking page performance
 */

interface EventPayload {
  variant?: "booking" | "pro";
  ctaLabel?: string;
  ctaLocation?: "hero" | "final_cta" | "narrative_rail";
  searchQuery?: string;
  location?: string;
  country?: string;
  timestamp?: number;
}

const useLandingEvents = () => {
  /**
   * Track a landing page event
   * Uses beacon API for reliability (survives page unload)
   * Falls back to fetch with keepalive for older browsers
   */
  const trackEvent = useCallback(
    (eventName: LandingEventName, payload: EventPayload = {}) => {
      const eventData = {
        event: eventName,
        ...payload,
        timestamp: payload.timestamp || Date.now(),
        url: typeof window !== "undefined" ? window.location.pathname : "",
        referrer: typeof document !== "undefined" ? document.referrer : "",
      };

      // Use sendBeacon if available (most reliable for page unload)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(eventData)], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/analytics/landing-events", blob);
      } else {
        // Fallback to fetch with keepalive
        fetch("/api/analytics/landing-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
          keepalive: true,
        }).catch(() => {
          // Silently fail - don't break user experience for analytics
        });
      }
    },
    [],
  );

  return { trackEvent };
};

export default useLandingEvents;
