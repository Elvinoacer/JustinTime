
import { prisma } from "./src/lib/prisma";

async function checkSubscriptions() {
  console.log("Checking subscriptions...");
  const users = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
    },
    include: {
      subscription: true,
      profile: true,
    },
  });

  console.log(`Found ${users.length} providers.`);

  for (const user of users) {
    if (user.subscription) {
      console.log(`User: ${user.name} (${user.id})`);
      console.log(`  Plan: ${user.subscription.plan}`);
      console.log(`  Active: ${user.subscription.isActive}`);
      console.log(`  Verified: ${user.profile?.isVerified}`);
      console.log("---");
    } else {
        console.log(`User: ${user.name} (${user.id}) - No Subscription`);
    }
  }
}

checkSubscriptions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
