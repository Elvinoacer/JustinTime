-- Partner <-> User membership binding for strict partner-scoped redemption authorization

BEGIN;

DO $$
BEGIN
  CREATE TYPE "PartnerUserRole" AS ENUM (
    'OWNER',
    'MANAGER',
    'STAFF'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PartnerUser" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "PartnerUserRole" NOT NULL DEFAULT 'STAFF',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PartnerUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerUser_partnerId_userId_key"
  ON "PartnerUser"("partnerId", "userId");

CREATE INDEX IF NOT EXISTS "PartnerUser_partnerId_idx"
  ON "PartnerUser"("partnerId");

CREATE INDEX IF NOT EXISTS "PartnerUser_userId_idx"
  ON "PartnerUser"("userId");

CREATE INDEX IF NOT EXISTS "PartnerUser_isActive_idx"
  ON "PartnerUser"("isActive");

DO $$
BEGIN
  ALTER TABLE "PartnerUser"
    ADD CONSTRAINT "PartnerUser_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PartnerUser"
    ADD CONSTRAINT "PartnerUser_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
