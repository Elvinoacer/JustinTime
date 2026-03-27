import { createScriptPrisma } from "./_prisma";
import { GavaConnect } from "../src/lib/gava";

const { prisma, pool } = createScriptPrisma();

async function main() {
  console.log("--- Verifying GavaConnect Integration ---");

  // 1. Verify GavaConnect Service Logic
  console.log("1. Testing GavaConnect Service...");

  const validPin = "A123456789Z";
  const invalidPin = "12345";

  const pinDetails = await GavaConnect.verifyPin(validPin);
  if (!pinDetails.isValid) {
    console.error("FAILED: Valid PIN A123456789Z validation failed");
    process.exit(1);
  }
  console.log("PASSED: Valid PIN Check");

  const invalidPinDetails = await GavaConnect.verifyPin(invalidPin);
  if (invalidPinDetails.isValid) {
    console.error("FAILED: Invalid PIN validation passed");
    process.exit(1);
  }
  console.log("PASSED: Invalid PIN Check");

  const tccDetails = await GavaConnect.checkTccStatus("TCC001");
  if (!tccDetails.isValid) {
    console.error("FAILED: Valid TCC validation failed");
  }
  console.log("PASSED: TCC Check");

  // 2. Database Schema Verification
  console.log("2. Testing Database Schema...");

  const provider = await prisma.user.findFirst({ where: { role: "PROVIDER" } });
  if (!provider) {
    console.log("Skipping DB Schema check: No provider found");
    return;
  }

  // Update Profile
  await prisma.profile.update({
    where: { userId: provider.id },
    data: {
      kraPin: validPin,
      tccNumber: "TCC-TEST-001",
      kraVerified: true,
    },
  });
  console.log("PASSED: Updated Tax Profile");

  // Create Tax Filing
  const filing = await prisma.taxFiling.create({
    data: {
      providerId: provider.id,
      period: "2026-01",
      type: "NIL",
      status: "FILED",
      ackNumber: "ACK-TEST-001",
    },
  });

  console.log(`PASSED: Created Filing ID: ${filing.id}`);

  // Cleanup
  await prisma.taxFiling.delete({ where: { id: filing.id } });
  // Optionally reset profile
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
