"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { estimateSolarSystem, quickEstimate, SolarEstimationInput } from "@/lib/solar/estimation-calculator";
import { VerticalType, ProjectStatus } from "@/generated/prisma/client";

// ============ SOLAR ESTIMATION ============

/**
 * Get quick solar estimate for marketing/landing page
 */
export async function getQuickSolarEstimate(monthlyBill: number) {
  try {
    const estimate = quickEstimate(monthlyBill);
    return { success: true, ...estimate };
  } catch (error) {
    console.error("[getQuickSolarEstimate]", error);
    return { success: false, error: "Failed to calculate estimate" };
  }
}

/**
 * Get detailed solar system estimate
 */
export async function getDetailedSolarEstimate(input: SolarEstimationInput) {
  try {
    const estimate = estimateSolarSystem(input);
    return { success: true, estimate };
  } catch (error) {
    console.error("[getDetailedSolarEstimate]", error);
    return { success: false, error: "Failed to calculate estimate" };
  }
}

// ============ VERTICAL MANAGEMENT ============

/**
 * Get all active verticals
 */
export async function getActiveVerticals() {
  try {
    const verticals = await prisma.verticalCategory.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { specialists: true, projects: true } }
      },
      orderBy: { name: 'asc' }
    });

    return { success: true, verticals };
  } catch (error) {
    console.error("[getActiveVerticals]", error);
    return { success: false, error: "Failed to get verticals" };
  }
}

/**
 * Get solar vertical details with specialists
 */
export async function getSolarVertical() {
  try {
    const vertical = await prisma.verticalCategory.findUnique({
      where: { type: 'SOLAR' },
      include: {
        specialists: {
          where: { isVerified: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                profile: { select: { location: true, hourlyRate: true } }
              }
            }
          },
          orderBy: { averageRating: 'desc' },
          take: 10
        },
        templates: {
          where: { isActive: true }
        },
        _count: { select: { specialists: true, projects: true } }
      }
    });

    return { success: true, vertical };
  } catch (error) {
    console.error("[getSolarVertical]", error);
    return { success: false, error: "Failed to get solar vertical" };
  }
}

// ============ SPECIALIST ONBOARDING ============

/**
 * Register as solar specialist
 */
export async function registerAsSolarSpecialist(data: {
  experienceYears: number;
  specializations: string[];
  equipmentOwned: string[];
  serviceRadius?: number;
  portfolioUrls?: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get or create SOLAR vertical
    let vertical = await prisma.verticalCategory.findUnique({
      where: { type: 'SOLAR' }
    });

    if (!vertical) {
      vertical = await prisma.verticalCategory.create({
        data: {
          type: 'SOLAR',
          name: 'Solar Installation',
          description: 'Solar panel installation and maintenance',
          icon: '☀️',
          requiresCertification: true,
          minExperienceYears: 2,
          insuranceRequired: true
        }
      });
    }

    // Create specialist profile
    const specialist = await prisma.verticalSpecialist.upsert({
      where: {
        verticalId_userId: {
          verticalId: vertical.id,
          userId: session.user.id
        }
      },
      update: {
        experienceYears: data.experienceYears,
        specializations: data.specializations,
        equipmentOwned: data.equipmentOwned,
        serviceRadius: data.serviceRadius,
        portfolioUrls: data.portfolioUrls || []
      },
      create: {
        verticalId: vertical.id,
        userId: session.user.id,
        experienceYears: data.experienceYears,
        specializations: data.specializations,
        equipmentOwned: data.equipmentOwned,
        serviceRadius: data.serviceRadius,
        portfolioUrls: data.portfolioUrls || []
      }
    });

    revalidatePath('/dashboard/solar');
    return { success: true, specialist };
  } catch (error) {
    console.error("[registerAsSolarSpecialist]", error);
    return { success: false, error: "Failed to register as specialist" };
  }
}

/**
 * Submit certification for verification
 */
