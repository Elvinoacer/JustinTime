import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const categories = [
  {
    name: "Plumbing",
    slug: "plumbing",
    description: "Professional plumbing services",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSoRLvYBiA5nxkwMieVHSylWp_ijtNxvsluoA&s",
  },
  {
    name: "Electrical",
    slug: "electrical",
    description: "Licensed electrical work",
    image:
      "https://www.meteorelectrical.com/media/wysiwyg/Tools_Matters_for_Electrical_Work.jpg",
  },
  {
    name: "Cleaning",
    slug: "cleaning",
    description: "Cleaning and maintenance services",
    image:
      "https://media.restless.co.uk/uploads/2021/03/28_top_tips_for_a_successful_spring_clean_hero.jpg",
  },
  {
    name: "Gardening",
    slug: "gardening",
    description: "Lawn care and gardening",
    image:
      "https://img.freepik.com/free-photo/plants-pot-with-watering-can_23-2148905231.jpg?semt=ais_hybrid&w=740&q=80",
  },
  {
    name: "Painting",
    slug: "painting",
    description: "Interior and exterior painting",
    image:
      "https://irishartmart.ie/wp-content/uploads/2025/07/Watercolor-Painting-101-A-Beginners-Guide-to-Getting-Started-600x400.jpg",
  },
  {
    name: "Moving",
    slug: "moving",
    description: "Moving and relocation services",
    image:
      "https://www.friendsremovals.co.ke/wp-content/uploads/2025/05/Book-Professional-House-Moving-Services-in-Nairobi-.jpg",
  },
  {
    name: "Other",
    slug: "other",
    description: "Other services",
    image: "https://kijurasacco.com/images/services.png",
  },
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
