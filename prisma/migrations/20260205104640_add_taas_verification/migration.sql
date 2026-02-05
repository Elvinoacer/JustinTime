-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('KRA_VERIFIED', 'GOOD_CONDUCT', 'SOS_ENABLED', 'IDENTITY_VERIFIED', 'SKILLS_CERTIFIED', 'INSURANCE_ACTIVE', 'TOP_RATED', 'PREMIUM_MEMBER');

-- CreateEnum
CREATE TYPE "BadgeStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "premiumMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "premiumPricingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VerificationBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BadgeType" NOT NULL,
    "status" "BadgeStatus" NOT NULL DEFAULT 'PENDING',
    "documentUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "identityScore" INTEGER NOT NULL DEFAULT 0,
    "conductScore" INTEGER NOT NULL DEFAULT 0,
    "performanceScore" INTEGER NOT NULL DEFAULT 0,
    "reliabilityScore" INTEGER NOT NULL DEFAULT 0,
    "complianceScore" INTEGER NOT NULL DEFAULT 0,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "premiumEligible" BOOLEAN NOT NULL DEFAULT false,
    "premiumMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "badgeType" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "performedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationBadge_userId_idx" ON "VerificationBadge"("userId");

-- CreateIndex
CREATE INDEX "VerificationBadge_type_idx" ON "VerificationBadge"("type");

-- CreateIndex
CREATE INDEX "VerificationBadge_status_idx" ON "VerificationBadge"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationBadge_userId_type_key" ON "VerificationBadge"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TrustScore_userId_key" ON "TrustScore"("userId");

-- CreateIndex
CREATE INDEX "TrustScore_overallScore_idx" ON "TrustScore"("overallScore");

-- CreateIndex
CREATE INDEX "TrustScore_tier_idx" ON "TrustScore"("tier");

-- CreateIndex
CREATE INDEX "VerificationAudit_userId_idx" ON "VerificationAudit"("userId");

-- CreateIndex
CREATE INDEX "VerificationAudit_action_idx" ON "VerificationAudit"("action");

-- CreateIndex
CREATE INDEX "VerificationAudit_createdAt_idx" ON "VerificationAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "VerificationBadge" ADD CONSTRAINT "VerificationBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustScore" ADD CONSTRAINT "TrustScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
