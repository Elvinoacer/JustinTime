DO $$
BEGIN
  CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "clickedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "actionUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "entityType" TEXT,
  ADD COLUMN IF NOT EXISTS "entityId" TEXT,
  ADD COLUMN IF NOT EXISTS "actorId" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL';

UPDATE "Notification"
SET "readAt" = COALESCE("readAt", "createdAt")
WHERE "isRead" = true
  AND "readAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Notification_userId_deletedAt_createdAt_idx"
  ON "Notification"("userId", "deletedAt", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Notification_userId_deletedAt_isRead_idx"
  ON "Notification"("userId", "deletedAt", "isRead");

CREATE INDEX IF NOT EXISTS "Notification_userId_deletedAt_type_isRead_idx"
  ON "Notification"("userId", "deletedAt", "type", "isRead");

ALTER TABLE "UserToken"
  ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

UPDATE "UserToken"
SET "lastSeenAt" = COALESCE("lastSeenAt", "updatedAt")
WHERE "lastSeenAt" IS NULL;

CREATE INDEX IF NOT EXISTS "UserToken_userId_revokedAt_idx"
  ON "UserToken"("userId", "revokedAt");

ALTER TABLE "User"
  ALTER COLUMN "notificationPreferences"
  SET DEFAULT '{"emailJobAlerts":true,"emailMessages":true,"emailBookings":true,"emailReviews":true,"emailMarketing":false,"pushNotifications":true,"allowMarketing":true,"allowMessages":true,"allowBookingUpdates":true}'::jsonb;

UPDATE "User"
SET "notificationPreferences" =
  COALESCE("notificationPreferences"::jsonb, '{}'::jsonb)
  || jsonb_build_object(
    'allowMarketing', COALESCE("notificationPreferences"::jsonb -> 'allowMarketing', 'true'::jsonb),
    'allowMessages', COALESCE("notificationPreferences"::jsonb -> 'allowMessages', 'true'::jsonb),
    'allowBookingUpdates', COALESCE("notificationPreferences"::jsonb -> 'allowBookingUpdates', 'true'::jsonb)
  );
