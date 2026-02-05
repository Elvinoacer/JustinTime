-- CreateEnum
CREATE TYPE "VerticalType" AS ENUM ('SOLAR', 'HVAC', 'SECURITY', 'SMART_HOME', 'EV_CHARGING', 'WATER_SYSTEMS');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('QUOTE_REQUESTED', 'SITE_ASSESSMENT', 'PROPOSAL_SENT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'WARRANTY', 'CANCELLED');

-- CreateTable
CREATE TABLE "VerticalCategory" (
    "id" TEXT NOT NULL,
    "type" "VerticalType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresCertification" BOOLEAN NOT NULL DEFAULT true,
    "minExperienceYears" INTEGER NOT NULL DEFAULT 2,
    "insuranceRequired" BOOLEAN NOT NULL DEFAULT true,
    "baseMarkup" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerticalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerticalCertification" (
    "id" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuingBody" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "status" "CertificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerticalCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerticalSpecialist" (
    "id" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "portfolioUrls" TEXT[],
    "specializations" TEXT[],
    "equipmentOwned" TEXT[],
    "serviceRadius" INTEGER,
    "projectsCompleted" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "featuredUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerticalSpecialist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentRegistry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "lastServiceDate" TIMESTAMP(3),
    "nextServiceDue" TIMESTAMP(3),
    "purchasePrice" DECIMAL(10,2),
    "currentValue" DECIMAL(10,2),
    "purchaseDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePriceMin" DECIMAL(10,2) NOT NULL,
    "basePriceMax" DECIMAL(10,2) NOT NULL,
    "estimatedDays" INTEGER NOT NULL DEFAULT 3,
    "teamSizeMin" INTEGER NOT NULL DEFAULT 2,
    "teamSizeMax" INTEGER NOT NULL DEFAULT 4,
    "phases" JSONB NOT NULL,
    "requiredEquipment" TEXT[],
    "requiredCertifications" TEXT[],
    "materialsTemplate" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerticalProject" (
    "id" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL,
    "templateId" TEXT,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'QUOTE_REQUESTED',
    "siteAddress" TEXT NOT NULL,
    "siteCoordinates" JSONB,
    "propertyType" TEXT,
    "roofType" TEXT,
    "roofArea" DOUBLE PRECISION,
    "monthlyBill" DECIMAL(10,2),
    "systemSize" DOUBLE PRECISION,
    "panelCount" INTEGER,
    "panelType" TEXT,
    "inverterType" TEXT,
    "batteryCapacity" DOUBLE PRECISION,
    "isOffGrid" BOOLEAN NOT NULL DEFAULT false,
    "quotedAmount" DECIMAL(12,2),
    "agreedAmount" DECIMAL(12,2),
    "depositAmount" DECIMAL(10,2),
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "siteAssessmentDate" TIMESTAMP(3),
    "proposalDate" TIMESTAMP(3),
    "approvalDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "warrantyYears" INTEGER DEFAULT 5,
    "warrantyEnds" TIMESTAMP(3),
    "proposalUrl" TEXT,
    "contractUrl" TEXT,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerticalProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "paymentRequired" BOOLEAN NOT NULL DEFAULT false,
    "paymentAmount" DECIMAL(10,2),
    "paymentPaid" BOOLEAN NOT NULL DEFAULT false,
    "checklistItems" JSONB,
    "notes" TEXT,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarEstimationConfig" (
    "id" TEXT NOT NULL,
    "monocrystallinePerWatt" DECIMAL(6,2) NOT NULL,
    "polycrystallinePerWatt" DECIMAL(6,2) NOT NULL,
    "inverterPricePerKw" DECIMAL(8,2) NOT NULL,
    "hybridInverterMarkup" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
    "leadAcidPerKwh" DECIMAL(8,2) NOT NULL,
    "lithiumPerKwh" DECIMAL(8,2) NOT NULL,
    "laborPerKw" DECIMAL(8,2) NOT NULL,
    "sundriesPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "defaultMargin" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "locationMultipliers" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolarEstimationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerticalCategory_type_key" ON "VerticalCategory"("type");

-- CreateIndex
CREATE INDEX "VerticalCertification_userId_idx" ON "VerticalCertification"("userId");

-- CreateIndex
CREATE INDEX "VerticalCertification_verticalId_idx" ON "VerticalCertification"("verticalId");

-- CreateIndex
CREATE INDEX "VerticalCertification_status_idx" ON "VerticalCertification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VerticalCertification_verticalId_userId_name_key" ON "VerticalCertification"("verticalId", "userId", "name");

-- CreateIndex
CREATE INDEX "VerticalSpecialist_userId_idx" ON "VerticalSpecialist"("userId");

-- CreateIndex
CREATE INDEX "VerticalSpecialist_verticalId_idx" ON "VerticalSpecialist"("verticalId");

-- CreateIndex
CREATE INDEX "VerticalSpecialist_isVerified_idx" ON "VerticalSpecialist"("isVerified");

-- CreateIndex
CREATE INDEX "VerticalSpecialist_isFeatured_idx" ON "VerticalSpecialist"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "VerticalSpecialist_verticalId_userId_key" ON "VerticalSpecialist"("verticalId", "userId");

-- CreateIndex
CREATE INDEX "EquipmentRegistry_userId_idx" ON "EquipmentRegistry"("userId");

-- CreateIndex
CREATE INDEX "EquipmentRegistry_category_idx" ON "EquipmentRegistry"("category");

-- CreateIndex
CREATE INDEX "ProjectTemplate_verticalId_idx" ON "ProjectTemplate"("verticalId");

-- CreateIndex
CREATE INDEX "ProjectTemplate_isActive_idx" ON "ProjectTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VerticalProject_bookingId_key" ON "VerticalProject"("bookingId");

-- CreateIndex
CREATE INDEX "VerticalProject_verticalId_idx" ON "VerticalProject"("verticalId");

-- CreateIndex
CREATE INDEX "VerticalProject_clientId_idx" ON "VerticalProject"("clientId");

-- CreateIndex
CREATE INDEX "VerticalProject_providerId_idx" ON "VerticalProject"("providerId");

-- CreateIndex
CREATE INDEX "VerticalProject_status_idx" ON "VerticalProject"("status");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_sequence_idx" ON "ProjectMilestone"("sequence");

-- AddForeignKey
ALTER TABLE "VerticalCertification" ADD CONSTRAINT "VerticalCertification_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES "VerticalCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerticalCertification" ADD CONSTRAINT "VerticalCertification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerticalSpecialist" ADD CONSTRAINT "VerticalSpecialist_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES "VerticalCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerticalSpecialist" ADD CONSTRAINT "VerticalSpecialist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentRegistry" ADD CONSTRAINT "EquipmentRegistry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTemplate" ADD CONSTRAINT "ProjectTemplate_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES "VerticalCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerticalProject" ADD CONSTRAINT "VerticalProject_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES "VerticalCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerticalProject" ADD CONSTRAINT "VerticalProject_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerticalProject" ADD CONSTRAINT "VerticalProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerticalProject" ADD CONSTRAINT "VerticalProject_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerticalProject" ADD CONSTRAINT "VerticalProject_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VerticalProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
