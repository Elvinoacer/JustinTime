# JustInTime Prisma Configuration and Code Documentation

This document describes the current Prisma setup in this application, including configuration, runtime wiring, CLI behavior, schema generation, scripts, and known caveats.

## 1. Prisma Stack in Use

Primary packages (from package.json):

- prisma: ^7.6.0
- @prisma/client: ^7.6.0
- @prisma/adapter-pg: ^7.6.0
- pg: ^8.20.0

Project module mode:

- type: module is enabled in package.json (ESM mode).

TypeScript target:

- tsconfig.json target is ES2023.
- module is esnext.
- moduleResolution is bundler.

## 2. Prisma-Related NPM Scripts

Defined in package.json:

- build: npx prisma generate && next build --turbopack
- studio: BROWSER=none prisma studio
- studio:5555: BROWSER=none prisma studio --port 5555

Prisma seed entry:

- Prisma 7 seed is configured in prisma.config.ts under migrations.seed.

Note on Studio:

- The BROWSER=none scripts are used to avoid the Prisma Studio stream pipe error on auto-browser launch in this environment.

## 3. Environment Variable Contract

Runtime app client (src/lib/prisma.ts):

- Requires DATABASE_URL.
- Does not fall back to DIRECT_DATABASE_URL.

Prisma CLI config (prisma.config.ts):

- Uses DIRECT_DATABASE_URL when available.
- Falls back to DATABASE_URL.
- Throws if both are missing.
- Loads .env via import "dotenv/config".

Intended split:

- DATABASE_URL: pooled/runtime application traffic.
- DIRECT_DATABASE_URL: direct connection for migrations/CLI operations.

## 4. Prisma CLI Configuration

File: prisma.config.ts

Current behavior:

- Imports defineConfig from prisma/config.
- Loads environment values.
- Validates at startup that at least one database URL exists.
- Sets:
  - schema: prisma/schema.prisma
  - migrations path: prisma/migrations
  - migrations seed command: tsx prisma/seed.ts
  - datasource URL: directUrl ?? pooledUrl

This prevents silent fallback to localhost and forces explicit DB configuration.

## 5. Prisma Schema and Client Generation

File: prisma/schema.prisma

Generator block:

- provider = "prisma-client"
- output = "../src/generated/prisma"
- compilerBuild = "fast"

Datasource block:

- provider = "postgresql"
- URL is supplied from prisma.config.ts (not hardcoded in schema).

Generated client location:

- src/generated/prisma

Import convention in app/runtime code:

- Use imports from @/generated/prisma/client.

## 6. Application Runtime Prisma Client

File: src/lib/prisma.ts

Pattern used:

- Singleton Prisma client for Next.js runtime.
- createPrismaClient() factory creates:
  - pg Pool
  - PrismaPg adapter
  - PrismaClient({ adapter, log })
- Uses global cache in non-production to avoid HMR connection explosion.

Connection/pool settings:

- max: 10
- idleTimeoutMillis: 10000
- connectionTimeoutMillis: 10000

Logging behavior:

- development: ["query", "error", "warn"]
- production: ["error"]

## 7. Seed Script Prisma Wiring

File: prisma/seed.ts

Current seed approach:

- Imports PrismaClient from ../src/generated/prisma/client.
- Creates pg Pool using DIRECT_DATABASE_URL ?? DATABASE_URL.
- Creates PrismaPg adapter and PrismaClient({ adapter }).
- Runs seed logic.
- Ensures cleanup with:
  - await prisma.$disconnect()
  - await pool.end()

## 8. Script-Level Prisma Wiring

### Shared helper

File: scripts/\_prisma.ts

Provides createScriptPrisma():

- Creates pool from DIRECT_DATABASE_URL ?? DATABASE_URL.
- Creates adapter and PrismaClient.
- Returns { prisma, pool }.

### Scripts currently using shared helper

- scripts/verify_gava.ts
- scripts/verify_excise_duty.ts
- scripts/verify_etims.ts
- scripts/simulate_expiring_check.ts

Each script:

- Imports createScriptPrisma().
- Uses returned prisma client.
- Cleans up with prisma.$disconnect() and pool.end().

## 9. Migration Layout

Migrations are in:

- prisma/migrations/

Lock file:

- prisma/migrations/migration_lock.toml

Schema source:

- prisma/schema.prisma

## 10. Prisma File Inventory in This Repo

Core config/runtime:

- package.json
- tsconfig.json
- prisma.config.ts
- prisma/schema.prisma
- src/lib/prisma.ts

Generation + data:

- prisma/seed.ts
- prisma/categories.ts
- prisma/migrations/\*

Script tooling:

- scripts/\_prisma.ts
- scripts/verify_gava.ts
- scripts/verify_excise_duty.ts
- scripts/verify_etims.ts
- scripts/simulate_expiring_check.ts
- scripts/verify_cancellation.ts

Reference document:

- docs/features/prismav7.md

## 11. Script Status Note

File: scripts/verify_cancellation.ts

Current state:

- This script now contains only pure cancellation logic tests.
- It does not initialize PrismaClient.
- It does not require database connectivity.

If database operations are added later, it should be migrated to scripts/\_prisma.ts helper like the other verification scripts.

## 12. Operational Commands

Common commands:

- Generate client:
  - npx prisma generate
- Run migrations (dev):
  - npx prisma migrate dev
- Open Prisma Studio without browser auto-launch:
  - npm run studio
- Open Prisma Studio on fixed port:
  - npm run studio:5555
- Run seed:
  - npx prisma db seed

Optional explicit config flags:

- Prisma Studio with explicit config:
  - npm run studio -- --config ./prisma.config.ts
- Prisma seed with explicit config:
  - npx prisma db seed --config ./prisma.config.ts

## 13. Summary

This app is configured for Prisma v7 with:

- ESM project settings.
- External Prisma config (prisma.config.ts).
- Adapter-based pg runtime client.
- Generated client under src/generated/prisma.
- Script-level adapter helper for CLI/testing scripts.
- Explicit Studio workaround in npm scripts.
