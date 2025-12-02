import { PrismaClient } from "../src/generated/prisma/index.js";
import { categories } from "./categories.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
