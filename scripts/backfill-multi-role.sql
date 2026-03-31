UPDATE "User"
SET "roles" = ARRAY(
  SELECT DISTINCT role_item
  FROM unnest(
    COALESCE("roles", ARRAY[]::"UserRole"[])
    || ARRAY["role"]::"UserRole"[]
    || CASE
        WHEN "role" = 'PROVIDER' THEN ARRAY['CLIENT'::"UserRole", 'PROVIDER'::"UserRole"]
        ELSE ARRAY[]::"UserRole"[]
       END
  ) AS role_item
);
