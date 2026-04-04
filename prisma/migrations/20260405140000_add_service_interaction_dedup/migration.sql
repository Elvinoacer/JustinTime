-- CreateEnum
CREATE TYPE "ServiceInteractionType" AS ENUM ('VIEW', 'FAVORITE');

-- CreateTable
CREATE TABLE "service_interaction_dedup" (
    "serviceId" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "interactionType" "ServiceInteractionType" NOT NULL,
    "lastInteractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_interaction_dedup_pkey" PRIMARY KEY ("serviceId", "identityKey", "interactionType")
);

-- CreateIndex
CREATE INDEX "service_interaction_dedup_service_type_idx" ON "service_interaction_dedup"("serviceId", "interactionType");

-- AddForeignKey
ALTER TABLE "service_interaction_dedup" ADD CONSTRAINT "service_interaction_dedup_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
