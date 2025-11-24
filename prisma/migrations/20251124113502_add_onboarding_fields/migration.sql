-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clientInterests" TEXT[],
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
