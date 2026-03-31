import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export function createScriptPrisma() {
  const connectionString =
    process.env.DIRECT_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";

  if (!connectionString) {
    throw new Error(
      "Missing database URL. Set DIRECT_DATABASE_URL or DATABASE_URL before running scripts.",
    );
  }

  const pool = new Pool({
    connectionString,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { prisma, pool };
}
