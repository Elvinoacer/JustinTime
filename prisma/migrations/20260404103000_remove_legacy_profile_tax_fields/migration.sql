-- Migrate any legacy Profile tax fields into TaxSettings before removing duplicated columns.

-- Backfill existing TaxSettings rows with missing legacy values.
UPDATE "TaxSettings" ts
SET
  "kraPin" = COALESCE(ts."kraPin", p."kraPin"),
  "kraPinVerified" = CASE
    WHEN ts."kraPinVerified" = true THEN true
    WHEN p."kraVerified" = true AND COALESCE(ts."kraPin", p."kraPin") IS NOT NULL THEN true
    ELSE ts."kraPinVerified"
  END,
  "tccNumber" = COALESCE(ts."tccNumber", p."tccNumber"),
  "tccExpiry" = COALESCE(ts."tccExpiry", p."tccExpiry"),
  "updatedAt" = NOW()
FROM "Profile" p
WHERE ts."userId" = p."userId"
  AND (
    p."kraPin" IS NOT NULL
    OR p."tccNumber" IS NOT NULL
    OR p."tccExpiry" IS NOT NULL
    OR p."kraVerified" = true
  );

-- Create missing TaxSettings rows for users who only had legacy Profile tax data.
INSERT INTO "TaxSettings" (
  "id",
  "userId",
  "kraPin",
  "kraPinVerified",
  "tccNumber",
  "tccExpiry",
  "vatRegistered",
  "preferredMethod",
  "businessName",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(p."userId" || '-tax-settings-migration') AS "id",
  p."userId",
  p."kraPin",
  CASE
    WHEN p."kraVerified" = true AND p."kraPin" IS NOT NULL THEN true
    ELSE false
  END,
  p."tccNumber",
  p."tccExpiry",
  false,
  'STANDARD',
  NULL,
  NOW(),
  NOW()
FROM "Profile" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "TaxSettings" ts
  WHERE ts."userId" = p."userId"
)
  AND (
    p."kraPin" IS NOT NULL
    OR p."tccNumber" IS NOT NULL
    OR p."tccExpiry" IS NOT NULL
    OR p."kraVerified" = true
  );

-- Remove duplicated legacy tax fields from Profile.
ALTER TABLE "Profile"
  DROP COLUMN IF EXISTS "kraPin",
  DROP COLUMN IF EXISTS "tccNumber",
  DROP COLUMN IF EXISTS "tccExpiry",
  DROP COLUMN IF EXISTS "kraVerified";
