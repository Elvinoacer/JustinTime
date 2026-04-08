-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PaymentIntentKind" AS ENUM (
    'WALLET_TOPUP',
    'ONBOARDING_FEE',
    'SUBSCRIPTION',
    'SEAT_RESERVATION',
    'BOOKING_ESCROW',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PaymentIntentStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'VERIFIED_COMPLETE',
    'VERIFIED_FAILED',
    'VERIFIED_CANCELLED',
    'VERIFIED_REVERSED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentIntent" (
  "id" TEXT NOT NULL,
  "kind" "PaymentIntentKind" NOT NULL,
  "status" "PaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
  "gateway" "WalletGateway" NOT NULL DEFAULT 'INTASEND',
  "userId" TEXT NOT NULL,
  "walletId" TEXT,
  "apiRef" TEXT NOT NULL,
  "invoiceId" TEXT,
  "gatewaySessionId" TEXT,
  "providerRef" TEXT,
  "amountExpected" DECIMAL(10,2) NOT NULL,
  "amountReceived" DECIMAL(10,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "sourceType" TEXT,
  "sourceId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "rawInitiationPayload" JSONB,
  "rawLastWebhookPayload" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentWebhookReceipt" (
  "id" TEXT NOT NULL,
  "gateway" "WalletGateway" NOT NULL DEFAULT 'INTASEND',
  "kind" "PaymentIntentKind",
  "intentId" TEXT,
  "apiRef" TEXT,
  "invoiceId" TEXT,
  "rawState" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "payloadHash" TEXT,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentWebhookReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_gateway_apiRef_key"
ON "PaymentIntent"("gateway", "apiRef");

CREATE INDEX IF NOT EXISTS "PaymentIntent_userId_kind_status_createdAt_idx"
ON "PaymentIntent"("userId", "kind", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "PaymentIntent_walletId_kind_createdAt_idx"
ON "PaymentIntent"("walletId", "kind", "createdAt");

CREATE INDEX IF NOT EXISTS "PaymentIntent_invoiceId_idx"
ON "PaymentIntent"("invoiceId");

CREATE INDEX IF NOT EXISTS "PaymentIntent_sourceType_sourceId_idx"
ON "PaymentIntent"("sourceType", "sourceId");

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookReceipt_dedupeKey_key"
ON "PaymentWebhookReceipt"("dedupeKey");

CREATE INDEX IF NOT EXISTS "PaymentWebhookReceipt_gateway_apiRef_processedAt_idx"
ON "PaymentWebhookReceipt"("gateway", "apiRef", "processedAt");

CREATE INDEX IF NOT EXISTS "PaymentWebhookReceipt_gateway_invoiceId_processedAt_idx"
ON "PaymentWebhookReceipt"("gateway", "invoiceId", "processedAt");

CREATE INDEX IF NOT EXISTS "PaymentWebhookReceipt_intentId_idx"
ON "PaymentWebhookReceipt"("intentId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentWebhookReceipt" ADD CONSTRAINT "PaymentWebhookReceipt_intentId_fkey"
    FOREIGN KEY ("intentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: wallet top-up intents from WalletTopUp + latest matching transaction.
INSERT INTO "PaymentIntent" (
  "id",
  "kind",
  "status",
  "gateway",
  "userId",
  "walletId",
  "apiRef",
  "invoiceId",
  "gatewaySessionId",
  "providerRef",
  "amountExpected",
  "amountReceived",
  "currency",
  "sourceType",
  "sourceId",
  "verifiedAt",
  "failedAt",
  "cancelledAt",
  "reversedAt",
  "failureReason",
  "rawInitiationPayload",
  "rawLastWebhookPayload",
  "metadata",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('pi_', md5(wt."id" || ':' || wt."apiRef" || ':' || random()::text)),
  'WALLET_TOPUP'::"PaymentIntentKind",
  CASE wt."status"
    WHEN 'SETTLED'::"WalletTopUpStatus" THEN 'VERIFIED_COMPLETE'::"PaymentIntentStatus"
    WHEN 'FAILED'::"WalletTopUpStatus" THEN 'VERIFIED_FAILED'::"PaymentIntentStatus"
    WHEN 'CANCELLED'::"WalletTopUpStatus" THEN 'VERIFIED_CANCELLED'::"PaymentIntentStatus"
    WHEN 'REVERSED'::"WalletTopUpStatus" THEN 'VERIFIED_REVERSED'::"PaymentIntentStatus"
    WHEN 'PROCESSING'::"WalletTopUpStatus" THEN 'PROCESSING'::"PaymentIntentStatus"
    ELSE 'PENDING'::"PaymentIntentStatus"
  END,
  wt."gateway",
  wt."userId",
  wt."walletId",
  wt."apiRef",
  COALESCE(wt."gatewayInvoiceId", tx."gatewayReference"),
  COALESCE(wt."gatewaySessionId", tx."gatewaySessionId"),
  COALESCE(tx."providerRef", CONCAT('INTASEND:WALLET:TOPUP:', wt."apiRef")),
  wt."amountExpected",
  wt."amountReceived",
  wt."currency",
  'WALLET_TOPUP',
  wt."id",
  wt."confirmedAt",
  wt."failedAt",
  wt."cancelledAt",
  wt."reversedAt",
  wt."failureReason",
  wt."rawInitiationPayload",
  wt."rawWebhookPayload",
  jsonb_build_object(
    'backfilledFrom', 'WalletTopUp',
    'legacyTransactionProviderRef', tx."providerRef",
    'legacyGatewayReference', tx."gatewayReference"
  ),
  wt."createdAt",
  COALESCE(wt."updatedAt", CURRENT_TIMESTAMP)
FROM "WalletTopUp" wt
LEFT JOIN LATERAL (
  SELECT
    t."providerRef",
    t."gatewayReference",
    t."gatewaySessionId"
  FROM "Transaction" t
  WHERE t."topUpId" = wt."id"
  ORDER BY t."createdAt" DESC
  LIMIT 1
) tx ON true
ON CONFLICT ("gateway", "apiRef") DO NOTHING;

-- Backfill fallback: wallet intents from legacy transaction provider refs when WalletTopUp row is missing.
INSERT INTO "PaymentIntent" (
  "id",
  "kind",
  "status",
  "gateway",
  "userId",
  "walletId",
  "apiRef",
  "invoiceId",
  "gatewaySessionId",
  "providerRef",
  "amountExpected",
  "amountReceived",
  "currency",
  "sourceType",
  "sourceId",
  "verifiedAt",
  "failedAt",
  "cancelledAt",
  "reversedAt",
  "failureReason",
  "metadata",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('pi_', md5(t."id" || ':' || COALESCE(t."providerRef", '') || ':' || random()::text)),
  'WALLET_TOPUP'::"PaymentIntentKind",
  CASE t."status"
    WHEN 'SETTLED'::"TransactionStatus" THEN 'VERIFIED_COMPLETE'::"PaymentIntentStatus"
    WHEN 'FAILED'::"TransactionStatus" THEN 'VERIFIED_FAILED'::"PaymentIntentStatus"
    WHEN 'CANCELLED'::"TransactionStatus" THEN 'VERIFIED_CANCELLED'::"PaymentIntentStatus"
    WHEN 'REVERSED'::"TransactionStatus" THEN 'VERIFIED_REVERSED'::"PaymentIntentStatus"
    WHEN 'PROCESSING'::"TransactionStatus" THEN 'PROCESSING'::"PaymentIntentStatus"
    ELSE 'PENDING'::"PaymentIntentStatus"
  END,
  COALESCE(t."gateway", 'INTASEND'::"WalletGateway"),
  w."userId",
  t."walletId",
  regexp_replace(
    t."providerRef",
    '^INTASEND:WALLET:(TOPUP|PENDING|SETTLED):',
    ''
  ),
  t."gatewayReference",
  t."gatewaySessionId",
  t."providerRef",
  t."amount",
  CASE
    WHEN t."status" = 'SETTLED'::"TransactionStatus" THEN t."amount"
    ELSE NULL
  END,
  t."currency",
  COALESCE(t."sourceType", 'TRANSACTION_BACKFILL'),
  COALESCE(t."sourceId", t."id"),
  t."settledAt",
  t."failedAt",
  t."cancelledAt",
  t."reversedAt",
  t."failureReason",
  jsonb_build_object(
    'backfilledFrom', 'TransactionProviderRef',
    'transactionId', t."id"
  ),
  t."createdAt",
  CURRENT_TIMESTAMP
FROM "Transaction" t
JOIN "Wallet" w ON w."id" = t."walletId"
LEFT JOIN "WalletTopUp" wt ON wt."id" = t."topUpId"
WHERE wt."id" IS NULL
  AND t."providerRef" IS NOT NULL
  AND (
    t."providerRef" LIKE 'INTASEND:WALLET:TOPUP:%'
    OR t."providerRef" LIKE 'INTASEND:WALLET:PENDING:%'
    OR t."providerRef" LIKE 'INTASEND:WALLET:SETTLED:%'
  )
ON CONFLICT ("gateway", "apiRef") DO NOTHING;

-- Link payment intents to the latest matching transaction metadata where possible.
UPDATE "PaymentIntent" pi
SET
  "providerRef" = COALESCE(
    pi."providerRef",
    (
      SELECT t."providerRef"
      FROM "Transaction" t
      WHERE t."providerRef" IS NOT NULL
        AND (
          t."providerRef" = CONCAT('INTASEND:WALLET:TOPUP:', pi."apiRef")
          OR t."providerRef" = CONCAT('INTASEND:WALLET:PENDING:', pi."apiRef")
          OR t."providerRef" = CONCAT('INTASEND:WALLET:SETTLED:', pi."apiRef")
        )
      ORDER BY t."createdAt" DESC
      LIMIT 1
    )
  ),
  "invoiceId" = COALESCE(
    pi."invoiceId",
    (
      SELECT t."gatewayReference"
      FROM "Transaction" t
      WHERE t."providerRef" IS NOT NULL
        AND (
          t."providerRef" = CONCAT('INTASEND:WALLET:TOPUP:', pi."apiRef")
          OR t."providerRef" = CONCAT('INTASEND:WALLET:PENDING:', pi."apiRef")
          OR t."providerRef" = CONCAT('INTASEND:WALLET:SETTLED:', pi."apiRef")
        )
      ORDER BY t."createdAt" DESC
      LIMIT 1
    )
  ),
  "gatewaySessionId" = COALESCE(
    pi."gatewaySessionId",
    (
      SELECT t."gatewaySessionId"
      FROM "Transaction" t
      WHERE t."providerRef" IS NOT NULL
        AND (
          t."providerRef" = CONCAT('INTASEND:WALLET:TOPUP:', pi."apiRef")
          OR t."providerRef" = CONCAT('INTASEND:WALLET:PENDING:', pi."apiRef")
          OR t."providerRef" = CONCAT('INTASEND:WALLET:SETTLED:', pi."apiRef")
        )
      ORDER BY t."createdAt" DESC
      LIMIT 1
    )
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE pi."kind" = 'WALLET_TOPUP'::"PaymentIntentKind";
