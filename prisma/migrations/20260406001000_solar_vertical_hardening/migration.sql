-- Solar vertical hardening: support unassigned quote requests, richer estimate payloads, and config version metadata

ALTER TABLE "VerticalProject"
ALTER COLUMN "providerId" DROP NOT NULL;

ALTER TABLE "VerticalProject"
ADD COLUMN "county" TEXT,
ADD COLUMN "batteryType" TEXT,
ADD COLUMN "backupHours" INTEGER,
ADD COLUMN "estimateInput" JSONB,
ADD COLUMN "estimationConfigSnapshot" JSONB,
ADD COLUMN "statusHistory" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "assignedAt" TIMESTAMP(3);

ALTER TABLE "SolarEstimationConfig"
ADD COLUMN "name" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "SolarEstimationConfig_isActive_updatedAt_idx"
ON "SolarEstimationConfig"("isActive", "updatedAt");
