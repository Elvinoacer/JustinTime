import { createScriptPrisma } from "./_prisma";
import { calculateBookingBreakdown } from "../src/lib/financials";

const { prisma, pool } = createScriptPrisma();

async function main() {
  console.log("--- Verifying Excise Duty Logic ---");

  // 1. Verify Calculation Logic
  const basePrice = 1000;
  const breakdown = calculateBookingBreakdown(basePrice);
  console.log(
    `Base: ${basePrice}, Excise: ${breakdown.exciseDuty}, Total: ${breakdown.totalAmount}`,
  );

  if (breakdown.exciseDuty !== 200) {
    console.error("FAILED: Excise Duty should be 200 (20% of 1000)");
    process.exit(1);
  }
  if (breakdown.totalAmount !== 1200) {
    console.error("FAILED: Total Amount should be 1200");
    process.exit(1);
  }
  console.log("PASSED: Calculation Logic Correct");

  // 2. Verify Database Schema (Create a test booking)
  // We need a client, provider, and service
  const client = await prisma.user.findFirst({ where: { role: "CLIENT" } });
  const provider = await prisma.user.findFirst({ where: { role: "PROVIDER" } });

  if (!client || !provider) {
    console.log("Skipping DB verification: Missing client or provider");
    return;
  }

  // Find or create a service
  let service = await prisma.service.findFirst({
    where: { providerId: provider.id },
  });
  if (!service) {
    service = await prisma.service.create({
      data: {
        provider: { connect: { id: provider.id } }, // Fixed: Use connect instead of providerId directly if using new client
        // OR better yet, just matching the schema. Assuming schema matches what I previously used.
        // Actually, let's use the explicit relation syntax.
        title: "Test Service",
        description: "Test Description",
        category: { create: { name: "Test Category", slug: "test-cat" } },
        price: 1000,
        pricingUnit: "SESSION",
      },
    });
  }

  // Create booking manually simulating the API logic
  const bookingData = {
    clientId: client.id,
    providerId: provider.id,
    serviceId: service.id,
    date: new Date(),
    startTime: "10:00",
    endTime: "11:00",
    totalAmount: breakdown.totalAmount,
    exciseDutyAmount: breakdown.exciseDuty,
    totalTaxAmount: breakdown.exciseDuty,
    status: "PENDING" as const,
  };

  const booking = await prisma.booking.create({
    data: bookingData,
  });

  console.log(`Created Booking ID: ${booking.id}`);
  console.log(`Saved Excise Duty: ${booking.exciseDutyAmount}`);
  console.log(`Saved Total Amount: ${booking.totalAmount}`);

  if (Number(booking.exciseDutyAmount) !== 200) {
    console.error("FAILED: Saved Excise Duty is incorrect");
  } else {
    console.log("PASSED: Database Schema supports Excise Duty");
  }

  // Cleanup
  await prisma.booking.delete({ where: { id: booking.id } });
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
