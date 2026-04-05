import Link from "next/link";
import {
  listMarketingEvents,
  type MarketingEventChannel,
} from "@/lib/analytics/event-store";

type ChannelFilter = MarketingEventChannel | "all";

interface AdminMarketingEventsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const PAGE_SIZE = 40;
const CHANNEL_FILTERS: Array<{ value: ChannelFilter; label: string }> = [
  { value: "all", label: "All channels" },
  { value: "landing", label: "Landing" },
  { value: "jobs", label: "Jobs" },
  { value: "newsletter", label: "Newsletter" },
  { value: "contact", label: "Contact" },
];

const CHANNEL_BADGE_STYLES: Record<string, string> = {
  landing: "bg-sky-50 text-sky-700 border-sky-200",
  jobs: "bg-indigo-50 text-indigo-700 border-indigo-200",
  newsletter: "bg-emerald-50 text-emerald-700 border-emerald-200",
  contact: "bg-amber-50 text-amber-700 border-amber-200",
};

function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseChannelFilter(value: string | undefined): ChannelFilter {
  if (!value) {
    return "all";
  }

  return CHANNEL_FILTERS.some((item) => item.value === value)
    ? (value as ChannelFilter)
    : "all";
}

function parsePage(value: string | undefined): number {
  const parsed = Number(value ?? "1");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function parseDateInput(
  value: string | undefined,
  options?: { endOfDay?: boolean },
): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const timePart = options?.endOfDay ? "23:59:59.999" : "00:00:00.000";
  const parsed = new Date(`${value}T${timePart}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function getPayloadPreview(payload: Record<string, unknown> | null): string {
  if (!payload) {
    return "No payload";
  }

  const compact = JSON.stringify(payload);
  if (compact.length <= 180) {
    return compact;
  }

  return `${compact.slice(0, 177)}...`;
}

function buildHref(input: {
  channel: ChannelFilter;
  query: string;
  startDate: string;
  endDate: string;
  page: number;
}): string {
  const params = new URLSearchParams();

  if (input.channel !== "all") {
    params.set("channel", input.channel);
  }

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.startDate) {
    params.set("startDate", input.startDate);
  }

  if (input.endDate) {
    params.set("endDate", input.endDate);
  }

  if (input.page > 1) {
    params.set("page", String(input.page));
  }

  const queryString = params.toString();
  return queryString
    ? `/admin/marketing/events?${queryString}`
    : "/admin/marketing/events";
}

export default async function AdminMarketingEventsPage({
  searchParams,
}: AdminMarketingEventsPageProps) {
  const params = (await searchParams) ?? {};
  const channel = parseChannelFilter(getSingleValue(params.channel));
  const query = (getSingleValue(params.q) ?? "").trim();
  const startDate = (getSingleValue(params.startDate) ?? "").trim();
  const endDate = (getSingleValue(params.endDate) ?? "").trim();
  const startDateFilter = parseDateInput(startDate);
  const endDateFilter = parseDateInput(endDate, { endOfDay: true });
  const page = parsePage(getSingleValue(params.page));
  const offset = (page - 1) * PAGE_SIZE;

  const { events, total } = await listMarketingEvents({
    channel,
    eventQuery: query,
    startDate: startDateFilter,
    endDate: endDateFilter,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startCount = total === 0 ? 0 : offset + 1;
  const endCount = Math.min(offset + events.length, total);
  const exportHref = (() => {
    const exportParams = new URLSearchParams();

    if (channel !== "all") {
      exportParams.set("channel", channel);
    }

    if (query) {
      exportParams.set("q", query);
    }

    if (startDate) {
      exportParams.set("startDate", startDate);
    }

    if (endDate) {
      exportParams.set("endDate", endDate);
    }

    const queryString = exportParams.toString();
    return queryString
      ? `/api/admin/marketing/events/export?${queryString}`
      : "/api/admin/marketing/events/export";
  })();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Marketing Event Log
          </h1>
          <p className="text-gray-600">
            Review captured landing, jobs, newsletter, and contact events.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/marketing/promos"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Promotions
          </Link>
          <Link
            href={exportHref}
            className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Export CSV
          </Link>
        </div>
      </div>

      <form
        method="GET"
        action="/admin/marketing/events"
        className="rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="grid gap-3 md:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Channel
            <select
              name="channel"
              defaultValue={channel}
              className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
            >
              {CHANNEL_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Start date
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            End date
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700 md:col-span-2">
            Event name contains
            <div className="flex gap-2">
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="newsletter_subscribe, proposal_accepted, contact_form..."
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
              >
                Filter
              </button>
            </div>
          </label>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
          <span>
            Showing {startCount} to {endCount} of {total} events
          </span>
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No events found for the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => {
                  const payloadPreview = getPayloadPreview(event.payload);
                  const payloadText = event.payload
                    ? JSON.stringify(event.payload, null, 2)
                    : "No payload";

                  return (
                    <tr key={event.id} className="align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {event.createdAt.toISOString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
                            CHANNEL_BADGE_STYLES[event.channel] ||
                            "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {event.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {event.event}
                      </td>
                      <td className="px-4 py-3">
                        <details>
                          <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-900">
                            {payloadPreview}
                          </summary>
                          <pre className="mt-2 max-h-60 overflow-auto rounded-md bg-gray-950 p-3 text-xs text-gray-100">
                            {payloadText}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
          {currentPage > 1 ? (
            <Link
              href={buildHref({
                channel,
                query,
                startDate,
                endDate,
                page: currentPage - 1,
              })}
              className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Previous
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400">
              Previous
            </span>
          )}

          {currentPage < totalPages ? (
            <Link
              href={buildHref({
                channel,
                query,
                startDate,
                endDate,
                page: currentPage + 1,
              })}
              className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Next
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400">
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
