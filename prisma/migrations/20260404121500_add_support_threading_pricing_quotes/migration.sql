ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "pricingQuoteId" TEXT;

ALTER TABLE "SupportTicket"
  ADD COLUMN IF NOT EXISTS "relatedEntityType" TEXT,
  ADD COLUMN IF NOT EXISTS "relatedEntityId" TEXT;

CREATE TABLE IF NOT EXISTS "PricingQuote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "slotDate" TIMESTAMP(3) NOT NULL,
  "slotCount" INTEGER NOT NULL DEFAULT 1,
  "basePrice" DECIMAL(10, 2) NOT NULL,
  "multiplier" DOUBLE PRECISION NOT NULL,
  "finalPrice" DECIMAL(10, 2) NOT NULL,
  "reason" TEXT,
  "breakdown" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PricingQuote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PricingQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PricingQuote_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorRole" TEXT NOT NULL DEFAULT 'USER',
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupportTicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$
BEGIN
  ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_pricingQuoteId_fkey"
    FOREIGN KEY ("pricingQuoteId") REFERENCES "PricingQuote"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_pricingQuoteId_key"
  ON "Booking"("pricingQuoteId");

CREATE INDEX IF NOT EXISTS "PricingQuote_userId_expiresAt_idx"
  ON "PricingQuote"("userId", "expiresAt");

CREATE INDEX IF NOT EXISTS "PricingQuote_serviceId_expiresAt_idx"
  ON "PricingQuote"("serviceId", "expiresAt");

CREATE INDEX IF NOT EXISTS "SupportTicket_relatedEntityType_relatedEntityId_idx"
  ON "SupportTicket"("relatedEntityType", "relatedEntityId");

CREATE INDEX IF NOT EXISTS "SupportTicketMessage_ticketId_createdAt_idx"
  ON "SupportTicketMessage"("ticketId", "createdAt");

CREATE INDEX IF NOT EXISTS "SupportTicketMessage_authorId_idx"
  ON "SupportTicketMessage"("authorId");

WITH extracted AS (
  SELECT
    id,
    regexp_match("description", '\\[Context\\]\\s*([A-Z_]+):\\s*([^\\n\\r]+)') AS ctx
  FROM "SupportTicket"
  WHERE
    ("relatedEntityType" IS NULL OR "relatedEntityId" IS NULL)
)
UPDATE "SupportTicket" t
SET
  "relatedEntityType" = COALESCE(t."relatedEntityType", extracted.ctx[1]),
  "relatedEntityId" = COALESCE(t."relatedEntityId", extracted.ctx[2])
FROM extracted
WHERE t.id = extracted.id
  AND extracted.ctx IS NOT NULL;
