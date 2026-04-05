-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WalletGateway" AS ENUM ('INTASEND', 'MANUAL', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WalletTopUpStatus" AS ENUM ('PENDING', 'PROCESSING', 'SETTLED', 'FAILED', 'CANCELLED', 'REVERSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'SETTLED', 'FAILED', 'REVERSED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TransactionDirection" AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WalletTransactionCategory" AS ENUM ('TOPUP', 'BOOKING_PAYMENT', 'REFUND', 'CREDIT_PURCHASE', 'PROMOTION_PAYMENT', 'EARNING', 'ONBOARDING_FEE', 'SUBSCRIPTION', 'ADJUSTMENT', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TransactionActorType" AS ENUM ('SYSTEM', 'USER', 'ADMIN', 'WEBHOOK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
DO $$ BEGIN
  ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Wallet"
  ADD COLUMN IF NOT EXISTS "pendingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KES';

-- CreateTable
CREATE TABLE IF NOT EXISTS "WalletTopUp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "amountExpected" DECIMAL(10,2) NOT NULL,
  "amountReceived" DECIMAL(10,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "status" "WalletTopUpStatus" NOT NULL DEFAULT 'PENDING',
  "gateway" "WalletGateway" NOT NULL DEFAULT 'INTASEND',
  "apiRef" TEXT NOT NULL,
  "gatewaySessionId" TEXT,
  "gatewayInvoiceId" TEXT,
  "checkoutUrl" TEXT,
  "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "rawInitiationPayload" JSONB,
  "rawWebhookPayload" JSONB,
  "resolvedByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WalletTopUp_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "topUpId" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "TransactionStatus" NOT NULL DEFAULT 'SETTLED',
  ADD COLUMN IF NOT EXISTS "direction" "TransactionDirection",
  ADD COLUMN IF NOT EXISTS "category" "WalletTransactionCategory" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS "gateway" "WalletGateway",
  ADD COLUMN IF NOT EXISTS "gatewayReference" TEXT,
  ADD COLUMN IF NOT EXISTS "gatewaySessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reversedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByType" "TransactionActorType" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Data backfill for direction and category
UPDATE "Transaction"
SET
  "direction" = CASE
    WHEN "type" IN ('WITHDRAWAL', 'PAYMENT', 'CREDIT_PURCHASE', 'PROMOTION_PAYMENT', 'ONBOARDING_FEE') THEN 'DEBIT'::"TransactionDirection"
    ELSE 'CREDIT'::"TransactionDirection"
  END,
  "category" = CASE
    WHEN "type" = 'DEPOSIT' THEN 'TOPUP'::"WalletTransactionCategory"
    WHEN "type" = 'PAYMENT' THEN 'BOOKING_PAYMENT'::"WalletTransactionCategory"
    WHEN "type" = 'REFUND' THEN 'REFUND'::"WalletTransactionCategory"
    WHEN "type" = 'CREDIT_PURCHASE' THEN 'CREDIT_PURCHASE'::"WalletTransactionCategory"
    WHEN "type" = 'PROMOTION_PAYMENT' THEN 'PROMOTION_PAYMENT'::"WalletTransactionCategory"
    WHEN "type" = 'EARNING' THEN 'EARNING'::"WalletTransactionCategory"
    WHEN "type" = 'ONBOARDING_FEE' THEN 'ONBOARDING_FEE'::"WalletTransactionCategory"
    WHEN "type"::text = 'ADJUSTMENT' THEN 'ADJUSTMENT'::"WalletTransactionCategory"
    ELSE 'OTHER'::"WalletTransactionCategory"
  END
WHERE "direction" IS NULL;

-- Data backfill for legacy pending provider refs
UPDATE "Transaction"
SET "status" = 'PENDING'::"TransactionStatus"
WHERE "providerRef" IS NOT NULL
  AND (
    "providerRef" LIKE 'INTASEND:WALLET:PENDING:%'
    OR "providerRef" LIKE 'INTASEND:ONBOARDING:PENDING:%'
    OR "providerRef" LIKE 'INTASEND:SUBSCRIPTION:PENDING:%'
  );

UPDATE "Transaction"
SET
  "status" = 'SETTLED'::"TransactionStatus",
  "settledAt" = COALESCE("settledAt", "createdAt")
WHERE "providerRef" IS NOT NULL
  AND (
    "providerRef" LIKE 'INTASEND:WALLET:SETTLED:%'
    OR "providerRef" LIKE 'INTASEND:ONBOARDING:PAID:%'
    OR "providerRef" LIKE 'INTASEND:SUBSCRIPTION:PAID:%'
  );

-- Backfill wallet pending balances from pending credit transactions
WITH pending_totals AS (
  SELECT "walletId", COALESCE(SUM("amount"), 0) AS pending_total
  FROM "Transaction"
  WHERE "status" IN ('PENDING', 'PROCESSING')
    AND COALESCE("direction", 'CREDIT'::"TransactionDirection") = 'CREDIT'::"TransactionDirection"
  GROUP BY "walletId"
)
UPDATE "Wallet" w
SET "pendingBalance" = p.pending_total
FROM pending_totals p
WHERE w."id" = p."walletId";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTopUp_apiRef_key" ON "WalletTopUp"("apiRef");
CREATE INDEX IF NOT EXISTS "WalletTopUp_walletId_status_createdAt_idx" ON "WalletTopUp"("walletId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletTopUp_userId_createdAt_idx" ON "WalletTopUp"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletTopUp_status_createdAt_idx" ON "WalletTopUp"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_providerRef_idx" ON "Transaction"("providerRef");
CREATE INDEX IF NOT EXISTS "Transaction_gatewayReference_idx" ON "Transaction"("gatewayReference");
CREATE INDEX IF NOT EXISTS "Transaction_topUpId_idx" ON "Transaction"("topUpId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_topUpId_fkey"
    FOREIGN KEY ("topUpId") REFERENCES "WalletTopUp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
