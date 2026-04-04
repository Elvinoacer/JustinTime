-- DropIndex
DROP INDEX "Notification_userId_deliveryStatus_createdAt_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authInvalidatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Notification_userId_deliveryStatus_createdAt_idx" ON "Notification"("userId", "deliveryStatus", "createdAt");

-- RenameIndex
ALTER INDEX "service_interaction_dedup_service_type_idx" RENAME TO "service_interaction_dedup_serviceId_interactionType_idx";
