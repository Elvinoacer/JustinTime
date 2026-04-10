import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { categories } from "./categories.js";

function normalizeConnectionString(rawConnectionString: string): string {
  const url = new URL(rawConnectionString);
  const sslMode = url.searchParams.get("sslmode");
  const useLibpqCompat = url.searchParams.get("uselibpqcompat");

  // Preserve current secure behavior across pg's upcoming sslmode semantics change.
  if (sslMode === "require" && useLibpqCompat !== "true") {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}

const connectionStrings = [
  process.env.DIRECT_DATABASE_URL,
  process.env.DATABASE_URL,
]
  .filter((value): value is string => Boolean(value))
  .map(normalizeConnectionString)
  .filter((value, index, values) => values.indexOf(value) === index);

if (connectionStrings.length === 0) {
  throw new Error("DATABASE_URL or DIRECT_DATABASE_URL must be set for seeding");
}

function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    connectionTimeoutMillis: Number(
      process.env.PG_CONNECTION_TIMEOUT_MS ?? 15000,
    ),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
    max: Number(process.env.PG_POOL_MAX ?? 5),
    allowExitOnIdle: true,
  });
}

let activeConnectionIndex = 0;
let pool = createPool(connectionStrings[activeConnectionIndex]);
let prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function refreshClientForRetry(label: string): Promise<void> {
  const previousPool = pool;
  const previousPrisma = prisma;

  if (connectionStrings.length > 1) {
    activeConnectionIndex = (activeConnectionIndex + 1) % connectionStrings.length;
  }

  const nextConnectionString = connectionStrings[activeConnectionIndex];
  pool = createPool(nextConnectionString);
  prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  await Promise.allSettled([previousPrisma.$disconnect(), previousPool.end()]);

  const activeHost = new URL(nextConnectionString).host;
  console.warn(`[seed] ${label}: switched connection target to ${activeHost}`);
}

const SEED_RETRIES = Number(process.env.SEED_RETRIES ?? 6);
const SEED_RETRY_BASE_DELAY_MS = Number(process.env.SEED_RETRY_BASE_DELAY_MS ?? 1000);

const RETRYABLE_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "P1001",
  "P1002",
]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  const code =
    typeof candidate.code === "string" ? candidate.code.toUpperCase() : "";
  const message =
    typeof candidate.message === "string"
      ? candidate.message.toLowerCase()
      : "";

  return (
    RETRYABLE_ERROR_CODES.has(code) ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("connection")
  );
}

async function withRetry<T>(
  label: string,
  operation: () => Promise<T>,
  retries = SEED_RETRIES,
  baseDelayMs = SEED_RETRY_BASE_DELAY_MS,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;

      if (!isRetryable(error) || attempt > retries) {
        throw error;
      }

      await refreshClientForRetry(label);

      const waitMs = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[seed] ${label} failed (attempt ${attempt}/${retries}). Retrying in ${waitMs}ms...`,
      );
      await delay(waitMs);
    }
  }
}

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

  await withRetry("database connection warm-up", () =>
    prisma.$queryRaw`SELECT 1`,
  );

  await withRetry("category createMany", () =>
    prisma.category.createMany({
      data: categories,
      skipDuplicates: true,
    }),
  );

  for (const vertical of VERTICAL_SEEDS) {
    await withRetry(`vertical ${vertical.type} upsert`, () =>
      prisma.verticalCategory.upsert({
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
      }),
    );
  }

  const activeSolarConfig = await withRetry("load active solar config", () =>
    prisma.solarEstimationConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
  );

  if (!activeSolarConfig) {
    await withRetry("create default solar config", () =>
      prisma.solarEstimationConfig.create({
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
      }),
    );
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
