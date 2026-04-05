-- Finalize gamification/loyalty model hardening:
-- 1) Remove legacy UserBadge.progress (live progress is computed)
-- 2) Convert LoyaltyPointTransaction.status from text to enum
-- 3) Convert PartnerReward.status from text to enum

ALTER TABLE "UserBadge"
DROP COLUMN IF EXISTS "progress";

CREATE TYPE "LoyaltyTransactionStatus" AS ENUM (
  'PENDING',
  'POSTED',
  'REVERSED',
  'CANCELLED',
  'EXPIRED',
  'FAILED'
);

ALTER TABLE "LoyaltyPointTransaction"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "LoyaltyTransactionStatus"
  USING (
    CASE
      WHEN "status" IN ('PENDING', 'POSTED', 'REVERSED', 'CANCELLED', 'EXPIRED', 'FAILED')
        THEN "status"::"LoyaltyTransactionStatus"
      ELSE 'POSTED'::"LoyaltyTransactionStatus"
    END
  ),
  ALTER COLUMN "status" SET DEFAULT 'POSTED';

CREATE TYPE "PartnerRewardStatus" AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'PAUSED',
  'ARCHIVED',
  'EXPIRED'
);

ALTER TABLE "PartnerReward"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PartnerRewardStatus"
  USING (
    CASE
      WHEN "status" IN ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED', 'EXPIRED')
        THEN "status"::"PartnerRewardStatus"
      ELSE 'PUBLISHED'::"PartnerRewardStatus"
    END
  ),
  ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
