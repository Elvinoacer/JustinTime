import { createScriptPrisma } from "./_prisma";

async function backfillMultiRoleCompatibility() {
  const { prisma, pool } = createScriptPrisma();

  try {
    const result = await prisma.$executeRawUnsafe(`
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
      )
    `);

    console.log(`[multi-role backfill] updated rows: ${result}`);
    console.log("[multi-role backfill] completed successfully");
  } catch (error) {
    console.error("[multi-role backfill] failed", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void backfillMultiRoleCompatibility();
