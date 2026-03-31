ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "roles" "UserRole"[] NOT NULL DEFAULT ARRAY['CLIENT']::"UserRole"[];

-- Ensure every user has at least their legacy primary role in the compatibility array.
UPDATE "User"
SET "roles" = ARRAY(
  SELECT DISTINCT role_item
  FROM unnest(COALESCE("roles", ARRAY[]::"UserRole"[]) || ARRAY["role"]::"UserRole"[]) AS role_item
);

-- Providers should always be dual-role for compatibility.
UPDATE "User"
SET "roles" = ARRAY(
  SELECT DISTINCT role_item
  FROM unnest(COALESCE("roles", ARRAY[]::"UserRole"[]) || ARRAY['CLIENT'::"UserRole", 'PROVIDER'::"UserRole"]) AS role_item
)
WHERE "role" = 'PROVIDER';
