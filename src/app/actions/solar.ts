"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  estimateSolarSystem,
  quickEstimate,
  type SolarEstimationInput,
  type SolarPricingConfig,
} from "@/lib/solar/estimation-calculator";
import { Prisma, ProjectStatus } from "@/generated/prisma/client";
import {
  BOOKING_LIFECYCLE_EVENT_TYPES,
  recordBookingLifecycleEvent,
} from "@/lib/bookings/lifecycleTimeline";
import { calculateBookingTax } from "@/lib/etims/tax-calculator";

const SOLAR_VERTICAL_TYPE = "SOLAR";

const SOLAR_VERTICAL_SEED = {
  type: SOLAR_VERTICAL_TYPE,
  name: "Solar Installation",
  description: "Solar panel installation and maintenance",
  icon: "☀️",
  requiresCertification: true,
  minExperienceYears: 2,
  insuranceRequired: true,
  baseMarkup: 1.05,
} as const;

const DEFAULT_SOLAR_CONFIG_VALUES = {
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
  },
};

const ACTIVE_WORKLOAD_STATUSES: ProjectStatus[] = [
  "QUOTE_REQUESTED",
  "SITE_ASSESSMENT",
  "PROPOSAL_SENT",
  "APPROVED",
  "IN_PROGRESS",
  "WARRANTY",
];

const CLIENT_DRIVEN_STATUSES = new Set<ProjectStatus>([
  "APPROVED",
  "CANCELLED",
]);

const PROVIDER_DRIVEN_STATUSES = new Set<ProjectStatus>([
  "SITE_ASSESSMENT",
  "PROPOSAL_SENT",
  "IN_PROGRESS",
  "COMPLETED",
  "WARRANTY",
  "CANCELLED",
]);

const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  QUOTE_REQUESTED: ["SITE_ASSESSMENT", "PROPOSAL_SENT", "CANCELLED"],
  SITE_ASSESSMENT: ["PROPOSAL_SENT", "CANCELLED"],
  PROPOSAL_SENT: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["WARRANTY"],
  WARRANTY: ["COMPLETED", "CANCELLED"],
  CANCELLED: [],
};

const STATUS_MILESTONE_LABELS: Record<ProjectStatus, string> = {
  QUOTE_REQUESTED: "Quote Requested",
  SITE_ASSESSMENT: "Site Assessment",
  PROPOSAL_SENT: "Proposal Sent",
  APPROVED: "Client Approval",
  IN_PROGRESS: "Installation In Progress",
  COMPLETED: "Installation Completed",
  WARRANTY: "Warranty Active",
  CANCELLED: "Project Cancelled",
};

const idSchema = z.string().trim().min(8).max(64);

const quickEstimateSchema = z.object({
  monthlyBill: z.coerce.number().finite().min(500).max(5_000_000),
});

const detailedEstimateSchema = z
  .object({
    monthlyBill: z.coerce.number().finite().min(500).max(5_000_000),
    propertyType: z.enum(["residential", "commercial", "industrial"]),
    roofType: z.enum(["flat", "pitched", "metal_sheet"]),
    roofArea: z.coerce.number().finite().min(8).max(50_000).optional(),
    panelType: z.enum(["monocrystalline", "polycrystalline"]),
    wantsBattery: z.boolean(),
    batteryType: z.enum(["lead_acid", "lithium"]).optional(),
    backupHours: z.coerce.number().int().min(1).max(120).optional(),
    isOffGrid: z.boolean(),
    county: z.string().trim().min(2).max(120).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.wantsBattery && !value.batteryType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["batteryType"],
        message: "Battery type is required when battery backup is selected",
      });
    }

    if (!value.wantsBattery && value.backupHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["backupHours"],
        message: "Backup hours can only be set when battery backup is selected",
      });
    }

    if (value.isOffGrid && !value.wantsBattery) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wantsBattery"],
        message: "Off-grid systems require battery backup",
      });
    }
  });

const specialistRegistrationSchema = z.object({
  experienceYears: z.coerce.number().int().min(0).max(60),
  specializations: z.array(z.string().trim().min(2).max(80)).min(1).max(12),
  equipmentOwned: z.array(z.string().trim().min(2).max(80)).min(1).max(30),
  serviceRadius: z.coerce.number().int().min(1).max(500).optional(),
  portfolioUrls: z.array(z.string().trim().url().max(500)).max(25).optional(),
});

const certificationSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    issuingBody: z.string().trim().min(2).max(160),
    licenseNumber: z.string().trim().min(2).max(120).optional(),
    issueDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    documentUrl: z.string().trim().url().max(500),
  })
  .superRefine((value, ctx) => {
    if (
      value.issueDate &&
      value.expiryDate &&
      value.expiryDate < value.issueDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiryDate"],
        message: "Expiry date cannot be earlier than issue date",
      });
    }
  });

const availabilitySchema = z
  .object({
    county: z.string().trim().min(2).max(80).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    date: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (value) =>
      (value.latitude == null && value.longitude == null) ||
      (value.latitude != null && value.longitude != null),
    {
      message: "Provide both latitude and longitude for geo matching",
      path: ["latitude"],
    },
  );

const installerDirectorySchema = availabilitySchema.extend({
  search: z.string().trim().max(120).optional(),
});

const quoteRequestSchema = detailedEstimateSchema.extend({
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().max(4000).optional(),
  siteAddress: z.string().trim().min(8).max(240),
  templateId: idSchema.optional(),
  selectedSpecialistId: idSchema.optional(),
  siteCoordinates: z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    })
    .optional(),
});

const assignProviderSchema = z.object({
  projectId: idSchema,
  specialistId: idSchema,
});

const reviewCertificationSchema = z.object({
  certificationId: idSchema,
  decision: z.enum(["VERIFIED", "REJECTED", "EXPIRED"]),
  notes: z.string().trim().max(1000).optional(),
});

const specialistAdminSchema = z.object({
  specialistId: idSchema,
  isVerified: z.boolean(),
  isFeatured: z.boolean(),
  featuredUntil: z.coerce.date().optional(),
});

const projectMilestoneSchema = z
  .object({
    projectId: idSchema,
    name: z.string().trim().min(2).max(140),
    description: z.string().trim().max(2000).optional(),
    paymentRequired: z.boolean().default(false),
    paymentAmount: z.coerce.number().positive().max(50_000_000).optional(),
    checklistItems: z
      .array(z.string().trim().min(1).max(200))
      .max(40)
      .default([]),
  })
  .superRefine((value, ctx) => {
    if (value.paymentRequired && value.paymentAmount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentAmount"],
        message: "Payment amount is required for payment milestones",
      });
    }
  });

const completeMilestoneSchema = z.object({
  milestoneId: idSchema,
  notes: z.string().trim().max(2000).optional(),
});

const configSchema = z.object({
  name: z.string().trim().min(3).max(120),
  monocrystallinePerWatt: z.coerce.number().positive().max(1000),
  polycrystallinePerWatt: z.coerce.number().positive().max(1000),
  inverterPricePerKw: z.coerce.number().positive().max(500_000),
  hybridInverterMarkup: z.coerce.number().min(1).max(4),
  leadAcidPerKwh: z.coerce.number().positive().max(200_000),
  lithiumPerKwh: z.coerce.number().positive().max(300_000),
  laborPerKw: z.coerce.number().positive().max(200_000),
  sundriesPercent: z.coerce.number().min(0).max(1),
  defaultMargin: z.coerce.number().min(0).max(1),
  locationMultipliers: z
    .record(z.string(), z.coerce.number().min(0.5).max(3))
    .optional(),
  setActive: z.coerce.boolean().default(true),
});

const templatePhaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  durationDays: z.coerce.number().int().min(1).max(120).optional(),
  checklistItems: z.array(z.string().trim().min(1).max(180)).default([]),
});

const templateMaterialSchema = z.object({
  name: z.string().trim().min(2).max(120),
  quantity: z.coerce.number().positive().max(10_000),
  unitPrice: z.coerce.number().nonnegative().max(10_000_000),
  supplier: z.string().trim().max(120).optional(),
});

const templateSchema = z.object({
  name: z.string().trim().min(3).max(140),
  description: z.string().trim().max(3000).optional(),
  basePriceMin: z.coerce.number().positive().max(100_000_000),
  basePriceMax: z.coerce.number().positive().max(100_000_000),
  estimatedDays: z.coerce.number().int().min(1).max(365),
  teamSizeMin: z.coerce.number().int().min(1).max(50),
  teamSizeMax: z.coerce.number().int().min(1).max(50),
  phases: z.array(templatePhaseSchema).min(1).max(20),
  requiredEquipment: z
    .array(z.string().trim().min(2).max(120))
    .max(80)
    .default([]),
  requiredCertifications: z
    .array(z.string().trim().min(2).max(120))
    .max(40)
    .default([]),
  materialsTemplate: z.array(templateMaterialSchema).max(120).optional(),
  isActive: z.boolean().default(true),
});

const updateTemplateSchema = templateSchema.extend({
  templateId: idSchema,
});

const equipmentSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2).max(140),
  category: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  serialNumber: z.string().trim().max(160).optional(),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]).default("GOOD"),
  quantity: z.coerce.number().int().min(1).max(10_000).default(1),
  location: z.string().trim().max(200).optional(),
  purchasePrice: z.coerce.number().nonnegative().max(100_000_000).optional(),
  currentValue: z.coerce.number().nonnegative().max(100_000_000).optional(),
  purchaseDate: z.coerce.date().optional(),
  lastServiceDate: z.coerce.date().optional(),
  nextServiceDue: z.coerce.date().optional(),
});

