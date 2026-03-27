import { createScriptPrisma } from "./_prisma";

const { prisma, pool } = createScriptPrisma();

async function main() {
  console.log("--- Verifying eTIMS Integration ---");

  // 1. Setup Data
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
        provider: { connect: { id: provider.id } },
        title: "eTIMS Test Service",
        description: "Test Description",
        category: { create: { name: "eTIMS Cat", slug: "etims-cat" } },
        price: 2000,
        pricingUnit: "SESSION",
      },
    });
  }

  // 2. Create Booking (Simulate API Logic)
  // We need to fetch the createInvoiceForBooking action logic or simulate it.
  // Since the API route imports `createInvoiceForBooking`, we can import it here if we were in the app context,
  // but scripts run in a separate context. We'll import the file directly.

  // NOTE: Importing from src/app/actions/invoice might fail if it relies on "use server" context or next headers in an incompatible way.
  // But let's try. If it fails, we'll manually call generateEtimsData and save.

  const { createInvoiceForBooking } =
    await import("../src/app/actions/invoice");

  const bookingData = {
    clientId: client.id,
    providerId: provider.id,
    serviceId: service.id,
    date: new Date(),
    startTime: "14:00",
    endTime: "15:00",
    status: "PENDING" as const,
    totalAmount: 2400, // 2000 + 400 tax
    exciseDutyAmount: 400,
    totalTaxAmount: 400,
  };

  const booking = await prisma.booking.create({
    data: bookingData,
  });

  console.log(`Created Booking ID: ${booking.id}`);

  // 3. Trigger Invoice Generation
  console.log("Triggering Invoice Generation...");
  try {
    const invoice = await createInvoiceForBooking(booking.id);
    console.log(`Invoice Generated: ${invoice.number}`);
    console.log(`CU Number: ${invoice.etimsCuNumber}`);
    console.log(`QR URL: ${invoice.etimsQrUrl}`);

    if (!invoice.etimsCuNumber || !invoice.etimsSignature) {
      throw new Error("Missing eTIMS fields");
    }
    console.log("PASSED: Invoice has eTIMS fields");
  } catch (error) {
    console.error("FAILED to generate invoice:", error);
    process.exit(1);
  }

  // Cleanup
  await prisma.invoice.deleteMany({ where: { bookingId: booking.id } });
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
