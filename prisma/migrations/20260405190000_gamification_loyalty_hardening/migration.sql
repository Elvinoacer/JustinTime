-- Gamification + Loyalty hardening migration
-- Focused migration script generated manually because the repository currently has
-- unrelated historical migration-chain issues in shadow DB validation.

BEGIN;

DO $$
BEGIN
  CREATE TYPE "RewardRedemptionStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'USED',
    'EXPIRED',
    'CANCELLED',
    'REVOKED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Badge"
  ADD COLUMN IF NOT EXISTS "requirementType" TEXT DEFAULT 'GENERIC',
  ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isManualOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isRevocable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "UserBadge"
  ADD COLUMN IF NOT EXISTS "awardedByEventType" TEXT,
  ADD COLUMN IF NOT EXISTS "awardedByEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "awardedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedReason" TEXT;

ALTER TABLE "UserLoyalty"
  ADD COLUMN IF NOT EXISTS "availablePoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lifetimeEarnedPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lifetimeSpentPoints" INTEGER NOT NULL DEFAULT 0;

-- Backfill loyalty aggregates from existing values.
UPDATE "UserLoyalty"
SET "availablePoints" = "points"
WHERE "availablePoints" = 0
  AND "points" <> 0;

UPDATE "UserLoyalty"
SET "lifetimeEarnedPoints" = GREATEST("lifetimePoints", "points")
WHERE "lifetimeEarnedPoints" = 0;

UPDATE "UserLoyalty"
SET "lifetimeSpentPoints" = GREATEST("lifetimeEarnedPoints" - "availablePoints", 0)
WHERE "lifetimeSpentPoints" = 0;

ALTER TABLE "LoyaltyPointTransaction"
  ADD COLUMN IF NOT EXISTS "reasonCode" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'POSTED',
  ADD COLUMN IF NOT EXISTS "reversedTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByType" TEXT,
  ADD COLUMN IF NOT EXISTS "adjustmentReason" TEXT;

ALTER TABLE "PartnerReward"
  ADD COLUMN IF NOT EXISTS "pointsCost" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxPerUser" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxActivePerUser" INTEGER,
  ADD COLUMN IF NOT EXISTS "inventoryCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "redemptionWindowDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "requiresManualApproval" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "partnerValidationMode" TEXT DEFAULT 'PARTNER_ONLY',
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

ALTER TABLE "RewardRedemption"
  ADD COLUMN IF NOT EXISTS "validatedByPartnerId" TEXT,
  ADD COLUMN IF NOT EXISTS "usedByActorId" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

ALTER TABLE "RewardRedemption"
  ADD COLUMN IF NOT EXISTS "status_new" "RewardRedemptionStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "RewardRedemption"
SET "status_new" = CASE UPPER(COALESCE("status"::TEXT, 'ACTIVE'))
  WHEN 'PENDING' THEN 'PENDING'::"RewardRedemptionStatus"
  WHEN 'ACTIVE' THEN 'ACTIVE'::"RewardRedemptionStatus"
  WHEN 'USED' THEN 'USED'::"RewardRedemptionStatus"
  WHEN 'EXPIRED' THEN 'EXPIRED'::"RewardRedemptionStatus"
  WHEN 'CANCELLED' THEN 'CANCELLED'::"RewardRedemptionStatus"
  WHEN 'REVOKED' THEN 'REVOKED'::"RewardRedemptionStatus"
  ELSE 'ACTIVE'::"RewardRedemptionStatus"
END;

ALTER TABLE "RewardRedemption"
  DROP COLUMN IF EXISTS "status";

ALTER TABLE "RewardRedemption"
  RENAME COLUMN "status_new" TO "status";

CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyPointTransaction_idempotencyKey_key"
  ON "LoyaltyPointTransaction"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "LoyaltyPointTransaction_sourceType_sourceId_idx"
  ON "LoyaltyPointTransaction"("sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "LoyaltyPointTransaction_reasonCode_idx"
  ON "LoyaltyPointTransaction"("reasonCode");

CREATE INDEX IF NOT EXISTS "LoyaltyPointTransaction_status_idx"
  ON "LoyaltyPointTransaction"("status");

CREATE INDEX IF NOT EXISTS "PartnerReward_status_idx"
  ON "PartnerReward"("status");

CREATE INDEX IF NOT EXISTS "RewardRedemption_status_idx"
  ON "RewardRedemption"("status");

COMMIT;
