
import { prisma } from "./src/lib/prisma";

async function checkService() {
  const serviceId = "cmij1gr1l0005xgz0gl814erv";
  console.log(`Checking service ${serviceId}...`);
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      provider: {
        include: {
          subscription: true,
          profile: true,
        }
      }
    }
  });

  if (service) {
    console.log(`Service Provider: ${service.provider.name} (${service.provider.id})`);
    console.log(`  Plan: ${service.provider.subscription?.plan}`);
    console.log(`  Active: ${service.provider.subscription?.isActive}`);
    console.log(`  Verified: ${service.provider.profile?.isVerified}`);
  } else {
    console.log("Service not found");
  }
}

checkService()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
