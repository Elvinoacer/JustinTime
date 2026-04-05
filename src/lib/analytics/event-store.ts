import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type MarketingEventChannel =
  | "landing"
  | "jobs"
  | "newsletter"
  | "contact";

type MarketingEventChannelFilter = MarketingEventChannel | "all";

type MarketingEventInput = {
  channel: MarketingEventChannel;
  event: string;
  payload: Record<string, unknown>;
};

type MarketingEventQueryInput = {
  channel?: MarketingEventChannelFilter;
  eventQuery?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
};

type MarketingEventLogRow = {
  id: string;
  channel: string;
  event: string;
  payload: unknown;
  createdAt: Date | string;
};

export type MarketingEventLogEntry = {
  id: string;
  channel: string;
  event: string;
  payload: Record<string, unknown> | null;
  createdAt: Date;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asObjectPayload(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function toNumber(value: bigint | number | null | undefined): number {
  if (typeof value === "bigint") {
    return Number(value);
  }

  return typeof value === "number" ? value : 0;
}

function buildWhereClause(input: MarketingEventQueryInput): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  if (input.channel && input.channel !== "all") {
    conditions.push(Prisma.sql`"channel" = ${input.channel}`);
  }

  if (input.eventQuery) {
    conditions.push(Prisma.sql`"event" ILIKE ${`%${input.eventQuery}%`}`);
  }

  if (input.startDate) {
    conditions.push(Prisma.sql`"createdAt" >= ${input.startDate}`);
  }

  if (input.endDate) {
    conditions.push(Prisma.sql`"createdAt" <= ${input.endDate}`);
  }

  if (conditions.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

const globalForMarketingEventStore = globalThis as typeof globalThis & {
  __marketingEventTableReady?: Promise<void>;
};

async function ensureMarketingEventTable(): Promise<void> {
  if (!globalForMarketingEventStore.__marketingEventTableReady) {
    globalForMarketingEventStore.__marketingEventTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "MarketingEventLog" (
            "id" TEXT PRIMARY KEY,
            "channel" TEXT NOT NULL,
            "event" TEXT NOT NULL,
            "payload" JSONB NOT NULL,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

      await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "MarketingEventLog_channel_event_createdAt_idx"
          ON "MarketingEventLog" ("channel", "event", "createdAt");
        `);
    })();
  }

  await globalForMarketingEventStore.__marketingEventTableReady;
}

export async function persistMarketingEvent(
  input: MarketingEventInput,
): Promise<boolean> {
  try {
    await ensureMarketingEventTable();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "MarketingEventLog" ("id", "channel", "event", "payload", "createdAt")
        VALUES ($1, $2, $3, $4::jsonb, $5)
      `,
      randomUUID(),
      input.channel,
      input.event,
      JSON.stringify(input.payload),
      new Date(),
    );

    return true;
  } catch (error) {
    console.error("[ANALYTICS_PERSIST_ERROR]", {
      channel: input.channel,
      event: input.event,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function listMarketingEvents(
  input: MarketingEventQueryInput = {},
): Promise<{
  events: MarketingEventLogEntry[];
  total: number;
}> {
  await ensureMarketingEventTable();

  const limit = clamp(input.limit ?? 40, 1, 5_000);
  const offset = Math.max(0, input.offset ?? 0);
  const eventQuery = input.eventQuery?.trim();
  const whereClause = buildWhereClause({
    channel: input.channel,
    eventQuery,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  const [rows, totalRows] = await Promise.all([
    prisma.$queryRaw<MarketingEventLogRow[]>(Prisma.sql`
      SELECT "id", "channel", "event", "payload", "createdAt"
      FROM "MarketingEventLog"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "MarketingEventLog"
      ${whereClause}
    `),
  ]);

  return {
    events: rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      event: row.event,
      payload: asObjectPayload(row.payload),
      createdAt:
        row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    })),
    total: toNumber(totalRows[0]?.count),
  };
}
