-- CreateEnum
CREATE TYPE "ChurnInterventionChannel" AS ENUM ('EMAIL', 'PUSH', 'CALL', 'DISCOUNT', 'MANUAL_OUTREACH');

-- CreateEnum
CREATE TYPE "ChurnInterventionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'EXECUTING', 'SENT', 'FAILED', 'RESPONDED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "ChurnInterventionOutcome" AS ENUM ('NO_RESPONSE', 'REOPENED', 'BOOKED', 'RETAINED');

-- DropForeignKey
ALTER TABLE "VerticalProject" DROP CONSTRAINT "VerticalProject_providerId_fkey";

-- DropIndex
DROP INDEX "SolarEstimationConfig_isActive_updatedAt_idx";

-- AlterTable
ALTER TABLE "ChurnIntervention" ADD COLUMN     "channel" "ChurnInterventionChannel",
ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryOk" BOOLEAN,
ADD COLUMN     "outcome" "ChurnInterventionOutcome",
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ChurnInterventionStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "ChurnScore" ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PartnerUser" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ChurnIntervention_userId_status_createdAt_idx" ON "ChurnIntervention"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ChurnIntervention_userId_channel_createdAt_idx" ON "ChurnIntervention"("userId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "ChurnScore_userId_calculatedAt_idx" ON "ChurnScore"("userId", "calculatedAt");

-- CreateIndex
CREATE INDEX "ChurnScore_userId_isCurrent_idx" ON "ChurnScore"("userId", "isCurrent");

-- CreateIndex
CREATE INDEX "WalletTopUp_apiRef_idx" ON "WalletTopUp"("apiRef");

-- AddForeignKey
ALTER TABLE "VerticalProject" ADD CONSTRAINT "VerticalProject_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
