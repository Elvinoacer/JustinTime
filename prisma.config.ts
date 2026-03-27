import "dotenv/config";
import { defineConfig } from "prisma/config";

const directUrl = process.env.DIRECT_DATABASE_URL;
const pooledUrl = process.env.DATABASE_URL;

if (!directUrl && !pooledUrl) {
  throw new Error(
    "Neither DIRECT_DATABASE_URL nor DATABASE_URL is set. Prisma CLI cannot connect to the database.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl ?? pooledUrl!,
  },
});
