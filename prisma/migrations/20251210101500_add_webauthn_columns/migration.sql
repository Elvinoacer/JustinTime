-- Add WebAuthn columns required by the Prisma User model.
-- Using IF NOT EXISTS keeps this migration safe on partially updated databases.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "webAuthnCredentialId" TEXT,
  ADD COLUMN IF NOT EXISTS "webAuthnPublicKey" TEXT,
  ADD COLUMN IF NOT EXISTS "biometricRegisteredAt" TIMESTAMP(3);
