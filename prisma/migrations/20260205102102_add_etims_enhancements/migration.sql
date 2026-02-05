/*
  Warnings:

  - You are about to drop the column `amount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `taxAmount` on the `Invoice` table. All the data in the column will be lost.
  - Added the required column `subtotal` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('GENERATED', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('MILESTONE', 'PERFORMANCE', 'ENGAGEMENT', 'SPECIAL');

-- CreateEnum
CREATE TYPE "ChurnRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "PartnerCategory" AS ENUM ('HARDWARE_TOOLS', 'AUTOMOTIVE', 'INSURANCE', 'EQUIPMENT_RENTAL', 'SUPPLIES', 'SOFTWARE', 'TRAINING', 'OTHER');

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "amount",
DROP COLUMN "taxAmount",
ADD COLUMN     "buyerName" TEXT,
ADD COLUMN     "buyerPin" TEXT,
ADD COLUMN     "exciseDuty" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "sellerPin" TEXT,
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'GENERATED',
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "totalAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "vatAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "withholdingTax" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ETIMSSubmission" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ETIMSSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "requirement" JSONB NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurnScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riskLevel" "ChurnRiskLevel" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "factors" JSONB NOT NULL,
    "lastActivityDays" INTEGER NOT NULL,
    "bookingDecline" DOUBLE PRECISION,
    "engagementScore" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurnScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurnIntervention" (
    "id" TEXT NOT NULL,
    "churnScoreId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "executedAt" TIMESTAMP(3),
    "successful" BOOLEAN,
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurnIntervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLoyalty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentTier" "LoyaltyTier" NOT NULL DEFAULT 'BRONZE',
    "points" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "tierProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastTierUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLoyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyPointTransaction" (
    "id" TEXT NOT NULL,
    "loyaltyId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyPointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PartnerCategory" NOT NULL,
    "logo" TEXT,
    "description" TEXT NOT NULL,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerReward" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minTierRequired" "LoyaltyTier" NOT NULL,
    "maxRedemptions" INTEGER,
    "expiryDate" TIMESTAMP(3),
    "termsConditions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL,
    "loyaltyId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kraPin" TEXT,
    "kraPinVerified" BOOLEAN NOT NULL DEFAULT false,
    "tccNumber" TEXT,
    "tccExpiry" TIMESTAMP(3),
    "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "preferredMethod" TEXT NOT NULL DEFAULT 'STANDARD',
    "businessName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ETIMSSubmission_invoiceId_idx" ON "ETIMSSubmission"("invoiceId");

-- CreateIndex
CREATE INDEX "ETIMSSubmission_submittedAt_idx" ON "ETIMSSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "ETIMSSubmission_success_idx" ON "ETIMSSubmission"("success");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE INDEX "Badge_slug_idx" ON "Badge"("slug");

-- CreateIndex
CREATE INDEX "Badge_category_idx" ON "Badge"("category");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "ChurnScore_userId_idx" ON "ChurnScore"("userId");

-- CreateIndex
CREATE INDEX "ChurnScore_riskLevel_idx" ON "ChurnScore"("riskLevel");

-- CreateIndex
CREATE INDEX "ChurnScore_calculatedAt_idx" ON "ChurnScore"("calculatedAt");

-- CreateIndex
CREATE INDEX "ChurnIntervention_userId_idx" ON "ChurnIntervention"("userId");

-- CreateIndex
CREATE INDEX "ChurnIntervention_executed_idx" ON "ChurnIntervention"("executed");

-- CreateIndex
CREATE INDEX "ChurnIntervention_createdAt_idx" ON "ChurnIntervention"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserLoyalty_userId_key" ON "UserLoyalty"("userId");

-- CreateIndex
CREATE INDEX "UserLoyalty_userId_idx" ON "UserLoyalty"("userId");

-- CreateIndex
CREATE INDEX "UserLoyalty_currentTier_idx" ON "UserLoyalty"("currentTier");

-- CreateIndex
CREATE INDEX "LoyaltyPointTransaction_loyaltyId_idx" ON "LoyaltyPointTransaction"("loyaltyId");

-- CreateIndex
CREATE INDEX "LoyaltyPointTransaction_createdAt_idx" ON "LoyaltyPointTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Partner_category_idx" ON "Partner"("category");

-- CreateIndex
CREATE INDEX "PartnerReward_partnerId_idx" ON "PartnerReward"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerReward_minTierRequired_idx" ON "PartnerReward"("minTierRequired");

-- CreateIndex
CREATE INDEX "PartnerReward_isActive_idx" ON "PartnerReward"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRedemption_code_key" ON "RewardRedemption"("code");

-- CreateIndex
CREATE INDEX "RewardRedemption_loyaltyId_idx" ON "RewardRedemption"("loyaltyId");

-- CreateIndex
CREATE INDEX "RewardRedemption_rewardId_idx" ON "RewardRedemption"("rewardId");

-- CreateIndex
CREATE INDEX "RewardRedemption_status_idx" ON "RewardRedemption"("status");

-- CreateIndex
CREATE INDEX "RewardRedemption_code_idx" ON "RewardRedemption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TaxSettings_userId_key" ON "TaxSettings"("userId");

-- CreateIndex
CREATE INDEX "TaxSettings_userId_idx" ON "TaxSettings"("userId");

-- CreateIndex
CREATE INDEX "TaxSettings_kraPinVerified_idx" ON "TaxSettings"("kraPinVerified");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- AddForeignKey
ALTER TABLE "ETIMSSubmission" ADD CONSTRAINT "ETIMSSubmission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurnScore" ADD CONSTRAINT "ChurnScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurnIntervention" ADD CONSTRAINT "ChurnIntervention_churnScoreId_fkey" FOREIGN KEY ("churnScoreId") REFERENCES "ChurnScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurnIntervention" ADD CONSTRAINT "ChurnIntervention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLoyalty" ADD CONSTRAINT "UserLoyalty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyPointTransaction" ADD CONSTRAINT "LoyaltyPointTransaction_loyaltyId_fkey" FOREIGN KEY ("loyaltyId") REFERENCES "UserLoyalty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReward" ADD CONSTRAINT "PartnerReward_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_loyaltyId_fkey" FOREIGN KEY ("loyaltyId") REFERENCES "UserLoyalty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "PartnerReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxSettings" ADD CONSTRAINT "TaxSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
