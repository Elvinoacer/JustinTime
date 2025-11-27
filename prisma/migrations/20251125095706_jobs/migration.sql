-- CreateEnum
CREATE TYPE "NegotiationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "proposedLocation" TEXT,
ADD COLUMN     "proposedPrice" DECIMAL(10,2),
ADD COLUMN     "startTime" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "defaultDuration" INTEGER,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "locationType" TEXT NOT NULL DEFAULT 'PROVIDER_LOCATION',
ADD COLUMN     "requiresAvailability" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingNegotiation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "proposedPrice" DECIMAL(10,2),
    "proposedLocation" TEXT,
    "message" TEXT,
    "status" "NegotiationStatus" NOT NULL DEFAULT 'PENDING',
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingNegotiation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Availability_providerId_idx" ON "Availability"("providerId");

-- CreateIndex
CREATE INDEX "Availability_serviceId_idx" ON "Availability"("serviceId");

-- CreateIndex
CREATE INDEX "AvailabilityException_providerId_idx" ON "AvailabilityException"("providerId");

-- CreateIndex
CREATE INDEX "AvailabilityException_date_idx" ON "AvailabilityException"("date");

-- CreateIndex
CREATE INDEX "BookingNegotiation_bookingId_idx" ON "BookingNegotiation"("bookingId");

-- CreateIndex
CREATE INDEX "BookingNegotiation_initiatorId_idx" ON "BookingNegotiation"("initiatorId");

-- CreateIndex
CREATE INDEX "BookingNegotiation_receiverId_idx" ON "BookingNegotiation"("receiverId");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNegotiation" ADD CONSTRAINT "BookingNegotiation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNegotiation" ADD CONSTRAINT "BookingNegotiation_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNegotiation" ADD CONSTRAINT "BookingNegotiation_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNegotiation" ADD CONSTRAINT "BookingNegotiation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BookingNegotiation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