export async function submitCertification(data: {
  name: string;
  issuingBody: string;
  licenseNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  documentUrl: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const vertical = await prisma.verticalCategory.findUnique({
      where: { type: 'SOLAR' }
    });

    if (!vertical) {
      return { success: false, error: "Solar vertical not found" };
    }

    const certification = await prisma.verticalCertification.create({
      data: {
        verticalId: vertical.id,
        userId: session.user.id,
        ...data,
        status: 'PENDING'
      }
    });

    revalidatePath('/dashboard/solar/certifications');
    return { success: true, certification };
  } catch (error) {
    console.error("[submitCertification]", error);
    return { success: false, error: "Failed to submit certification" };
  }
}

// ============ PROJECT MANAGEMENT ============

/**
 * Request a solar project quote
 */
export async function requestSolarQuote(data: {
  title: string;
  description?: string;
  siteAddress: string;
  propertyType: string;
  roofType: string;
  roofArea?: number;
  monthlyBill: number;
  wantsBattery: boolean;
  isOffGrid: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const vertical = await prisma.verticalCategory.findUnique({
      where: { type: 'SOLAR' }
    });

    if (!vertical) {
      return { success: false, error: "Solar vertical not found" };
    }

    // Get estimation
    const estimate = estimateSolarSystem({
      monthlyBill: data.monthlyBill,
      propertyType: data.propertyType as any,
      roofType: data.roofType as any,
      roofArea: data.roofArea,
      panelType: 'monocrystalline',
      wantsBattery: data.wantsBattery,
      batteryType: 'lithium',
      isOffGrid: data.isOffGrid
    });

    // Create project (provider will be assigned later)
    const project = await prisma.verticalProject.create({
      data: {
        verticalId: vertical.id,
        clientId: session.user.id,
        providerId: session.user.id, // Placeholder, will be updated when matched
        title: data.title,
        description: data.description,
        status: 'QUOTE_REQUESTED',
        siteAddress: data.siteAddress,
        propertyType: data.propertyType,
        roofType: data.roofType,
        roofArea: data.roofArea,
        monthlyBill: data.monthlyBill,
        systemSize: estimate.recommendedSystemKw,
        panelCount: estimate.panelCount,
        batteryCapacity: estimate.batteryCapacityKwh,
        isOffGrid: data.isOffGrid,
        quotedAmount: estimate.totalCost
      }
    });

    // Create initial milestone
    await prisma.projectMilestone.create({
      data: {
        projectId: project.id,
        name: 'Quote Request',
        sequence: 0,
        isCompleted: true,
        completedAt: new Date()
      }
    });

    revalidatePath('/dashboard/solar/projects');
    return { success: true, project, estimate };
  } catch (error) {
    console.error("[requestSolarQuote]", error);
    return { success: false, error: "Failed to request quote" };
  }
}

/**
 * Get user's solar projects
 */
export async function getMySolarProjects() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const projects = await prisma.verticalProject.findMany({
      where: {
        OR: [
          { clientId: session.user.id },
          { providerId: session.user.id }
        ]
      },
      include: {
        client: { select: { name: true, image: true } },
        provider: { select: { name: true, image: true } },
        milestones: { orderBy: { sequence: 'asc' } },
        template: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, projects };
  } catch (error) {
    console.error("[getMySolarProjects]", error);
    return { success: false, error: "Failed to get projects" };
  }
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus,
  notes?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const project = await prisma.verticalProject.update({
      where: { id: projectId },
      data: {
        status,
        ...(status === 'COMPLETED' && { completionDate: new Date() }),
        ...(status === 'APPROVED' && { approvalDate: new Date() }),
        ...(status === 'IN_PROGRESS' && { startDate: new Date() })
      }
    });

    revalidatePath('/dashboard/solar/projects');
    return { success: true, project };
  } catch (error) {
    console.error("[updateProjectStatus]", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Get featured solar specialists
 */
export async function getFeaturedSolarSpecialists(limit: number = 6) {
  try {
    const specialists = await prisma.verticalSpecialist.findMany({
      where: {
        vertical: { type: 'SOLAR' },
        isVerified: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: {
              select: { location: true, hourlyRate: true, bio: true }
            }
          }
        },
        vertical: { select: { name: true } }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { averageRating: 'desc' }
      ],
      take: limit
    });

    return { success: true, specialists };
  } catch (error) {
    console.error("[getFeaturedSolarSpecialists]", error);
    return { success: false, error: "Failed to get specialists" };
  }
}
