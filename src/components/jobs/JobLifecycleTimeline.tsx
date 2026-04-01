"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

type JobTimelineItem = {
  id: string;
  eventType: string;
  fromState: string | null;
  toState: string | null;
  reason: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
};

type JobTimelineResponse = {
  items: JobTimelineItem[];
};

type TimelinePayload = {
  items: JobTimelineItem[];
  forbidden: boolean;
};

type JobLifecycleTimelineProps = {
  jobId: string;
  title?: string;
  compact?: boolean;
  enabled?: boolean;
  pageSize?: number;
};

const EVENT_LABELS: Record<string, string> = {
  JOB_CREATED: "Job created",
  JOB_UPDATED: "Job updated",
  JOB_STATUS_CHANGED: "Job status changed",
  PROPOSAL_SUBMITTED: "Application submitted",
  PROPOSAL_STATUS_CHANGED: "Application status changed",
  BOOKING_CREATED: "Booking created",
  BOOKING_STATUS_CHANGED: "Booking status changed",
  PAYMENT_CREATED: "Payment hold created",
  PAYMENT_STATUS_CHANGED: "Payment status changed",
  REVIEW_SUBMITTED: "Feedback submitted",
  SLA_EXECUTION_STALLED: "Execution stalled",
  SLA_COMPLETION_DELAYED: "Completion delayed",
};

function getEventLabel(eventType: string) {
  if (EVENT_LABELS[eventType]) {
    return EVENT_LABELS[eventType];
  }

  return eventType
    .split("_")
    .filter(Boolean)
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join(" ");
}

function getStateTransitionText(
  fromState: string | null,
  toState: string | null,
) {
  if (fromState && toState) {
    return `${fromState} -> ${toState}`;
  }

  if (toState) {
    return `Current: ${toState}`;
  }

  return null;
}

function getTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown time";
  }

  return parsed.toLocaleString();
}

export default function JobLifecycleTimeline({
  jobId,
  title = "Lifecycle Timeline",
  compact = false,
  enabled = true,
  pageSize = 30,
}: JobLifecycleTimelineProps) {
  const { data, isLoading, isError } = useQuery<TimelinePayload>({
    queryKey: ["job-lifecycle-timeline", jobId, pageSize],
    enabled: enabled && Boolean(jobId),
    queryFn: async () => {
      try {
        const response = await apiClient.get<JobTimelineResponse>(
          `/jobs/${jobId}/timeline`,
          {
            params: {
              page: 1,
              pageSize,
            },
          },
        );

        return {
          items: Array.isArray(response.data?.items) ? response.data.items : [],
          forbidden: false,
        };
      } catch (error) {
        const status =
          typeof error === "object" && error !== null
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;

        if (status === 403) {
          return {
            items: [],
            forbidden: true,
          };
        }

        throw error;
      }
    },
  });

  const items = useMemo(() => {
    if (!data?.items) {
      return [];
    }

    return compact ? data.items.slice(0, 8) : data.items;
  }, [compact, data?.items]);

  if (!enabled || data?.forbidden) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900">
          {title}
        </h2>
        {compact && data?.items && data.items.length > items.length ? (
          <span className="text-[11px] sm:text-xs text-gray-500">
            Showing latest {items.length}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="h-16 rounded-lg bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600">Failed to load timeline events.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">
          No lifecycle events recorded yet.
        </p>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {items.map((entry) => {
            const transitionText = getStateTransitionText(
              entry.fromState,
              entry.toState,
            );

            return (
              <div
                key={entry.id}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 sm:p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-slate-700">
                    {getEventLabel(entry.eventType)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {getTimestamp(entry.createdAt)}
                  </span>
                </div>

                {transitionText ? (
                  <p className="text-[11px] sm:text-xs text-slate-600 mb-1">
                    {transitionText}
                  </p>
                ) : null}

                <p className="text-xs sm:text-sm text-slate-700">
                  {entry.reason || "No reason recorded."}
                </p>

                {entry.actorName || entry.actorRole ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    By {entry.actorName || entry.actorRole || "System"}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
