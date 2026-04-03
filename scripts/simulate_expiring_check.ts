import { createScriptPrisma } from "./_prisma";

const { prisma, pool } = createScriptPrisma();

async function main() {
  const provider = await prisma.user.findFirst({
    where: { role: "PROVIDER" },
  });

  if (!provider) {
    console.log("No provider found.");
    return;
  }

  console.log(`Using provider: ${provider.email} (${provider.id})`);

  // Create an expiring background check
  const expiringDate = new Date();
  expiringDate.setDate(expiringDate.getDate() + 15); // Expires in 15 days

  await prisma.backgroundCheck.create({
    data: {
      userId: provider.id,
      status: "APPROVED",
      documents: ["https://example.com/mock-cert.pdf"],
      reportUrl: "https://example.com/mock-cert.pdf",
      expiresAt: expiringDate,
      renewalStatus: "DUE",
    },
  });

  console.log("Created expiring background check.");
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
