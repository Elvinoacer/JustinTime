import { prisma } from "./src/lib/prisma";

async function run() {
  try {
    const providers = await prisma.user.findMany({
      where: { role: "PROVIDER" },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        profile: true,
        subscription: {
          select: { plan: true, isActive: true },
        },
        _count: {
          select: {
            providerBookings: { where: { status: "COMPLETED" } },
            receivedReviews: true,
          },
        },
      },
      take: 200,
    });
    console.log("Providers fetched:", providers.length);

    const categories = await prisma.category.findMany({
      select: { id: true, name: true }
    });
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const formattedProviders = providers.map((provider) => {
      const p = provider.profile;
      const skills = Array.isArray(p?.skills)
        ? p!.skills.map(skillId => categoryMap.get(skillId) || skillId)
        : [];
      
      return {
        id: provider.id,
        name: provider.name || "Anonymous Professional",
        bio: p?.bio || "",
        skills,
        subscription: {
          plan: provider.subscription?.plan || "FREE",
          isActive: provider.subscription?.isActive || false,
        },
      };
    });

    // Test client side search
    const lowerSearch = "abc";
    formattedProviders.filter(p => 
      (p.name || "").toLowerCase().includes(lowerSearch) ||
      (p.bio?.toLowerCase().includes(lowerSearch)) ||
      p.skills.some(s => {
         if (typeof s !== "string") {
            console.error("Not a string skill:", s);
         }
         return typeof s === 'string' ? s.toLowerCase().includes(lowerSearch) : false;
      })
    );
    console.log("Formatting and search OK");
  } catch(e) {
    console.error("Test error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
