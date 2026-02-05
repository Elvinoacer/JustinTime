-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ONLINE', 'BUSY', 'OFFLINE', 'ON_JOB');

-- CreateEnum
CREATE TYPE "TeamJobStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "defaultSplit" DOUBLE PRECISION NOT NULL DEFAULT 70,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "payrollCycle" TEXT NOT NULL DEFAULT 'WEEKLY';

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "lastLocation" JSONB,
ADD COLUMN     "lastLocationAt" TIMESTAMP(3),
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "status" "MemberStatus" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "totalEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalJobsCompleted" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TeamJob" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "bookingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" JSONB,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "estimatedDuration" INTEGER,
    "status" "TeamJobStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "collected" BOOLEAN NOT NULL DEFAULT false,
    "collectedAt" TIMESTAMP(3),
    "collectedBy" TEXT,
    "paymentMethod" TEXT,
    "clientName" TEXT,
    "clientPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TeamJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamJobAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'WORKER',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamJobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamEarning" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "jobId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "splitPercent" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "payrollId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamPayroll" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamPayroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAnnouncement" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamJob_teamId_idx" ON "TeamJob"("teamId");

-- CreateIndex
CREATE INDEX "TeamJob_status_idx" ON "TeamJob"("status");

-- CreateIndex
CREATE INDEX "TeamJob_scheduledAt_idx" ON "TeamJob"("scheduledAt");

-- CreateIndex
CREATE INDEX "TeamJob_bookingId_idx" ON "TeamJob"("bookingId");

-- CreateIndex
CREATE INDEX "TeamJobAssignment_jobId_idx" ON "TeamJobAssignment"("jobId");

-- CreateIndex
CREATE INDEX "TeamJobAssignment_memberId_idx" ON "TeamJobAssignment"("memberId");

-- CreateIndex
CREATE INDEX "TeamJobAssignment_status_idx" ON "TeamJobAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamJobAssignment_jobId_memberId_key" ON "TeamJobAssignment"("jobId", "memberId");

-- CreateIndex
CREATE INDEX "TeamEarning_teamId_idx" ON "TeamEarning"("teamId");

-- CreateIndex
CREATE INDEX "TeamEarning_memberId_idx" ON "TeamEarning"("memberId");

-- CreateIndex
CREATE INDEX "TeamEarning_isPaid_idx" ON "TeamEarning"("isPaid");

-- CreateIndex
CREATE INDEX "TeamEarning_payrollId_idx" ON "TeamEarning"("payrollId");

-- CreateIndex
CREATE INDEX "TeamPayroll_teamId_idx" ON "TeamPayroll"("teamId");

-- CreateIndex
CREATE INDEX "TeamPayroll_status_idx" ON "TeamPayroll"("status");

-- CreateIndex
CREATE INDEX "TeamPayroll_periodStart_idx" ON "TeamPayroll"("periodStart");

-- CreateIndex
CREATE INDEX "TeamAnnouncement_teamId_idx" ON "TeamAnnouncement"("teamId");

-- CreateIndex
CREATE INDEX "TeamAnnouncement_createdAt_idx" ON "TeamAnnouncement"("createdAt");

-- CreateIndex
CREATE INDEX "Team_ownerId_idx" ON "Team"("ownerId");

-- CreateIndex
CREATE INDEX "Team_isActive_idx" ON "Team"("isActive");

-- CreateIndex
CREATE INDEX "TeamMember_status_idx" ON "TeamMember"("status");

-- AddForeignKey
ALTER TABLE "TeamJob" ADD CONSTRAINT "TeamJob_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamJob" ADD CONSTRAINT "TeamJob_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamJobAssignment" ADD CONSTRAINT "TeamJobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TeamJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamJobAssignment" ADD CONSTRAINT "TeamJobAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEarning" ADD CONSTRAINT "TeamEarning_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEarning" ADD CONSTRAINT "TeamEarning_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "TeamPayroll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPayroll" ADD CONSTRAINT "TeamPayroll_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAnnouncement" ADD CONSTRAINT "TeamAnnouncement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
