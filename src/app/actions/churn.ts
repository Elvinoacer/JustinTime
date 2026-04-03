"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ChurnRiskLevel } from "@/generated/prisma/client";
import {
  calculateChurnScore,
  analyzeAllUsers,
} from "@/lib/churn/churn-predictor";
import { triggerReEngagement } from "@/lib/churn/re-engagement";
import { revalidatePath } from "next/cache";
import { hasRole } from "@/lib/auth/roles";

/**
 * Get all at-risk users (optional filter by risk level)
 */
export async function getAtRiskUsers(riskLevel?: ChurnRiskLevel) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const where = riskLevel
      ? { riskLevel }
      : { riskLevel: { not: ChurnRiskLevel.LOW } };

    const scores = await prisma.churnScore.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: { hourlyRate: true },
            },
          },
        },
        interventions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ score: "desc" }, { calculatedAt: "desc" }],
      take: 100,
    });

    return {
      success: true,
      users: scores,
    };
  } catch (error) {
    console.error("[getAtRiskUsers]", error);
    return { success: false, error: "Failed to fetch at-risk users" };
  }
}

/**
 * Get churn score for a specific user
 */
export async function getUserChurnScore(userId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Admin or own data
  if (!hasRole(session.user, "ADMIN") && session.user.id !== userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const latestScore = await prisma.churnScore.findFirst({
      where: { userId },
      orderBy: { calculatedAt: "desc" },
      include: {
        interventions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return {
      success: true,
      score: latestScore,
    };
  } catch (error) {
    console.error("[getUserChurnScore]", error);
    return { success: false, error: "Failed to fetch churn score" };
  }
}

/**
 * Trigger churn analysis for all users or specific user
 */
export async function triggerChurnAnalysis(userId?: string) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    if (userId) {
      // Analyze specific user
      const prediction = await calculateChurnScore(userId);

      await prisma.churnScore.create({
        data: {
          userId,
          riskLevel: prediction.riskLevel,
          score: prediction.score,
          factors: prediction.factors as any,
          lastActivityDays: prediction.lastActivityDays,
          bookingDecline: prediction.bookingDecline,
          engagementScore: prediction.engagementScore,
        },
      });

      revalidatePath("/admin/churn-analysis");

      return {
        success: true,
        prediction,
      };
    } else {
      // Analyze all users
      const results = await analyzeAllUsers();
      revalidatePath("/admin/churn-analysis");

      return {
        success: true,
        results,
      };
    }
  } catch (error) {
    console.error("[triggerChurnAnalysis]", error);
    return { success: false, error: "Failed to trigger analysis" };
  }
}

/**
 * Create manual intervention for user
 */
export async function createManualIntervention(
  userId: string,
  type: string,
  message: string,
) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    // Get latest churn score
    const latestScore = await prisma.churnScore.findFirst({
      where: { userId },
      orderBy: { calculatedAt: "desc" },
    });

    if (!latestScore) {
      return { success: false, error: "No churn score found for this user" };
    }

    // Create intervention
    const intervention = await prisma.churnIntervention.create({
      data: {
        churnScoreId: latestScore.id,
        userId,
        type,
        message,
        executed: true,
        executedAt: new Date(),
        successful: true,
      },
    });

    revalidatePath("/admin/churn-analysis");

    return {
      success: true,
      intervention,
    };
  } catch (error) {
    console.error("[createManualIntervention]", error);
    return { success: false, error: "Failed to create intervention" };
  }
}

/**
 * Trigger re-engagement for specific user
 */
export async function triggerUserReEngagement(userId: string) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const latestScore = await prisma.churnScore.findFirst({
      where: { userId },
      orderBy: { calculatedAt: "desc" },
    });

    if (!latestScore) {
      return { success: false, error: "No churn score found" };
    }

    const result = await triggerReEngagement(
      userId,
      latestScore.id,
      latestScore.riskLevel,
    );
    revalidatePath("/admin/churn-analysis");

    return {
      success: result.success,
      interventionId: result.interventionId,
    };
  } catch (error) {
    console.error("[triggerUserReEngagement]", error);
    return { success: false, error: "Failed to trigger re-engagement" };
  }
}

/**
 * Get intervention statistics
 */
export async function getInterventionStats() {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const [total, successful, executed] = await Promise.all([
      prisma.churnIntervention.count(),
      prisma.churnIntervention.count({ where: { successful: true } }),
      prisma.churnIntervention.count({ where: { executed: true } }),
    ]);

    const successRate = executed > 0 ? (successful / executed) * 100 : 0;

    return {
      success: true,
      stats: {
        total,
        executed,
        successful,
        successRate: Math.round(successRate),
      },
    };
  } catch (error) {
    console.error("[getInterventionStats]", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}
