-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletionReason" TEXT,
ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3);
