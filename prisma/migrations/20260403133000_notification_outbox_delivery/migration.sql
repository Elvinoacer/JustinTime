DO $$
BEGIN
  CREATE TYPE "NotificationOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'DELIVERED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationDeliveryChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('ATTEMPTED', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "deliveryStatus" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastDeliveryAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "NotificationOutbox" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAttemptAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "lastError" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationOutbox_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotificationOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationOutbox_notificationId_key"
  ON "NotificationOutbox"("notificationId");

CREATE INDEX IF NOT EXISTS "NotificationOutbox_status_nextAttemptAt_idx"
  ON "NotificationOutbox"("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "NotificationOutbox_userId_status_idx"
  ON "NotificationOutbox"("userId", "status");

CREATE INDEX IF NOT EXISTS "NotificationOutbox_lockedAt_idx"
  ON "NotificationOutbox"("lockedAt");

CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "channel" "NotificationDeliveryChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "providerMetadata" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "NotificationDelivery_notificationId_channel_attempt_idx"
  ON "NotificationDelivery"("notificationId", "channel", "attempt");

CREATE INDEX IF NOT EXISTS "NotificationDelivery_channel_status_attemptedAt_idx"
  ON "NotificationDelivery"("channel", "status", "attemptedAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_deliveryStatus_createdAt_idx"
  ON "Notification"("userId", "deliveryStatus", "createdAt" DESC);

UPDATE "Notification"
SET
  "deliveryStatus" = 'DELIVERED',
  "deliveredAt" = COALESCE("deliveredAt", "createdAt")
WHERE "deliveryStatus" = 'PENDING';
