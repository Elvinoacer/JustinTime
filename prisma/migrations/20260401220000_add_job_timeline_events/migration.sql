-- Add unified lifecycle timeline records for jobs, proposals, bookings, and payments.
CREATE TABLE IF NOT EXISTS "JobTimelineEvent" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "proposalId" TEXT,
  "bookingId" TEXT,
  "paymentId" TEXT,
  "eventType" TEXT NOT NULL,
  "fromState" TEXT,
  "toState" TEXT,
  "reason" TEXT,
  "actorUserId" TEXT,
  "actorName" TEXT,
  "actorRole" TEXT,
  "metadata" JSONB,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JobTimelineEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobTimelineEvent_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JobTimelineEvent_proposalId_fkey"
    FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JobTimelineEvent_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JobTimelineEvent_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobTimelineEvent_idempotencyKey_key"
  ON "JobTimelineEvent"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "JobTimelineEvent_jobId_createdAt_idx"
  ON "JobTimelineEvent"("jobId", "createdAt");

CREATE INDEX IF NOT EXISTS "JobTimelineEvent_proposalId_createdAt_idx"
  ON "JobTimelineEvent"("proposalId", "createdAt");

CREATE INDEX IF NOT EXISTS "JobTimelineEvent_bookingId_createdAt_idx"
  ON "JobTimelineEvent"("bookingId", "createdAt");

CREATE INDEX IF NOT EXISTS "JobTimelineEvent_paymentId_createdAt_idx"
  ON "JobTimelineEvent"("paymentId", "createdAt");

CREATE INDEX IF NOT EXISTS "JobTimelineEvent_eventType_createdAt_idx"
  ON "JobTimelineEvent"("eventType", "createdAt");
