-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "basePrice" DECIMAL(10,2),
ADD COLUMN     "finalPrice" DECIMAL(10,2),
ADD COLUMN     "surgeMultiplier" DOUBLE PRECISION DEFAULT 1.0,
ADD COLUMN     "surgeReason" TEXT;
