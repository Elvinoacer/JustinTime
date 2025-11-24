import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const categories = [
  { name: "Plumbing", slug: "plumbing", description: "Professional plumbing services" },
  { name: "Electrical", slug: "electrical", description: "Licensed electrical work" },
  { name: "Cleaning", slug: "cleaning", description: "Cleaning and maintenance services" },
  { name: "Gardening", slug: "gardening", description: "Lawn care and gardening" },
  { name: "Painting", slug: "painting", description: "Interior and exterior painting" },
  { name: "Moving", slug: "moving", description: "Moving and relocation services" },
  { name: "Other", slug: "other", description: "Other services" },
];

async function main() {
  console.log("Starting database seed...");

  // Seed categories
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
