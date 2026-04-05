import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { categories } from "./categories.js";

const pool = new Pool({
  connectionString: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const VERTICAL_SEEDS = [
  {
    type: "SOLAR",
    name: "Solar Installation",
    description: "Solar panel installation and maintenance",
    icon: "☀️",
    requiresCertification: true,
    minExperienceYears: 2,
    insuranceRequired: true,
    baseMarkup: 1.05,
  },
  {
    type: "HVAC",
    name: "HVAC Systems",
    description: "Heating, ventilation, and air conditioning systems",
    icon: "❄️",
    requiresCertification: true,
    minExperienceYears: 2,
    insuranceRequired: true,
    baseMarkup: 1,
  },
  {
    type: "SECURITY",
    name: "Security Systems",
    description: "CCTV, alarms, and access-control installations",
    icon: "🛡️",
    requiresCertification: true,
    minExperienceYears: 2,
    insuranceRequired: true,
    baseMarkup: 1,
  },
  {
    type: "SMART_HOME",
    name: "Smart Home",
    description: "Automation and IoT home integrations",
    icon: "🏠",
    requiresCertification: false,
    minExperienceYears: 1,
    insuranceRequired: false,
    baseMarkup: 1,
  },
  {
    type: "EV_CHARGING",
    name: "EV Charging",
    description: "Electric vehicle charging infrastructure",
    icon: "🔌",
    requiresCertification: true,
    minExperienceYears: 2,
    insuranceRequired: true,
    baseMarkup: 1,
  },
  {
    type: "WATER_SYSTEMS",
    name: "Water Systems",
    description: "Water heating, filtration, and harvesting solutions",
    icon: "💧",
    requiresCertification: false,
    minExperienceYears: 1,
    insuranceRequired: false,
    baseMarkup: 1,
  },
] as const;

async function main() {
  console.log("Starting database seed...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  for (const vertical of VERTICAL_SEEDS) {
    await prisma.verticalCategory.upsert({
      where: { type: vertical.type },
      update: {
        name: vertical.name,
        description: vertical.description,
        icon: vertical.icon,
        isActive: true,
        requiresCertification: vertical.requiresCertification,
        minExperienceYears: vertical.minExperienceYears,
        insuranceRequired: vertical.insuranceRequired,
        baseMarkup: vertical.baseMarkup,
      },
      create: {
        type: vertical.type,
        name: vertical.name,
        description: vertical.description,
        icon: vertical.icon,
        isActive: true,
        requiresCertification: vertical.requiresCertification,
        minExperienceYears: vertical.minExperienceYears,
        insuranceRequired: vertical.insuranceRequired,
        baseMarkup: vertical.baseMarkup,
      },
    });
  }

  const activeSolarConfig = await prisma.solarEstimationConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!activeSolarConfig) {
    await prisma.solarEstimationConfig.create({
      data: {
        name: "Default Kenya Solar 2026",
        version: 1,
        monocrystallinePerWatt: 45,
        polycrystallinePerWatt: 38,
        inverterPricePerKw: 25000,
        hybridInverterMarkup: 1.3,
        leadAcidPerKwh: 15000,
        lithiumPerKwh: 45000,
        laborPerKw: 8000,
        sundriesPercent: 0.15,
        defaultMargin: 0.25,
        locationMultipliers: {
          Nairobi: 1.12,
          Mombasa: 1.08,
          Kisumu: 1.06,
          Nakuru: 1.04,
          UasinGishu: 1.03,
        },
        isActive: true,
      },
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
    await pool.end();
  });