const deleteEquipmentSchema = z.object({ id: idSchema });

const updateStatusSchema = z.object({
  projectId: idSchema,
  status: z.nativeEnum(ProjectStatus),
  notes: z.string().trim().max(1200).optional(),
});

function validationFailure(error: z.ZodError) {
  return {
    success: false as const,
    error: "Invalid input",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function failure(
  error: string,
  fieldErrors?: Record<string, string[] | undefined>,
) {
  return {
    success: false as const,
    error,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "object" && value && "toNumber" in value) {
    const decimalValue = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(decimalValue) ? decimalValue : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStringArray(values: string[]): string[] {
  const cleaned = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return [...new Set(cleaned)];
}

function parseLocationMultipliers(
  value: Prisma.JsonValue | null | undefined,
): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const parsed = toNumber(raw);
    if (parsed && parsed > 0) {
      result[key] = parsed;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function parseStatusHistory(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [] as Array<Record<string, unknown>>;
  }

  return value.filter(
    (entry) => !!entry && typeof entry === "object" && !Array.isArray(entry),
  ) as Array<Record<string, unknown>>;
}

function buildStatusHistoryEntry(
  from: ProjectStatus | null,
  to: ProjectStatus,
  actorId: string,
  actorRole: "ADMIN" | "CLIENT" | "PROVIDER",
  notes?: string,
) {
  return {
    from,
    to,
    actorId,
    actorRole,
    notes: notes || null,
    at: new Date().toISOString(),
  };
}

function getActorRole(
  project: { clientId: string; providerId: string | null },
  actorId: string,
  isAdmin: boolean,
): "ADMIN" | "CLIENT" | "PROVIDER" {
  if (isAdmin) return "ADMIN";
  if (project.providerId === actorId) return "PROVIDER";
  return "CLIENT";
}

function statusDateUpdateFields(
  status: ProjectStatus,
  warrantyYears: number | null | undefined,
): Prisma.VerticalProjectUpdateInput {
  const now = new Date();

  if (status === "SITE_ASSESSMENT") {
    return { siteAssessmentDate: now };
  }
  if (status === "PROPOSAL_SENT") {
    return { proposalDate: now };
  }
  if (status === "APPROVED") {
    return { approvalDate: now };
  }
  if (status === "IN_PROGRESS") {
    return { startDate: now };
  }
  if (status === "COMPLETED") {
    const years = warrantyYears ?? 5;
    const warrantyEnds = new Date(now);
    warrantyEnds.setFullYear(warrantyEnds.getFullYear() + years);
    return { completionDate: now, warrantyEnds };
  }

  return {};
}

function toMinutes(time: string): number | null {
  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number.parseInt(hoursRaw ?? "", 10);
  const minutes = Number.parseInt(minutesRaw ?? "", 10);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function revalidateSolarPublicPaths() {
  revalidatePath("/solar");
  revalidatePath("/solar/estimate");
  revalidatePath("/solar/installers");
}

function revalidateSolarDashboardPaths(projectId?: string) {
  revalidatePath("/dashboard/solar");
  revalidatePath("/dashboard/solar/projects");
  revalidatePath("/dashboard/solar/certifications");
  revalidatePath("/dashboard/verticals/solar/apply");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/client/bookings");

  if (projectId) {
    revalidatePath(`/dashboard/solar/projects/${projectId}`);
    revalidatePath(`/dashboard/verticals/solar/projects/${projectId}`);
    revalidatePath(`/client/solar/projects/${projectId}`);
  }
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildSolarInvoiceNumber(projectId: string): string {
  const now = new Date();
  const stamp = now.toISOString().replace(/[^\d]/g, "").slice(0, 14);
  const projectSuffix = projectId.slice(-4).toUpperCase();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${now.getFullYear()}-${stamp}-${projectSuffix}-${random}`;
}

function isPrismaTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const prismaError = error as { code?: string; message?: string };
  return (
    prismaError.code === "ETIMEDOUT" ||
    prismaError.code === "P1001" ||
    prismaError.message?.includes("ETIMEDOUT") === true
  );
}

async function resolveSolarPricingContext() {
  const vertical = await prisma.verticalCategory.findUnique({
    where: { type: SOLAR_VERTICAL_TYPE },
  });

  if (!vertical) {
    return {
      success: false as const,
      error:
        "Solar vertical is not configured yet. Ask an admin to run solar bootstrap.",
    };
  }

  const activeConfig = await prisma.solarEstimationConfig.findFirst({
    where: { isActive: true },
    orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
  });

  const pricing: SolarPricingConfig = {
    monocrystallinePerWatt:
      toNumber(activeConfig?.monocrystallinePerWatt) ??
      DEFAULT_SOLAR_CONFIG_VALUES.monocrystallinePerWatt,
    polycrystallinePerWatt:
      toNumber(activeConfig?.polycrystallinePerWatt) ??
      DEFAULT_SOLAR_CONFIG_VALUES.polycrystallinePerWatt,
    inverterPricePerKw:
      toNumber(activeConfig?.inverterPricePerKw) ??
      DEFAULT_SOLAR_CONFIG_VALUES.inverterPricePerKw,
    hybridInverterMarkup:
      toNumber(activeConfig?.hybridInverterMarkup) ??
      DEFAULT_SOLAR_CONFIG_VALUES.hybridInverterMarkup,
    leadAcidPerKwh:
      toNumber(activeConfig?.leadAcidPerKwh) ??
      DEFAULT_SOLAR_CONFIG_VALUES.leadAcidPerKwh,
    lithiumPerKwh:
      toNumber(activeConfig?.lithiumPerKwh) ??
      DEFAULT_SOLAR_CONFIG_VALUES.lithiumPerKwh,
    laborPerKw:
      toNumber(activeConfig?.laborPerKw) ??
      DEFAULT_SOLAR_CONFIG_VALUES.laborPerKw,
    sundriesPercent:
      toNumber(activeConfig?.sundriesPercent) ??
      DEFAULT_SOLAR_CONFIG_VALUES.sundriesPercent,
    defaultMargin:
      toNumber(activeConfig?.defaultMargin) ??
      DEFAULT_SOLAR_CONFIG_VALUES.defaultMargin,
    locationMultipliers:
      parseLocationMultipliers(activeConfig?.locationMultipliers) ??
      DEFAULT_SOLAR_CONFIG_VALUES.locationMultipliers,
    baseMarkup: vertical.baseMarkup,
  };

  const configSnapshot = activeConfig
    ? {
        id: activeConfig.id,
        name: activeConfig.name,
        version: activeConfig.version,
        updatedAt: activeConfig.updatedAt.toISOString(),
        baseMarkup: vertical.baseMarkup,
        monocrystallinePerWatt: pricing.monocrystallinePerWatt,
        polycrystallinePerWatt: pricing.polycrystallinePerWatt,
        inverterPricePerKw: pricing.inverterPricePerKw,
        hybridInverterMarkup: pricing.hybridInverterMarkup,
        leadAcidPerKwh: pricing.leadAcidPerKwh,
        lithiumPerKwh: pricing.lithiumPerKwh,
        laborPerKw: pricing.laborPerKw,
        sundriesPercent: pricing.sundriesPercent,
        defaultMargin: pricing.defaultMargin,
        locationMultipliers: pricing.locationMultipliers,
      }
    : {
        id: null,
        name: "Fallback default",
        version: 0,
        updatedAt: null,
        baseMarkup: vertical.baseMarkup,
        monocrystallinePerWatt: pricing.monocrystallinePerWatt,
        polycrystallinePerWatt: pricing.polycrystallinePerWatt,
        inverterPricePerKw: pricing.inverterPricePerKw,
        hybridInverterMarkup: pricing.hybridInverterMarkup,
        leadAcidPerKwh: pricing.leadAcidPerKwh,
        lithiumPerKwh: pricing.lithiumPerKwh,
        laborPerKw: pricing.laborPerKw,
        sundriesPercent: pricing.sundriesPercent,
        defaultMargin: pricing.defaultMargin,
        locationMultipliers: pricing.locationMultipliers,
      };

  return {
    success: true as const,
    vertical,
    activeConfig,
    pricing,
    configSnapshot,
  };
}

function extractTemplateMilestones(phases: unknown) {
  const parsed = z.array(templatePhaseSchema).safeParse(phases);
  if (!parsed.success) {
    return [] as Array<{
      name: string;
      description?: string;
      sequence: number;
      checklistItems: Prisma.InputJsonValue;
    }>;
  }

  return parsed.data.map((phase, index) => ({
    name: phase.name,
    description:
      phase.description ||
      (phase.durationDays ? `${phase.durationDays} day target` : undefined),
    sequence: index + 1,
    checklistItems: phase.checklistItems.map((task) => ({
      task,
      completed: false,
    })) as Prisma.InputJsonValue,
  }));
}

async function refreshSolarSpecialistMetrics(
  tx: Prisma.TransactionClient,
  providerId: string,
) {
  const [completedProjects, revenue, averageReview] = await Promise.all([
    tx.verticalProject.count({
      where: {
        vertical: { type: SOLAR_VERTICAL_TYPE },
        providerId,
        status: "COMPLETED",
      },
    }),
    tx.verticalProject.aggregate({
      where: {
        vertical: { type: SOLAR_VERTICAL_TYPE },
        providerId,
        status: "COMPLETED",
      },
      _sum: {
        agreedAmount: true,
        quotedAmount: true,
      },
    }),
    tx.review.aggregate({
      where: { targetId: providerId },
      _avg: { rating: true },
    }),
  ]);

  const totalRevenue =
    toNumber(revenue._sum.agreedAmount) ??
    toNumber(revenue._sum.quotedAmount) ??
    0;

  await tx.verticalSpecialist.updateMany({
    where: {
      userId: providerId,
      vertical: { type: SOLAR_VERTICAL_TYPE },
    },
    data: {
      projectsCompleted: completedProjects,
      totalRevenue,
      averageRating: Number(averageReview._avg.rating ?? 0),
    },
  });
}

async function upsertStatusMilestone(
  tx: Prisma.TransactionClient,
  projectId: string,
  status: ProjectStatus,
  actorId: string,
  notes?: string,
) {
  const milestoneName = STATUS_MILESTONE_LABELS[status];

  const existing = await tx.projectMilestone.findFirst({
    where: {
      projectId,
      name: milestoneName,
    },
  });

  if (existing) {
    await tx.projectMilestone.update({
      where: { id: existing.id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: actorId,
        ...(notes ? { notes } : {}),
      },
    });
    return;
  }

  const lastMilestone = await tx.projectMilestone.findFirst({
    where: { projectId },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });

  await tx.projectMilestone.create({
    data: {
      projectId,
      name: milestoneName,
      sequence: (lastMilestone?.sequence ?? -1) + 1,
      isCompleted: true,
      completedAt: new Date(),
      completedBy: actorId,
      notes,
      photos: [],
    },
  });
}

type SolarBookingSeedProject = {
  id: string;
  title: string;
  siteAddress: string;
  clientId: string;
  providerId: string | null;
  bookingId: string | null;
  quotedAmount: unknown;
  agreedAmount: unknown;
  depositAmount: unknown;
};

async function ensureSolarBookingFinancialArtifacts(
  tx: Prisma.TransactionClient,
  project: SolarBookingSeedProject,
  actorUserId: string,
  actorRole: "ADMIN" | "CLIENT" | "PROVIDER",
) {
  if (project.bookingId) {
    const existing = await tx.verticalProject.findUnique({
      where: { id: project.id },
    });

    if (!existing) {
      throw new Error("Solar project not found while syncing booking data");
    }

    return existing;
  }

  if (!project.providerId) {
    throw new Error(
      "Cannot create booking artifacts without assigned specialist",
    );
  }

  const existingAgreed = toNumber(project.agreedAmount);
  const contractAmount = existingAgreed ?? toNumber(project.quotedAmount) ?? 0;

  if (!Number.isFinite(contractAmount) || contractAmount <= 0) {
    throw new Error(
      "Cannot create booking artifacts without a valid project amount",
    );
  }

  const existingDeposit = toNumber(project.depositAmount);
  const bookingAmount = roundCurrency(
    Math.min(
      contractAmount,
      existingDeposit && existingDeposit > 0
        ? existingDeposit
        : Math.max(1000, contractAmount * 0.3),
    ),
  );

  const booking = await tx.booking.create({
    data: {
      clientId: project.clientId,
      providerId: project.providerId,
      date: new Date(),
      status: "PENDING",
      bookedVia: "WEB",
      totalAmount: bookingAmount,
      location: project.siteAddress,
      clientAddress: project.siteAddress,
      notes: `Solar project deposit booking for project ${project.id}: ${project.title}`,
      basePrice: bookingAmount,
      finalPrice: bookingAmount,
    },
  });

  const payment = await tx.payment.create({
    data: {
      bookingId: booking.id,
      amount: bookingAmount,
      method: "WALLET",
      status: "PENDING",
    },
  });

  const taxBreakdown = calculateBookingTax(bookingAmount, false, false);

  let invoiceCreated = false;
  for (let attempt = 0; attempt < 3 && !invoiceCreated; attempt += 1) {
    try {
      await tx.invoice.create({
        data: {
          bookingId: booking.id,
          number: buildSolarInvoiceNumber(project.id),
          subtotal: taxBreakdown.subtotal,
          vatAmount: taxBreakdown.vatAmount,
          exciseDuty: taxBreakdown.exciseDuty,
          withholdingTax: taxBreakdown.withholdingTax,
          totalAmount: taxBreakdown.totalAmount,
          status: "GENERATED",
          buyerName: "Solar Project Deposit",
        },
      });
      invoiceCreated = true;
    } catch (error) {
      const isUniqueConstraint =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (!isUniqueConstraint || attempt === 2) {
        throw error;
      }
    }
  }

  await recordBookingLifecycleEvent(
    {
      bookingId: booking.id,
      eventType: BOOKING_LIFECYCLE_EVENT_TYPES.BOOKING_CREATED,
      actorUserId,
      actorRole,
      reason: "Solar project approved and converted into deposit booking.",
      idempotencyKey: `booking:${booking.id}:created`,
      metadata: {
        projectId: project.id,
        bookingAmount,
      },
    },
    tx,
  );

  await recordBookingLifecycleEvent(
    {
      bookingId: booking.id,
      paymentId: payment.id,
      eventType: BOOKING_LIFECYCLE_EVENT_TYPES.PAYMENT_CREATED,
      toState: "PENDING",
      actorUserId,
      actorRole,
      reason: "Deposit payment initialized from solar project approval.",
      idempotencyKey: `booking:${booking.id}:payment:${payment.id}:created`,
      metadata: {
        projectId: project.id,
        amount: bookingAmount,
        method: "WALLET",
      },
    },
    tx,
  );

  return tx.verticalProject.update({
    where: { id: project.id },
    data: {
      bookingId: booking.id,
      ...(existingDeposit && existingDeposit > 0
        ? {}
        : { depositAmount: bookingAmount }),
      ...(existingAgreed && existingAgreed > 0
        ? {}
        : { agreedAmount: contractAmount }),
    },
  });
}

async function fetchSolarAvailabilityMatches(
  input: z.infer<typeof availabilitySchema>,
) {
  const targetDate = input.date ?? new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const specialists = await prisma.verticalSpecialist.findMany({
    where: {
      vertical: { type: SOLAR_VERTICAL_TYPE },
      isVerified: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          profile: {
            select: {
              location: true,
              latitude: true,
              longitude: true,
              bio: true,
            },
          },
          availability: {
            where: { isActive: true },
            select: {
              dayOfWeek: true,
              startTime: true,
              endTime: true,
            },
          },
          availabilityExceptions: {
            where: {
              date: {
                gte: startOfDay,
                lt: endOfDay,
              },
            },
            select: {
              date: true,
              isAvailable: true,
              startTime: true,
              endTime: true,
              reason: true,
            },
          },
        },
      },
      vertical: {
        select: {
          name: true,
        },
      },
    },
  });

  const providerIds = specialists.map((specialist) => specialist.userId);

  const workloadRows =
    providerIds.length > 0
      ? await prisma.verticalProject.groupBy({
          by: ["providerId"],
          where: {
            vertical: { type: SOLAR_VERTICAL_TYPE },
            providerId: { in: providerIds },
            status: { in: ACTIVE_WORKLOAD_STATUSES },
          },
          _count: {
            _all: true,
          },
        })
      : [];

  const workloadMap = new Map<string, number>();
  for (const row of workloadRows) {
    if (row.providerId) {
      workloadMap.set(row.providerId, row._count._all);
    }
  }

  const countyFilter = input.county?.trim().toLowerCase();

  const matches = specialists
    .map((specialist) => {
      const profile = specialist.user.profile;

      const lat = profile?.latitude ?? null;
      const lng = profile?.longitude ?? null;

      const distanceKm =
        input.latitude != null &&
        input.longitude != null &&
        lat != null &&
        lng != null
          ? haversineDistanceKm(input.latitude, input.longitude, lat, lng)
          : null;

      const withinRadius =
        input.latitude == null || input.longitude == null
          ? true
          : distanceKm != null
            ? specialist.serviceRadius == null
              ? true
              : distanceKm <= specialist.serviceRadius
            : false;

      const dayOfWeek = targetDate.getDay();
      const slotsForDay = specialist.user.availability.filter(
        (slot) => slot.dayOfWeek === dayOfWeek,
      );

      const matchingException = specialist.user.availabilityExceptions.find(
        (exception) => sameDay(exception.date, targetDate),
      );

      let availableOnDate = slotsForDay.length > 0;
      if (matchingException) {
        availableOnDate = matchingException.isAvailable;

        if (
          matchingException.isAvailable &&
          matchingException.startTime &&
          matchingException.endTime &&
          sameDay(targetDate, new Date())
        ) {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const startMinutes = toMinutes(matchingException.startTime);
          const endMinutes = toMinutes(matchingException.endTime);
          if (
            startMinutes != null &&
            endMinutes != null &&
            (currentMinutes < startMinutes || currentMinutes > endMinutes)
          ) {
            availableOnDate = false;
          }
        }
      }

      const locationLower = profile?.location?.toLowerCase() ?? "";
      const countyMatch = countyFilter
        ? locationLower.includes(countyFilter)
        : true;

      const activeProjects = workloadMap.get(specialist.userId) ?? 0;
      const rating = Number(specialist.averageRating ?? 0);
      const projectsCompleted = specialist.projectsCompleted ?? 0;
      const featureBoost =
        specialist.isFeatured &&
        (!specialist.featuredUntil || specialist.featuredUntil >= new Date())
          ? 1
          : 0;

      const availabilityScore =
        rating * 2 +
        (availableOnDate ? 3 : 0) +
        (withinRadius ? 2 : 0) +
        featureBoost +
        Math.min(projectsCompleted / 20, 2) -
        Math.min(activeProjects, 8) * 0.4;

      return {
        id: specialist.id,
        userId: specialist.user.id,
        name: specialist.user.name,
        image: specialist.user.image,
        location: profile?.location ?? null,
        bio: profile?.bio ?? null,
        experienceYears: specialist.experienceYears,
        specializations: specialist.specializations,
        equipmentOwned: specialist.equipmentOwned,
        serviceRadius: specialist.serviceRadius,
        averageRating: rating,
        projectsCompleted,
        totalRevenue: toNumber(specialist.totalRevenue) ?? 0,
        isFeatured:
          specialist.isFeatured &&
          (!specialist.featuredUntil || specialist.featuredUntil >= new Date()),
        featuredUntil: specialist.featuredUntil,
        distanceKm:
          distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
        withinRadius,
        availableOnDate,
        activeProjects,
        countyMatch,
        availabilityScore,
      };
    })
    .filter((entry) => entry.countyMatch)
    .sort((a, b) => b.availabilityScore - a.availabilityScore)
    .slice(0, input.limit);

  return matches;
}

// ============ SOLAR BOOTSTRAP & CONFIG ============

export async function bootstrapSolarVerticalData() {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return failure("Only admins can bootstrap solar data");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const vertical = await tx.verticalCategory.upsert({
        where: { type: SOLAR_VERTICAL_TYPE },
        update: {
          name: SOLAR_VERTICAL_SEED.name,
          description: SOLAR_VERTICAL_SEED.description,
          icon: SOLAR_VERTICAL_SEED.icon,
          isActive: true,
          requiresCertification: SOLAR_VERTICAL_SEED.requiresCertification,
          minExperienceYears: SOLAR_VERTICAL_SEED.minExperienceYears,
          insuranceRequired: SOLAR_VERTICAL_SEED.insuranceRequired,
          baseMarkup: SOLAR_VERTICAL_SEED.baseMarkup,
        },
        create: {
          type: SOLAR_VERTICAL_SEED.type,
          name: SOLAR_VERTICAL_SEED.name,
          description: SOLAR_VERTICAL_SEED.description,
          icon: SOLAR_VERTICAL_SEED.icon,
          isActive: true,
          requiresCertification: SOLAR_VERTICAL_SEED.requiresCertification,
          minExperienceYears: SOLAR_VERTICAL_SEED.minExperienceYears,
          insuranceRequired: SOLAR_VERTICAL_SEED.insuranceRequired,
          baseMarkup: SOLAR_VERTICAL_SEED.baseMarkup,
        },
      });

      const activeConfig = await tx.solarEstimationConfig.findFirst({
        where: { isActive: true },
        orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
      });

      if (activeConfig) {
        return { vertical, config: activeConfig, configCreated: false };
      }

      const createdConfig = await tx.solarEstimationConfig.create({
        data: {
          name: "Default Kenya Solar 2026",
          version: 1,
          monocrystallinePerWatt:
            DEFAULT_SOLAR_CONFIG_VALUES.monocrystallinePerWatt,
          polycrystallinePerWatt:
            DEFAULT_SOLAR_CONFIG_VALUES.polycrystallinePerWatt,
          inverterPricePerKw: DEFAULT_SOLAR_CONFIG_VALUES.inverterPricePerKw,
          hybridInverterMarkup:
            DEFAULT_SOLAR_CONFIG_VALUES.hybridInverterMarkup,
          leadAcidPerKwh: DEFAULT_SOLAR_CONFIG_VALUES.leadAcidPerKwh,
          lithiumPerKwh: DEFAULT_SOLAR_CONFIG_VALUES.lithiumPerKwh,
          laborPerKw: DEFAULT_SOLAR_CONFIG_VALUES.laborPerKw,
          sundriesPercent: DEFAULT_SOLAR_CONFIG_VALUES.sundriesPercent,
          defaultMargin: DEFAULT_SOLAR_CONFIG_VALUES.defaultMargin,
          locationMultipliers: DEFAULT_SOLAR_CONFIG_VALUES.locationMultipliers,
          isActive: true,
        },
      });

      return { vertical, config: createdConfig, configCreated: true };
    });

    revalidateSolarPublicPaths();
    revalidateSolarDashboardPaths();

    return {
      success: true as const,
      vertical: result.vertical,
      config: result.config,
      configCreated: result.configCreated,
    };
  } catch (error) {
    console.error("[bootstrapSolarVerticalData]", error);
    return failure("Failed to bootstrap solar data");
  }
}

export async function getActiveSolarEstimationConfig() {
  try {
    const context = await resolveSolarPricingContext();
    if (!context.success) {
      return context;
    }

    return {
      success: true as const,
      config: context.activeConfig
        ? {
            id: context.activeConfig.id,
            name: context.activeConfig.name,
            version: context.activeConfig.version,
            updatedAt: context.activeConfig.updatedAt,
            isActive: context.activeConfig.isActive,
            monocrystallinePerWatt: context.pricing.monocrystallinePerWatt,
            polycrystallinePerWatt: context.pricing.polycrystallinePerWatt,
            inverterPricePerKw: context.pricing.inverterPricePerKw,
            hybridInverterMarkup: context.pricing.hybridInverterMarkup,
            leadAcidPerKwh: context.pricing.leadAcidPerKwh,
            lithiumPerKwh: context.pricing.lithiumPerKwh,
            laborPerKw: context.pricing.laborPerKw,
            sundriesPercent: context.pricing.sundriesPercent,
            defaultMargin: context.pricing.defaultMargin,
            locationMultipliers: context.pricing.locationMultipliers,
            baseMarkup: context.pricing.baseMarkup,
          }
        : null,
      vertical: {
        id: context.vertical.id,
        name: context.vertical.name,
        baseMarkup: context.vertical.baseMarkup,
      },
    };
  } catch (error) {
    console.error("[getActiveSolarEstimationConfig]", error);
    return failure("Failed to load active solar estimation config");
  }
}

export async function upsertSolarEstimationConfig(
  data: z.input<typeof configSchema>,
) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return failure("Only admins can update estimation config");
  }

  const parsed = configSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const context = await resolveSolarPricingContext();
    if (!context.success) {
      return context;
    }

    const config = await prisma.$transaction(async (tx) => {
      const latest = await tx.solarEstimationConfig.findFirst({
        orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
      });

      if (parsed.data.setActive) {
        await tx.solarEstimationConfig.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      return tx.solarEstimationConfig.create({
        data: {
          name: parsed.data.name,
          version: (latest?.version ?? 0) + 1,
          monocrystallinePerWatt: parsed.data.monocrystallinePerWatt,
          polycrystallinePerWatt: parsed.data.polycrystallinePerWatt,
          inverterPricePerKw: parsed.data.inverterPricePerKw,
          hybridInverterMarkup: parsed.data.hybridInverterMarkup,
          leadAcidPerKwh: parsed.data.leadAcidPerKwh,
          lithiumPerKwh: parsed.data.lithiumPerKwh,
          laborPerKw: parsed.data.laborPerKw,
          sundriesPercent: parsed.data.sundriesPercent,
          defaultMargin: parsed.data.defaultMargin,
          locationMultipliers: parsed.data.locationMultipliers,
          isActive: parsed.data.setActive,
        },
      });
    });

    revalidateSolarPublicPaths();
    revalidateSolarDashboardPaths();

    return {
      success: true as const,
      config,
    };
  } catch (error) {
    console.error("[upsertSolarEstimationConfig]", error);
    return failure("Failed to save solar estimation config");
  }
}

// ============ SOLAR ESTIMATION ============

export async function getQuickSolarEstimate(monthlyBill: number) {
  const parsed = quickEstimateSchema.safeParse({ monthlyBill });
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const context = await resolveSolarPricingContext();

    if (!context.success) {
      const estimate = quickEstimate(parsed.data.monthlyBill);
      return {
        success: true as const,
        ...estimate,
        pricingMeta: {
          configId: null,
          configVersion: 0,
          source: "fallback-static",
        },
      };
    }

    const baselineInput: SolarEstimationInput = {
      monthlyBill: parsed.data.monthlyBill,
      propertyType: "residential",
      roofType: "pitched",
      panelType: "polycrystalline",
      wantsBattery: false,
      isOffGrid: false,
    };

    const minScenario = estimateSolarSystem(baselineInput, {
      ...context.pricing,
      baseMarkup: 1,
    });

    const maxScenario = estimateSolarSystem(
      {
        ...baselineInput,
        panelType: "monocrystalline",
        wantsBattery: true,
        batteryType: "lithium",
        backupHours: 12,
      },
      context.pricing,
    );

    const minPrice = Math.min(minScenario.totalCost, maxScenario.totalCost);
    const maxPrice = Math.max(minScenario.totalCost, maxScenario.totalCost);
    const minPayback = Math.min(
      minScenario.paybackYears,
      maxScenario.paybackYears,
    );
    const maxPayback = Math.max(
      minScenario.paybackYears,
      maxScenario.paybackYears,
    );

    return {
      success: true as const,
      systemKw:
        Math.round(
          Math.max(
            minScenario.recommendedSystemKw,
            maxScenario.recommendedSystemKw,
          ) * 10,
        ) / 10,
      priceRange: {
        min: Math.round(minPrice / 1000) * 1000,
        max: Math.round(maxPrice / 1000) * 1000,
      },
      paybackRange: {
        min: minPayback,
        max: maxPayback,
      },
      pricingMeta: {
        configId: context.activeConfig?.id ?? null,
        configVersion: context.activeConfig?.version ?? 0,
        source: "active-config",
      },
    };
  } catch (error) {
    console.error("[getQuickSolarEstimate]", error);
    return failure("Failed to calculate quick estimate");
  }
}

export async function getDetailedSolarEstimate(input: SolarEstimationInput) {
  const parsed = detailedEstimateSchema.safeParse(input);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const context = await resolveSolarPricingContext();
    if (!context.success) {
      return context;
    }

    const estimate = estimateSolarSystem(parsed.data, context.pricing);

    return {
      success: true as const,
      estimate,
      pricingMeta: {
        configId: context.activeConfig?.id ?? null,
        configVersion: context.activeConfig?.version ?? 0,
        baseMarkup: context.vertical.baseMarkup,
      },
    };
  } catch (error) {
    console.error("[getDetailedSolarEstimate]", error);
    return failure("Failed to calculate detailed estimate");
  }
}

// ============ VERTICAL MANAGEMENT ============

export async function getActiveVerticals() {
  try {
    const verticals = await prisma.verticalCategory.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { specialists: true, projects: true } },
      },
      orderBy: { name: "asc" },
    });

    return { success: true as const, verticals };
  } catch (error) {
    console.error("[getActiveVerticals]", error);
    return failure("Failed to get verticals");
  }
}

export async function getSolarVertical() {
  try {
    const vertical = await prisma.verticalCategory.findUnique({
      where: { type: SOLAR_VERTICAL_TYPE },
      include: {
        specialists: {
          where: { isVerified: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                profile: {
                  select: { location: true, hourlyRate: true, bio: true },
                },
              },
            },
          },
          orderBy: [{ isFeatured: "desc" }, { averageRating: "desc" }],
          take: 12,
        },
        templates: {
          where: { isActive: true },
          orderBy: { updatedAt: "desc" },
        },
        _count: { select: { specialists: true, projects: true } },
      },
    });

    if (!vertical) {
      return failure(
        "Solar vertical is not configured yet. Ask an admin to run solar bootstrap.",
      );
    }

    const now = new Date();
    const specialists = [...vertical.specialists].sort((a, b) => {
      const aFeatured =
        a.isFeatured && (!a.featuredUntil || a.featuredUntil >= now) ? 1 : 0;
      const bFeatured =
        b.isFeatured && (!b.featuredUntil || b.featuredUntil >= now) ? 1 : 0;

      if (aFeatured !== bFeatured) {
        return bFeatured - aFeatured;
      }

      if (a.averageRating !== b.averageRating) {
        return b.averageRating - a.averageRating;
      }

      return b.projectsCompleted - a.projectsCompleted;
    });

    return {
      success: true as const,
      vertical: {
        ...vertical,
        specialists,
      },
    };
  } catch (error) {
    if (
      process.env.NODE_ENV === "development" ||
      !isPrismaTimeoutError(error)
    ) {
      console.error("[getSolarVertical]", error);
    }
    return failure("Failed to get solar vertical");
  }
}

// ============ SPECIALIST ONBOARDING ============

export async function registerAsSolarSpecialist(
  data: z.input<typeof specialistRegistrationSchema>,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  if (!hasRole(session.user, "PROVIDER")) {
    return failure("Only providers can register as solar specialists");
  }

  if (
    !session.user.onboardingCompleted &&
    !session.user.providerSetupCompleted
  ) {
    return failure(
      "Complete provider onboarding before applying as a solar specialist",
    );
  }

  const parsed = specialistRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const vertical = await prisma.verticalCategory.findUnique({
      where: { type: SOLAR_VERTICAL_TYPE },
    });

    if (!vertical) {
      return failure(
        "Solar vertical is not configured yet. Ask an admin to run solar bootstrap.",
      );
    }

    if (parsed.data.experienceYears < vertical.minExperienceYears) {
      return failure("Experience requirement not met", {
        experienceYears: [
          `Minimum ${vertical.minExperienceYears} years required for solar specialists`,
        ],
      });
    }

    const specialist = await prisma.verticalSpecialist.upsert({
      where: {
        verticalId_userId: {
          verticalId: vertical.id,
          userId: session.user.id,
        },
      },
      update: {
        experienceYears: parsed.data.experienceYears,
        specializations: normalizeStringArray(parsed.data.specializations),
        equipmentOwned: normalizeStringArray(parsed.data.equipmentOwned),
        serviceRadius: parsed.data.serviceRadius,
        portfolioUrls: normalizeStringArray(parsed.data.portfolioUrls || []),
      },
      create: {
        verticalId: vertical.id,
        userId: session.user.id,
        experienceYears: parsed.data.experienceYears,
        specializations: normalizeStringArray(parsed.data.specializations),
        equipmentOwned: normalizeStringArray(parsed.data.equipmentOwned),
        serviceRadius: parsed.data.serviceRadius,
        portfolioUrls: normalizeStringArray(parsed.data.portfolioUrls || []),
      },
    });

    revalidateSolarPublicPaths();
    revalidateSolarDashboardPaths();

    return { success: true as const, specialist };
  } catch (error) {
    console.error("[registerAsSolarSpecialist]", error);
    return failure("Failed to register as specialist");
  }
}

export async function updateSolarSpecialistProfile(
  data: z.input<typeof specialistRegistrationSchema>,
) {
  return registerAsSolarSpecialist(data);
}

export async function getMySolarSpecialistProfile() {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  if (!hasRole(session.user, "PROVIDER")) {
    return failure("Only providers can access specialist profile");
  }

  try {
    const vertical = await prisma.verticalCategory.findUnique({
      where: { type: SOLAR_VERTICAL_TYPE },
      select: { id: true, name: true, minExperienceYears: true },
    });

    if (!vertical) {
      return failure(
        "Solar vertical is not configured yet. Ask an admin to run solar bootstrap.",
      );
    }

    const [specialist, certifications] = await Promise.all([
      prisma.verticalSpecialist.findUnique({
        where: {
          verticalId_userId: {
            verticalId: vertical.id,
            userId: session.user.id,
          },
        },
      }),
      prisma.verticalCertification.findMany({
        where: {
          verticalId: vertical.id,
          userId: session.user.id,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      success: true as const,
      vertical,
      specialist,
      certifications,
    };
  } catch (error) {
    console.error("[getMySolarSpecialistProfile]", error);
    return failure("Failed to load specialist profile");
  }
}

export async function submitCertification(
  data: z.input<typeof certificationSchema>,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  if (!hasRole(session.user, "PROVIDER")) {
    return failure("Only providers can submit certifications");
  }

  const parsed = certificationSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const vertical = await prisma.verticalCategory.findUnique({
      where: { type: SOLAR_VERTICAL_TYPE },
      select: { id: true },
    });

    if (!vertical) {
      return failure(
        "Solar vertical is not configured yet. Ask an admin to run solar bootstrap.",
      );
    }

    const certification = await prisma.verticalCertification.create({
      data: {
        verticalId: vertical.id,
        userId: session.user.id,
        name: parsed.data.name,
        issuingBody: parsed.data.issuingBody,
        licenseNumber: parsed.data.licenseNumber,
        issueDate: parsed.data.issueDate,
        expiryDate: parsed.data.expiryDate,
        documentUrl: parsed.data.documentUrl,
        status: "PENDING",
      },
    });

    revalidateSolarDashboardPaths();
    revalidateSolarPublicPaths();

    return { success: true as const, certification };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return failure(
        "You already submitted this certification for review. Update the existing entry instead.",
      );
    }

    console.error("[submitCertification]", error);
    return failure("Failed to submit certification");
  }
}

export async function getMySolarCertifications() {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  try {
    const certifications = await prisma.verticalCertification.findMany({
      where: {
        userId: session.user.id,
        vertical: { type: SOLAR_VERTICAL_TYPE },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true as const, certifications };
  } catch (error) {
    console.error("[getMySolarCertifications]", error);
    return failure("Failed to load certifications");
  }
}

export async function getSolarCertificationsForReview() {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return failure("Only admins can review certifications");
  }

  try {
    const certifications = await prisma.verticalCertification.findMany({
      where: {
        vertical: { type: SOLAR_VERTICAL_TYPE },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return { success: true as const, certifications };
  } catch (error) {
    console.error("[getSolarCertificationsForReview]", error);
    return failure("Failed to load certification review queue");
  }
}

export async function reviewSolarCertification(
  data: z.input<typeof reviewCertificationSchema>,
) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return failure("Only admins can review certifications");
  }

  const parsed = reviewCertificationSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const certification = await tx.verticalCertification.findUnique({
        where: { id: parsed.data.certificationId },
        select: {
          id: true,
          userId: true,
          verticalId: true,
          vertical: { select: { type: true } },
        },
      });

      if (
        !certification ||
        certification.vertical.type !== SOLAR_VERTICAL_TYPE
      ) {
        throw new Error("Solar certification not found");
      }

      const cert = await tx.verticalCertification.update({
        where: { id: certification.id },
        data: {
          status: parsed.data.decision,
          notes: parsed.data.notes,
          verifiedBy: session.user.id,
          verifiedAt: parsed.data.decision === "VERIFIED" ? new Date() : null,
        },
      });

      const verifiedCount = await tx.verticalCertification.count({
        where: {
          verticalId: certification.verticalId,
          userId: certification.userId,
          status: "VERIFIED",
        },
      });

      await tx.verticalSpecialist.updateMany({
        where: {
          verticalId: certification.verticalId,
          userId: certification.userId,
        },
        data: {
          isVerified: verifiedCount > 0,
          ...(verifiedCount > 0
            ? {}
            : { isFeatured: false, featuredUntil: null }),
        },
      });

      return cert;
    });

    revalidateSolarPublicPaths();
    revalidateSolarDashboardPaths();

    return { success: true as const, certification: updated };
  } catch (error) {
    console.error("[reviewSolarCertification]", error);
    return failure("Failed to review certification");
  }
}

export async function updateSolarSpecialistAdminState(
  data: z.input<typeof specialistAdminSchema>,
) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return failure("Only admins can update specialist state");
  }

  const parsed = specialistAdminSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const specialist = await prisma.verticalSpecialist.update({
      where: { id: parsed.data.specialistId },
      data: {
        isVerified: parsed.data.isVerified,
        isFeatured: parsed.data.isFeatured,
        featuredUntil: parsed.data.isFeatured
          ? (parsed.data.featuredUntil ?? null)
          : null,
      },
    });

    revalidateSolarPublicPaths();
    revalidateSolarDashboardPaths();

    return { success: true as const, specialist };
  } catch (error) {
    console.error("[updateSolarSpecialistAdminState]", error);
    return failure("Failed to update specialist admin state");
  }
}

export async function getSolarSpecialistsAdmin() {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return failure("Only admins can list solar specialists");
  }

  try {
    const specialists = await prisma.verticalSpecialist.findMany({
      where: {
        vertical: { type: SOLAR_VERTICAL_TYPE },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: {
                location: true,
              },
            },
          },
        },
      },
      orderBy: [{ isVerified: "asc" }, { createdAt: "desc" }],
    });

    return { success: true as const, specialists };
  } catch (error) {
    console.error("[getSolarSpecialistsAdmin]", error);
    return failure("Failed to load specialists");
  }
}

export async function getFeaturedSolarSpecialists(limit: number = 6) {
  const sanitizedLimit = Math.max(1, Math.min(24, Math.floor(limit)));

  try {
    const specialists = await prisma.verticalSpecialist.findMany({
      where: {
        vertical: { type: SOLAR_VERTICAL_TYPE },
        isVerified: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: {
              select: {
                location: true,
                hourlyRate: true,
                bio: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
        vertical: { select: { name: true } },
      },
    });

    const now = new Date();
    const sorted = [...specialists].sort((a, b) => {
      const aFeatured =
        a.isFeatured && (!a.featuredUntil || a.featuredUntil >= now) ? 1 : 0;
      const bFeatured =
        b.isFeatured && (!b.featuredUntil || b.featuredUntil >= now) ? 1 : 0;

      if (aFeatured !== bFeatured) {
        return bFeatured - aFeatured;
      }

      if (a.averageRating !== b.averageRating) {
        return b.averageRating - a.averageRating;
      }

      return b.projectsCompleted - a.projectsCompleted;
    });

    return {
      success: true as const,
      specialists: sorted.slice(0, sanitizedLimit),
    };
  } catch (error) {
    if (
      process.env.NODE_ENV === "development" ||
      !isPrismaTimeoutError(error)
    ) {
      console.error("[getFeaturedSolarSpecialists]", error);
    }
    return failure("Failed to get specialists");
  }
}

// ============ AVAILABILITY & INSTALLER DISCOVERY ============

export async function getSolarSpecialistAvailability(
  data?: z.input<typeof availabilitySchema>,
) {
  const parsed = availabilitySchema.safeParse(data ?? {});
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const specialists = await fetchSolarAvailabilityMatches(parsed.data);
    return { success: true as const, specialists };
  } catch (error) {
    console.error("[getSolarSpecialistAvailability]", error);
    return failure("Failed to retrieve specialist availability");
  }
}

export async function getSolarInstallers(
  data?: z.input<typeof installerDirectorySchema>,
) {
  const parsed = installerDirectorySchema.safeParse(data ?? {});
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const matches = await fetchSolarAvailabilityMatches(parsed.data);
    const search = parsed.data.search?.trim().toLowerCase();

    const filtered = search
      ? matches.filter((item) => {
          const haystack = [
            item.name ?? "",
            item.location ?? "",
            ...(item.specializations || []),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(search);
        })
      : matches;

    return {
      success: true as const,
      specialists: filtered,
    };
  } catch (error) {
    console.error("[getSolarInstallers]", error);
    return failure("Failed to retrieve installers");
  }
}

// ============ PROJECT MANAGEMENT ============

export async function requestSolarQuote(
  data: z.input<typeof quoteRequestSchema>,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  const parsed = quoteRequestSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const context = await resolveSolarPricingContext();
    if (!context.success) {
      return context;
    }

    const [selectedSpecialist, template] = await Promise.all([
      parsed.data.selectedSpecialistId
        ? prisma.verticalSpecialist.findFirst({
            where: {
              id: parsed.data.selectedSpecialistId,
              verticalId: context.vertical.id,
              isVerified: true,
            },
            select: {
              id: true,
              userId: true,
              experienceYears: true,
            },
          })
        : Promise.resolve(null),
      parsed.data.templateId
        ? prisma.projectTemplate.findFirst({
            where: {
              id: parsed.data.templateId,
              verticalId: context.vertical.id,
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              phases: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (parsed.data.selectedSpecialistId && !selectedSpecialist) {
      return failure("Selected specialist is not available for solar projects");
    }

    if (parsed.data.templateId && !template) {
      return failure("Selected project template is not available");
    }

    const estimateInput: SolarEstimationInput = {
      monthlyBill: parsed.data.monthlyBill,
      propertyType: parsed.data.propertyType,
      roofType: parsed.data.roofType,
      roofArea: parsed.data.roofArea,
      panelType: parsed.data.panelType,
      wantsBattery: parsed.data.wantsBattery,
      batteryType: parsed.data.batteryType,
      backupHours: parsed.data.backupHours,
      isOffGrid: parsed.data.isOffGrid,
      county: parsed.data.county,
    };

    const estimate = estimateSolarSystem(estimateInput, context.pricing);
    const suggestedDepositAmount = roundCurrency(
      Math.max(1000, estimate.totalCost * 0.3),
    );

    const history = [
      buildStatusHistoryEntry(
        null,
        "QUOTE_REQUESTED",
        session.user.id,
        hasRole(session.user, "ADMIN") ? "ADMIN" : "CLIENT",
        "Quote requested",
      ),
    ];

    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.verticalProject.create({
        data: {
          verticalId: context.vertical.id,
          templateId: template?.id,
          clientId: session.user.id,
          providerId: selectedSpecialist?.userId ?? null,
          assignedAt: selectedSpecialist ? new Date() : null,
          title: parsed.data.title,
          description: parsed.data.description,
          status: "QUOTE_REQUESTED",
          siteAddress: parsed.data.siteAddress,
          siteCoordinates: parsed.data.siteCoordinates
            ? (parsed.data.siteCoordinates as Prisma.InputJsonValue)
            : undefined,
          county: parsed.data.county,
          propertyType: parsed.data.propertyType,
          roofType: parsed.data.roofType,
          roofArea: parsed.data.roofArea,
          monthlyBill: parsed.data.monthlyBill,
          systemSize: estimate.recommendedSystemKw,
          panelCount: estimate.panelCount,
          panelType: parsed.data.panelType,
          batteryType: parsed.data.wantsBattery
            ? (parsed.data.batteryType ?? null)
            : null,
          backupHours: parsed.data.wantsBattery
            ? (parsed.data.backupHours ?? (parsed.data.isOffGrid ? 48 : 8))
            : null,
          batteryCapacity: estimate.batteryCapacityKwh,
          isOffGrid: parsed.data.isOffGrid,
          quotedAmount: estimate.totalCost,
          depositAmount: suggestedDepositAmount,
          photos: [],
          estimateInput: estimateInput as unknown as Prisma.InputJsonValue,
          estimationConfigSnapshot:
            context.configSnapshot as Prisma.InputJsonValue,
          statusHistory: history as Prisma.InputJsonValue,
        },
      });

      await tx.projectMilestone.create({
        data: {
          projectId: createdProject.id,
          name: STATUS_MILESTONE_LABELS.QUOTE_REQUESTED,
          description: "Initial client quote request submitted",
          sequence: 0,
          isCompleted: true,
          completedAt: new Date(),
          completedBy: session.user.id,
          photos: [],
        },
      });

      const templateMilestones = extractTemplateMilestones(template?.phases);
      if (templateMilestones.length > 0) {
        await tx.projectMilestone.createMany({
          data: templateMilestones.map((milestone) => ({
            projectId: createdProject.id,
            name: milestone.name,
            description: milestone.description,
            sequence: milestone.sequence,
            checklistItems: milestone.checklistItems,
            photos: [],
          })),
        });
      }

      return createdProject;
    });

    revalidateSolarPublicPaths();
    revalidateSolarDashboardPaths(project.id);

    return {
      success: true as const,
      project,
      estimate,
    };
  } catch (error) {
    console.error("[requestSolarQuote]", error);
    return failure("Failed to request solar quote");
  }
}

export async function assignSolarProjectProvider(
  data: z.input<typeof assignProviderSchema>,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  const parsed = assignProviderSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const project = await prisma.verticalProject.findFirst({
      where: {
        id: parsed.data.projectId,
        vertical: { type: SOLAR_VERTICAL_TYPE },
      },
      select: {
        id: true,
        clientId: true,
        providerId: true,
        status: true,
        statusHistory: true,
      },
    });

    if (!project) {
      return failure("Solar project not found");
    }

    const isAdmin = hasRole(session.user, "ADMIN");
    const isClient = project.clientId === session.user.id;

    if (!isAdmin && !isClient) {
      return failure(
        "Only the project client or admin can assign a specialist",
      );
    }

    if (["COMPLETED", "CANCELLED"].includes(project.status)) {
      return failure(
        "Cannot reassign specialist for completed or cancelled projects",
      );
    }

    const specialist = await prisma.verticalSpecialist.findFirst({
      where: {
        id: parsed.data.specialistId,
        vertical: { type: SOLAR_VERTICAL_TYPE },
        isVerified: true,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!specialist) {
      return failure("Selected specialist is not eligible for assignment");
    }

    const actorRole = isAdmin ? "ADMIN" : "CLIENT";
    const nextStatusHistory = [
      ...parseStatusHistory(project.statusHistory),
      buildStatusHistoryEntry(
        project.status,
        project.status,
        session.user.id,
        actorRole,
        "Specialist assigned",
      ),
    ];

    const updated = await prisma.verticalProject.update({
      where: { id: project.id },
      data: {
        providerId: specialist.userId,
        assignedAt: new Date(),
        statusHistory: nextStatusHistory as Prisma.InputJsonValue,
      },
    });

    revalidateSolarDashboardPaths(updated.id);
    revalidateSolarPublicPaths();

    return { success: true as const, project: updated };
  } catch (error) {
    console.error("[assignSolarProjectProvider]", error);
    return failure("Failed to assign specialist");
  }
}

export async function getMySolarProjects() {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  try {
    const projects = await prisma.verticalProject.findMany({
      where: {
        vertical: { type: SOLAR_VERTICAL_TYPE },
        OR: [{ clientId: session.user.id }, { providerId: session.user.id }],
      },
      include: {
        vertical: { select: { id: true, name: true, type: true } },
        client: { select: { id: true, name: true, image: true } },
        provider: { select: { id: true, name: true, image: true } },
        booking: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            payment: {
              select: {
                status: true,
                amount: true,
                method: true,
              },
            },
            invoice: {
              select: {
                id: true,
                number: true,
                status: true,
                totalAmount: true,
              },
            },
          },
        },
        milestones: { orderBy: { sequence: "asc" } },
        template: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true as const, projects };
  } catch (error) {
    console.error("[getMySolarProjects]", error);
    return failure("Failed to get projects");
  }
}

export async function getSolarProjectById(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  const parsed = idSchema.safeParse(projectId);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const project = await prisma.verticalProject.findFirst({
      where: {
        id: parsed.data,
        vertical: { type: SOLAR_VERTICAL_TYPE },
      },
      include: {
        vertical: { select: { id: true, name: true, type: true } },
        client: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            email: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            email: true,
          },
        },
        booking: {
          select: {
            id: true,
            status: true,
            date: true,
            totalAmount: true,
            payment: {
              select: {
                id: true,
                status: true,
                method: true,
                amount: true,
              },
            },
            invoice: {
              select: {
                id: true,
                number: true,
                status: true,
                totalAmount: true,
              },
            },
          },
        },
        milestones: { orderBy: { sequence: "asc" } },
        template: true,
      },
    });

    if (!project) {
      return failure("Solar project not found");
    }

    const isAdmin = hasRole(session.user, "ADMIN");
    const isOwner = project.clientId === session.user.id;
    const isProvider = project.providerId === session.user.id;

    if (!isAdmin && !isOwner && !isProvider) {
      return failure("Forbidden");
    }

    return { success: true as const, project };
  } catch (error) {
    console.error("[getSolarProjectById]", error);
    return failure("Failed to load project");
  }
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus,
  notes?: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  const parsed = updateStatusSchema.safeParse({ projectId, status, notes });
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const project = await prisma.verticalProject.findFirst({
      where: {
        id: parsed.data.projectId,
        vertical: { type: SOLAR_VERTICAL_TYPE },
      },
      select: {
        id: true,
        clientId: true,
        providerId: true,
        bookingId: true,
        title: true,
        siteAddress: true,
        quotedAmount: true,
        agreedAmount: true,
        depositAmount: true,
        status: true,
        statusHistory: true,
        warrantyYears: true,
      },
    });

    if (!project) {
      return failure("Solar project not found");
    }

    const isAdmin = hasRole(session.user, "ADMIN");
    const isClient = project.clientId === session.user.id;
    const isAssignedProvider =
      project.providerId != null && project.providerId === session.user.id;

    if (!isAdmin && !isClient && !isAssignedProvider) {
      return failure("Forbidden");
    }

    if (project.status === parsed.data.status) {
      const unchanged = await prisma.verticalProject.findUnique({
        where: { id: project.id },
      });
      return { success: true as const, project: unchanged };
    }

    if (!isAdmin) {
      const allowedTransitions = STATUS_TRANSITIONS[project.status] ?? [];
      if (!allowedTransitions.includes(parsed.data.status)) {
        return failure(
          `Invalid status transition from ${project.status} to ${parsed.data.status}`,
        );
      }

      if (CLIENT_DRIVEN_STATUSES.has(parsed.data.status) && !isClient) {
        return failure("Only the client can set this status");
      }

      if (
        PROVIDER_DRIVEN_STATUSES.has(parsed.data.status) &&
        !isAssignedProvider
      ) {
        return failure("Only the assigned specialist can set this status");
      }
    }

    if (parsed.data.status !== "CANCELLED" && !project.providerId && !isAdmin) {
      return failure(
        "Assign a specialist before moving the project past quote-request stage",
      );
    }

    if (parsed.data.status === "APPROVED" && !project.providerId) {
      return failure("A specialist must be assigned before client approval");
    }

    const actorRole = getActorRole(project, session.user.id, isAdmin);
    const nextHistory = [
      ...parseStatusHistory(project.statusHistory),
      buildStatusHistoryEntry(
        project.status,
        parsed.data.status,
        session.user.id,
        actorRole,
        parsed.data.notes,
      ),
    ];

    const updated = await prisma.$transaction(async (tx) => {
      let updatedProject = await tx.verticalProject.update({
        where: { id: project.id },
        data: {
          status: parsed.data.status,
          statusHistory: nextHistory as Prisma.InputJsonValue,
          ...statusDateUpdateFields(parsed.data.status, project.warrantyYears),
        },
      });

      await upsertStatusMilestone(
        tx,
        project.id,
        parsed.data.status,
        session.user.id,
        parsed.data.notes,
      );

      if (parsed.data.status === "APPROVED") {
        updatedProject = await ensureSolarBookingFinancialArtifacts(
          tx,
          {
            id: updatedProject.id,
            title: updatedProject.title,
            siteAddress: updatedProject.siteAddress,
            clientId: updatedProject.clientId,
            providerId: updatedProject.providerId,
            bookingId: updatedProject.bookingId,
            quotedAmount: updatedProject.quotedAmount,
            agreedAmount: updatedProject.agreedAmount,
            depositAmount: updatedProject.depositAmount,
          },
          session.user.id,
          actorRole,
        );
      }

      if (parsed.data.status === "COMPLETED" && updatedProject.providerId) {
        await refreshSolarSpecialistMetrics(tx, updatedProject.providerId);
      }

      return updatedProject;
    });

    revalidateSolarDashboardPaths(updated.id);
    if (updated.bookingId) {
      revalidatePath(`/bookings/${updated.bookingId}/invoice`);
    }

    return { success: true as const, project: updated };
  } catch (error) {
    console.error("[updateProjectStatus]", error);
    return failure("Failed to update project status");
  }
}

export async function addProjectMilestone(
  data: z.input<typeof projectMilestoneSchema>,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  const parsed = projectMilestoneSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const project = await prisma.verticalProject.findFirst({
      where: {
        id: parsed.data.projectId,
        vertical: { type: SOLAR_VERTICAL_TYPE },
      },
      select: { id: true, clientId: true, providerId: true },
    });

    if (!project) {
      return failure("Solar project not found");
    }

    const isAdmin = hasRole(session.user, "ADMIN");
    const isAssignedProvider =
      project.providerId != null && project.providerId === session.user.id;

    if (!isAdmin && !isAssignedProvider) {
      return failure("Only assigned specialist or admin can add milestones");
    }

    const latest = await prisma.projectMilestone.findFirst({
      where: { projectId: project.id },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: project.id,
        name: parsed.data.name,
        description: parsed.data.description,
        sequence: (latest?.sequence ?? -1) + 1,
        paymentRequired: parsed.data.paymentRequired,
        paymentAmount: parsed.data.paymentAmount,
        checklistItems: parsed.data.checklistItems.map((task) => ({
          task,
          completed: false,
        })) as Prisma.InputJsonValue,
        photos: [],
      },
    });

    revalidateSolarDashboardPaths(project.id);

    return { success: true as const, milestone };
  } catch (error) {
    console.error("[addProjectMilestone]", error);
    return failure("Failed to add milestone");
  }
}

export async function completeProjectMilestone(
  data: z.input<typeof completeMilestoneSchema>,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  const parsed = completeMilestoneSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const milestone = await prisma.projectMilestone.findUnique({
      where: { id: parsed.data.milestoneId },
      include: {
        project: {
          select: {
            id: true,
            clientId: true,
            providerId: true,
            vertical: { select: { type: true } },
          },
        },
      },
    });

    if (!milestone || milestone.project.vertical.type !== SOLAR_VERTICAL_TYPE) {
      return failure("Solar milestone not found");
    }

    const isAdmin = hasRole(session.user, "ADMIN");
    const isAssignedProvider =
      milestone.project.providerId != null &&
      milestone.project.providerId === session.user.id;

    if (!isAdmin && !isAssignedProvider) {
      return failure(
        "Only assigned specialist or admin can complete milestones",
      );
    }

    const updated = await prisma.projectMilestone.update({
      where: { id: milestone.id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: session.user.id,
        ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
      },
    });

    revalidateSolarDashboardPaths(milestone.project.id);

    return { success: true as const, milestone: updated };
  } catch (error) {
    console.error("[completeProjectMilestone]", error);
    return failure("Failed to complete milestone");
  }
}

// ============ TEMPLATE MANAGEMENT ============

export async function getSolarTemplates(options?: {
  includeInactive?: boolean;
}) {
  const includeInactive = Boolean(options?.includeInactive);
  const session = await auth();

  if (includeInactive) {
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return failure("Only admins can list inactive templates");
    }
  }

  try {
    const templates = await prisma.projectTemplate.findMany({
      where: {
        vertical: { type: SOLAR_VERTICAL_TYPE },
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    });

    return { success: true as const, templates };
  } catch (error) {
    console.error("[getSolarTemplates]", error);
    return failure("Failed to load project templates");
  }
}

export async function createSolarTemplate(
  data: z.input<typeof templateSchema>,
) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return failure("Only admins can create project templates");
  }

  const parsed = templateSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  if (parsed.data.basePriceMax < parsed.data.basePriceMin) {
    return failure(
      "Base price max must be greater than or equal to base price min",
    );
  }

  if (parsed.data.teamSizeMax < parsed.data.teamSizeMin) {
    return failure(
      "Team size max must be greater than or equal to team size min",
    );
  }

  try {
    const vertical = await prisma.verticalCategory.findUnique({
      where: { type: SOLAR_VERTICAL_TYPE },
      select: { id: true },
    });

    if (!vertical) {
      return failure(
        "Solar vertical is not configured yet. Ask an admin to run solar bootstrap.",
      );
    }

    const template = await prisma.projectTemplate.create({
      data: {
        verticalId: vertical.id,
        name: parsed.data.name,
        description: parsed.data.description,
        basePriceMin: parsed.data.basePriceMin,
        basePriceMax: parsed.data.basePriceMax,
        estimatedDays: parsed.data.estimatedDays,
        teamSizeMin: parsed.data.teamSizeMin,
        teamSizeMax: parsed.data.teamSizeMax,
        phases: parsed.data.phases as Prisma.InputJsonValue,
        requiredEquipment: normalizeStringArray(parsed.data.requiredEquipment),
        requiredCertifications: normalizeStringArray(
          parsed.data.requiredCertifications,
        ),
        materialsTemplate: parsed.data.materialsTemplate
          ? (parsed.data.materialsTemplate as Prisma.InputJsonValue)
          : undefined,
        isActive: parsed.data.isActive,
      },
    });

    revalidateSolarDashboardPaths();

    return { success: true as const, template };
  } catch (error) {
    console.error("[createSolarTemplate]", error);
    return failure("Failed to create template");
  }
}

export async function updateSolarTemplate(
  data: z.input<typeof updateTemplateSchema>,
) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return failure("Only admins can update project templates");
  }

  const parsed = updateTemplateSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  if (parsed.data.basePriceMax < parsed.data.basePriceMin) {
    return failure(
      "Base price max must be greater than or equal to base price min",
    );
  }

  if (parsed.data.teamSizeMax < parsed.data.teamSizeMin) {
    return failure(
      "Team size max must be greater than or equal to team size min",
    );
  }

  try {
    const template = await prisma.projectTemplate.update({
      where: { id: parsed.data.templateId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        basePriceMin: parsed.data.basePriceMin,
        basePriceMax: parsed.data.basePriceMax,
        estimatedDays: parsed.data.estimatedDays,
        teamSizeMin: parsed.data.teamSizeMin,
        teamSizeMax: parsed.data.teamSizeMax,
        phases: parsed.data.phases as Prisma.InputJsonValue,
        requiredEquipment: normalizeStringArray(parsed.data.requiredEquipment),
        requiredCertifications: normalizeStringArray(
          parsed.data.requiredCertifications,
        ),
        materialsTemplate: parsed.data.materialsTemplate
          ? (parsed.data.materialsTemplate as Prisma.InputJsonValue)
          : undefined,
        isActive: parsed.data.isActive,
      },
    });

    revalidateSolarDashboardPaths();

    return { success: true as const, template };
  } catch (error) {
    console.error("[updateSolarTemplate]", error);
    return failure("Failed to update template");
  }
}

export async function deleteSolarTemplate(templateId: string) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return failure("Only admins can delete templates");
  }

  const parsed = idSchema.safeParse(templateId);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    await prisma.projectTemplate.delete({ where: { id: parsed.data } });

    revalidateSolarDashboardPaths();

    return { success: true as const };
  } catch (error) {
    console.error("[deleteSolarTemplate]", error);
    return failure("Failed to delete template");
  }
}

// ============ EQUIPMENT REGISTRY ============

export async function getMyEquipmentRegistry() {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  if (!hasRole(session.user, "PROVIDER")) {
    return failure("Only providers can access equipment registry");
  }

  try {
    const equipment = await prisma.equipmentRegistry.findMany({
      where: { userId: session.user.id },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return { success: true as const, equipment };
  } catch (error) {
    console.error("[getMyEquipmentRegistry]", error);
    return failure("Failed to load equipment registry");
  }
}

export async function upsertEquipmentItem(
  data: z.input<typeof equipmentSchema>,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  if (!hasRole(session.user, "PROVIDER")) {
    return failure("Only providers can manage equipment registry");
  }

  const parsed = equipmentSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    if (parsed.data.id) {
      const existing = await prisma.equipmentRegistry.findFirst({
        where: {
          id: parsed.data.id,
          userId: session.user.id,
        },
        select: { id: true },
      });

      if (!existing) {
        return failure("Equipment item not found");
      }

      const equipment = await prisma.equipmentRegistry.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          category: parsed.data.category,
          brand: parsed.data.brand,
          model: parsed.data.model,
          serialNumber: parsed.data.serialNumber,
          condition: parsed.data.condition,
          quantity: parsed.data.quantity,
          location: parsed.data.location,
          purchasePrice: parsed.data.purchasePrice,
          currentValue: parsed.data.currentValue,
          purchaseDate: parsed.data.purchaseDate,
          lastServiceDate: parsed.data.lastServiceDate,
          nextServiceDue: parsed.data.nextServiceDue,
        },
      });

      revalidateSolarDashboardPaths();

      return { success: true as const, equipment };
    }

    const equipment = await prisma.equipmentRegistry.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        category: parsed.data.category,
        brand: parsed.data.brand,
        model: parsed.data.model,
        serialNumber: parsed.data.serialNumber,
        condition: parsed.data.condition,
        quantity: parsed.data.quantity,
        location: parsed.data.location,
        purchasePrice: parsed.data.purchasePrice,
        currentValue: parsed.data.currentValue,
        purchaseDate: parsed.data.purchaseDate,
        lastServiceDate: parsed.data.lastServiceDate,
        nextServiceDue: parsed.data.nextServiceDue,
      },
    });

    revalidateSolarDashboardPaths();

    return { success: true as const, equipment };
  } catch (error) {
    console.error("[upsertEquipmentItem]", error);
    return failure("Failed to save equipment item");
  }
}

export async function deleteEquipmentItem(
  data: z.input<typeof deleteEquipmentSchema>,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return failure("Unauthorized");
  }

  if (!hasRole(session.user, "PROVIDER")) {
    return failure("Only providers can manage equipment registry");
  }

  const parsed = deleteEquipmentSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const deleted = await prisma.equipmentRegistry.deleteMany({
      where: {
        id: parsed.data.id,
        userId: session.user.id,
      },
    });

    if (deleted.count === 0) {
      return failure("Equipment item not found");
    }

    revalidateSolarDashboardPaths();

    return { success: true as const };
  } catch (error) {
    console.error("[deleteEquipmentItem]", error);
    return failure("Failed to delete equipment item");
  }
}
