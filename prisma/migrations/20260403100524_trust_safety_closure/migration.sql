-- CreateEnum
CREATE TYPE "DisputeResolutionType" AS ENUM ('REFUND_CLIENT', 'RELEASE_PROVIDER', 'SPLIT_ESCROW', 'PARTIAL_REFUND', 'OTHER');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('HARASSMENT', 'SCAM', 'INAPPROPRIATE_CONTENT', 'SAFETY_CONCERN', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "CallStatus" ADD VALUE 'ONGOING';

-- DropIndex
DROP INDEX IF EXISTS "Notification_userId_deletedAt_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Notification_userId_deliveryStatus_createdAt_idx";

-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "type" "CallType" NOT NULL DEFAULT 'AUDIO';

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "assignedAdminId" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "refundPreview" JSONB,
ADD COLUMN     "requestedResolution" TEXT,
ADD COLUMN     "resolutionType" "DisputeResolutionType",
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MessageConversationState" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ProposalTemplate" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "estimatedDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityVerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "status" "IdentityVerificationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "idDocumentUrl" TEXT NOT NULL,
    "selfieUrl" TEXT,
    "faceMatchScore" DOUBLE PRECISION,
    "idDocumentType" TEXT,
    "extractedMetadata" JSONB,
    "submissionNotes" TEXT,
    "reviewNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProxySession" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "virtualNumber" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "activeUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProxySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "messageId" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProposalTemplate_providerId_createdAt_idx" ON "ProposalTemplate"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "IdentityVerificationRequest_userId_idx" ON "IdentityVerificationRequest"("userId");

-- CreateIndex
CREATE INDEX "IdentityVerificationRequest_status_idx" ON "IdentityVerificationRequest"("status");

-- CreateIndex
CREATE INDEX "IdentityVerificationRequest_submittedAt_idx" ON "IdentityVerificationRequest"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProxySession_bookingId_key" ON "ProxySession"("bookingId");

-- CreateIndex
CREATE INDEX "ProxySession_bookingId_idx" ON "ProxySession"("bookingId");

-- CreateIndex
CREATE INDEX "MessageReport_reporterId_idx" ON "MessageReport"("reporterId");

-- CreateIndex
CREATE INDEX "MessageReport_reportedId_idx" ON "MessageReport"("reportedId");

-- CreateIndex
CREATE INDEX "MessageReport_status_idx" ON "MessageReport"("status");

-- CreateIndex
CREATE INDEX "BlockedUser_userId_idx" ON "BlockedUser"("userId");

-- CreateIndex
CREATE INDEX "BlockedUser_blockedId_idx" ON "BlockedUser"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedUser_userId_blockedId_key" ON "BlockedUser"("userId", "blockedId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_assignedAdminId_idx" ON "Dispute"("assignedAdminId");

-- CreateIndex
CREATE INDEX "Dispute_createdAt_idx" ON "Dispute"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_deletedAt_createdAt_idx" ON "Notification"("userId", "deletedAt", "createdAt");

-- CreateIndex
-- (removed Notification_userId_deliveryStatus_createdAt_idx as column is added in later migration)

-- AddForeignKey
ALTER TABLE "ProposalTemplate" ADD CONSTRAINT "ProposalTemplate_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAudit" ADD CONSTRAINT "VerificationAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerificationRequest" ADD CONSTRAINT "IdentityVerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerificationRequest" ADD CONSTRAINT "IdentityVerificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxySession" ADD CONSTRAINT "ProxySession_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
