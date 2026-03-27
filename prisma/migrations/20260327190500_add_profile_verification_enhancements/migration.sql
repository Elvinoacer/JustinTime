-- Add missing Profile verification enhancement columns expected by schema.prisma.
-- IF NOT EXISTS keeps this safe across partially migrated environments.
ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "faceMatchScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "idDocumentType" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastVerificationAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "locationSource" TEXT DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "locationAccuracy" DOUBLE PRECISION;
