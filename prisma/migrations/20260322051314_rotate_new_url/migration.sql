-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "onboardingFeeWaived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingFeeWaivedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingFeeWaivedBy" TEXT;
