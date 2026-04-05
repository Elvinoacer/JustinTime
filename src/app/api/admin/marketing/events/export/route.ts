import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/roles";
import {
  listMarketingEvents,
  type MarketingEventChannel,
} from "@/lib/analytics/event-store";

type ChannelFilter = MarketingEventChannel | "all";

const EXPORT_BATCH_SIZE = 2_000;
const MAX_EXPORT_ROWS = 20_000;

function parseChannelFilter(value: string | null): ChannelFilter {
  if (
    value === "landing" ||
    value === "jobs" ||
    value === "newsletter" ||
    value === "contact"
  ) {
    return value;
  }

  return "all";
}

function parseDateInput(
  value: string | null,
  options?: { endOfDay?: boolean },
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return undefined;
  }

  const timePart = options?.endOfDay ? "23:59:59.999" : "00:00:00.000";
  const parsed = new Date(`${trimmed}T${timePart}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsvRow(columns: string[]): string {
  return columns.map(toCsvValue).join(",");
}

export const GET = auth(async (request) => {
  try {
    const actor = request.auth?.user;

    if (!actor?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRole(actor, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const channel = parseChannelFilter(searchParams.get("channel"));
    const eventQuery = searchParams.get("q")?.trim() || "";
    const startDate = parseDateInput(searchParams.get("startDate"));
    const endDate = parseDateInput(searchParams.get("endDate"), {
      endOfDay: true,
    });

    const events: Array<{
      id: string;
      createdAt: Date;
      channel: string;
      event: string;
      payload: Record<string, unknown> | null;
    }> = [];

    let offset = 0;
    let total = 0;

    while (events.length < MAX_EXPORT_ROWS) {
      const batch = await listMarketingEvents({
        channel,
        eventQuery,
        startDate,
        endDate,
        limit: EXPORT_BATCH_SIZE,
        offset,
      });

      total = batch.total;
      events.push(...batch.events);
      offset += batch.events.length;

      if (batch.events.length === 0 || offset >= batch.total) {
        break;
      }
    }

    const truncated = total > events.length;

    const lines = [
      toCsvRow(["id", "createdAt", "channel", "event", "payload"]),
      ...events.map((event) =>
        toCsvRow([
          event.id,
          event.createdAt.toISOString(),
          event.channel,
          event.event,
          JSON.stringify(event.payload ?? {}),
        ]),
      ),
    ];

    if (truncated) {
      lines.push(
        toCsvRow([
          "",
          "",
          "",
          "__TRUNCATED__",
          `Export capped at ${MAX_EXPORT_ROWS} rows out of ${total} total records`,
        ]),
      );
    }

    const csvBody = `\uFEFF${lines.join("\n")}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    return new NextResponse(csvBody, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=marketing-events-${timestamp}.csv`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[ADMIN_MARKETING_EVENTS_EXPORT_ERROR]", {
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to export marketing events" },
      { status: 500 },
    );
  }
});
