-- Track runtime-created analytics table in Prisma migration history.
-- This is intentionally idempotent to preserve existing data.

CREATE TABLE IF NOT EXISTS "MarketingEventLog" (
  "id" TEXT PRIMARY KEY,
  "channel" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "MarketingEventLog_channel_event_createdAt_idx"
ON "MarketingEventLog" ("channel", "event", "createdAt");
