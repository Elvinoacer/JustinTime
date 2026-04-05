"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  ChurnInterventionChannel,
  ChurnInterventionOutcome,
  ChurnInterventionStatus,
  ChurnRiskLevel,
  UserRole,
} from "@/generated/prisma/client";
import {
  analyzeUsersForChurn,
  calculateChurnScore,
  saveChurnScoreSnapshot,
} from "@/lib/churn/churn-predictor";
import { triggerReEngagement } from "@/lib/churn/re-engagement";
import { revalidatePath } from "next/cache";
import { hasRole } from "@/lib/auth/roles";

interface AtRiskUsersFilters {
  riskLevel?: ChurnRiskLevel;
  search?: string;
  interventionStatus?: ChurnInterventionStatus | "NONE";
  onlyNotContacted?: boolean;
  contactedWithinDays?: number;
  scoreAgeDays?: number;
  page?: number;
  pageSize?: number;
}

export interface AtRiskUserRow {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: UserRole;
    roles: UserRole[];
    hourlyRate: number | null;
  };
  latestScore: {
    id: string;
    riskLevel: ChurnRiskLevel;
    score: number;
    calculatedAt: Date;
    lastActivityDays: number;
    bookingDecline: number | null;
    engagementScore: number | null;
    factors: any;
  };
  scoreHistory: Array<{
    id: string;
    riskLevel: ChurnRiskLevel;
    score: number;
    calculatedAt: Date;
  }>;
  lastIntervention: {
    id: string;
    type: string;
    channel: ChurnInterventionChannel | null;
    status: ChurnInterventionStatus;
    outcome: ChurnInterventionOutcome | null;
    createdAt: Date;
    executed: boolean;
    successful: boolean | null;
  } | null;
  interventionHistory: Array<{
    id: string;
    type: string;
    channel: ChurnInterventionChannel | null;
    status: ChurnInterventionStatus;
    outcome: ChurnInterventionOutcome | null;
    createdAt: Date;
    executed: boolean;
    successful: boolean | null;
  }>;
  interventionCount: number;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return null;
  }
  return session;
}

/**
 * Get at-risk users with latest score per user and user-level intervention context.
 */
export async function getAtRiskUsers(filters: AtRiskUsersFilters = {}) {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));

    const [totalScores, usersWithScores] = await Promise.all([
      prisma.churnScore.count(),
      prisma.user.findMany({
        where: {
          churnScores: {
            some: {},
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          roles: true,
          profile: {
            select: {
              hourlyRate: true,
            },
          },
          churnScores: {
            orderBy: { calculatedAt: "desc" },
            take: 5,
            select: {
              id: true,
              riskLevel: true,
              score: true,
              calculatedAt: true,
              lastActivityDays: true,
              bookingDecline: true,
              engagementScore: true,
              factors: true,
            },
          },
          churnInterventions: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              type: true,
              channel: true,
              status: true,
              outcome: true,
              createdAt: true,
              executed: true,
              successful: true,
            },
          },
          _count: {
            select: {
              churnInterventions: true,
            },
          },
        },
      }),
    ]);

    const rows = usersWithScores
      .map((user) => {
        const latestScore = user.churnScores[0];
        if (!latestScore) {
          return null;
        }

        return {
          userId: user.id,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            roles: user.roles,
            hourlyRate: user.profile?.hourlyRate
              ? Number(user.profile.hourlyRate)
              : null,
          },
          latestScore: {
            ...latestScore,
            score: Number(latestScore.score),
            bookingDecline:
              latestScore.bookingDecline != null
                ? Number(latestScore.bookingDecline)
                : null,
            engagementScore:
              latestScore.engagementScore != null
                ? Number(latestScore.engagementScore)
                : null,
            factors: latestScore.factors,
          },
          scoreHistory: user.churnScores.map((score) => ({
            id: score.id,
            riskLevel: score.riskLevel,
            score: Number(score.score),
            calculatedAt: score.calculatedAt,
          })),
          lastIntervention: user.churnInterventions[0] || null,
          interventionHistory: user.churnInterventions,
          interventionCount: user._count.churnInterventions,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const hasAnyLatestAtRisk = rows.some(
      (row) => row.latestScore.riskLevel !== "LOW",
    );

    let filteredRows = rows.filter((row) => {
      if (filters.riskLevel) {
        return row.latestScore.riskLevel === filters.riskLevel;
      }
      return row.latestScore.riskLevel !== "LOW";
    });

    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      filteredRows = filteredRows.filter((row) => {
        return (
          row.user.name?.toLowerCase().includes(q) ||
          row.user.email?.toLowerCase().includes(q) ||
          row.userId.toLowerCase().includes(q)
        );
      });
    }

    if (filters.interventionStatus) {
      filteredRows = filteredRows.filter((row) => {
        if (filters.interventionStatus === "NONE") {
          return !row.lastIntervention;
        }
        return row.lastIntervention?.status === filters.interventionStatus;
      });
    }

    if (filters.onlyNotContacted) {
      filteredRows = filteredRows.filter((row) => !row.lastIntervention);
    }

    if (filters.contactedWithinDays && filters.contactedWithinDays > 0) {
      const threshold =
        Date.now() - filters.contactedWithinDays * 24 * 60 * 60 * 1000;
      filteredRows = filteredRows.filter((row) => {
        if (!row.lastIntervention) {
          return false;
        }
        return row.lastIntervention.createdAt.getTime() >= threshold;
      });
    }

    if (filters.scoreAgeDays && filters.scoreAgeDays > 0) {
      const threshold = Date.now() - filters.scoreAgeDays * 24 * 60 * 60 * 1000;
      filteredRows = filteredRows.filter(
        (row) => row.latestScore.calculatedAt.getTime() >= threshold,
      );
    }

    filteredRows.sort((a, b) => {
      if (b.latestScore.score !== a.latestScore.score) {
        return b.latestScore.score - a.latestScore.score;
      }
      return (
        b.latestScore.calculatedAt.getTime() -
        a.latestScore.calculatedAt.getTime()
      );
    });

    const totalFiltered = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const start = (normalizedPage - 1) * pageSize;
    const users = filteredRows.slice(start, start + pageSize);

    return {
      success: true,
      users,
      meta: {
        page: normalizedPage,
        pageSize,
        totalFiltered,
        totalPages,
        hasAnyScores: totalScores > 0,
        hasAnyLatestAtRisk,
      },
    };
  } catch (error) {
    console.error("[getAtRiskUsers]", error);
    return { success: false, error: "Failed to fetch at-risk users" };
  }
}

/**
 * Get churn score and intervention history for a specific user.
 */
export async function getUserChurnScore(userId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!hasRole(session.user, "ADMIN") && session.user.id !== userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [latestScore, scoreHistory, interventions] = await Promise.all([
      prisma.churnScore.findFirst({
        where: { userId, isCurrent: true },
        orderBy: { calculatedAt: "desc" },
      }),
      prisma.churnScore.findMany({
        where: { userId },
        orderBy: { calculatedAt: "desc" },
        take: 20,
      }),
      prisma.churnIntervention.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return {
      success: true,
      score: latestScore,
      scoreHistory,
      interventions,
    };
  } catch (error) {
    console.error("[getUserChurnScore]", error);
    return { success: false, error: "Failed to fetch churn score" };
  }
}

/**
 * Trigger churn analysis for all users or a single user.
 */
export async function triggerChurnAnalysis(userId?: string) {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    if (userId) {
      const prediction = await calculateChurnScore(userId);
      await saveChurnScoreSnapshot(userId, prediction);

      revalidatePath("/admin/churn-analysis");

      return {
        success: true,
        prediction,
      };
    }

    const results = await analyzeUsersForChurn({
      scope: "ALL_USERS",
      batchSize: 25,
    });
    revalidatePath("/admin/churn-analysis");

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error("[triggerChurnAnalysis]", error);
    return { success: false, error: "Failed to trigger analysis" };
  }
}

/**
 * Create a manual intervention plan for a user.
 */
export async function createManualIntervention(input: {
  userId: string;
  type: string;
  message: string;
  channel?: ChurnInterventionChannel;
}) {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const latestScore = await prisma.churnScore.findFirst({
      where: { userId: input.userId, isCurrent: true },
      orderBy: { calculatedAt: "desc" },
    });

    if (!latestScore) {
      return { success: false, error: "No churn score found for this user" };
    }

    const intervention = await prisma.churnIntervention.create({
      data: {
        churnScoreId: latestScore.id,
        userId: input.userId,
        type: input.type,
        channel: input.channel ?? "MANUAL_OUTREACH",
        status: "DRAFT",
        message: input.message,
        executed: false,
        successful: null,
        deliveryOk: null,
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
 * Update intervention status/outcome after follow-up.
 */
export async function updateInterventionOutcome(input: {
  interventionId: string;
  status: ChurnInterventionStatus;
  outcome?: ChurnInterventionOutcome | null;
  response?: string | null;
}) {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const now = new Date();
    const intervention = await prisma.churnIntervention.update({
      where: { id: input.interventionId },
      data: {
        status: input.status,
        outcome: input.outcome ?? null,
        response: input.response ?? null,
        respondedAt: input.status === "RESPONDED" ? now : undefined,
        convertedAt: input.status === "CONVERTED" ? now : undefined,
        successful:
          input.status === "CONVERTED"
            ? true
            : input.status === "FAILED"
              ? false
              : undefined,
      },
    });

    revalidatePath("/admin/churn-analysis");

    return {
      success: true,
      intervention,
    };
  } catch (error) {
    console.error("[updateInterventionOutcome]", error);
    return { success: false, error: "Failed to update intervention" };
  }
}

/**
 * Trigger automated re-engagement for a specific user with cooldown enforcement.
 */
export async function triggerUserReEngagement(
  userId: string,
  options?: { force?: boolean; cooldownDays?: number },
) {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const latestScore = await prisma.churnScore.findFirst({
      where: { userId, isCurrent: true },
      orderBy: { calculatedAt: "desc" },
    });

    if (!latestScore) {
      return { success: false, error: "No churn score found" };
    }

    if (latestScore.riskLevel === "LOW") {
      return {
        success: false,
        error: "User is LOW risk and does not need re-engagement",
      };
    }

    const result = await triggerReEngagement(
      userId,
      latestScore.id,
      latestScore.riskLevel,
      options,
    );

    revalidatePath("/admin/churn-analysis");

    return {
      success: result.success,
      skipped: result.skipped,
      interventionId: result.interventionId,
      error: result.error,
    };
  } catch (error) {
    console.error("[triggerUserReEngagement]", error);
    return { success: false, error: "Failed to trigger re-engagement" };
  }
}

/**
 * Get user intervention history.
 */
export async function getUserInterventionHistory(userId: string, limit = 20) {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const interventions = await prisma.churnIntervention.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(100, Math.max(1, limit)),
    });

    return { success: true, interventions };
  } catch (error) {
    console.error("[getUserInterventionHistory]", error);
    return { success: false, error: "Failed to fetch intervention history" };
  }
}

/**
 * Get intervention statistics split by delivery and retention outcomes.
 */
export async function getInterventionStats() {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const [
      total,
      executed,
      deliverySuccessful,
      responses,
      converted,
      retained,
      reopened,
      booked,
      timedOutcomeRows,
    ] = await Promise.all([
      prisma.churnIntervention.count(),
      prisma.churnIntervention.count({ where: { executed: true } }),
      prisma.churnIntervention.count({ where: { deliveryOk: true } }),
      prisma.churnIntervention.count({
        where: {
          status: { in: ["RESPONDED", "CONVERTED"] },
        },
      }),
      prisma.churnIntervention.count({ where: { status: "CONVERTED" } }),
      prisma.churnIntervention.count({ where: { outcome: "RETAINED" } }),
      prisma.churnIntervention.count({ where: { outcome: "REOPENED" } }),
      prisma.churnIntervention.count({ where: { outcome: "BOOKED" } }),
      prisma.churnIntervention.findMany({
        where: {
          executed: true,
          OR: [
            { respondedAt: { not: null } },
            { convertedAt: { not: null } },
            { outcome: { in: ["REOPENED", "BOOKED", "RETAINED"] } },
          ],
        },
        select: {
          createdAt: true,
          respondedAt: true,
          convertedAt: true,
          outcome: true,
        },
      }),
    ]);

    const deliverySuccessRate =
      executed > 0 ? (deliverySuccessful / executed) * 100 : 0;
    const responseRate = executed > 0 ? (responses / executed) * 100 : 0;
    const conversionRate = executed > 0 ? (converted / executed) * 100 : 0;

    const reactivatedWithin7Days = timedOutcomeRows.filter((row) => {
      const reactivatedAt = row.respondedAt ?? row.convertedAt;
      if (!reactivatedAt) {
        return false;
      }
      const days =
        (reactivatedAt.getTime() - row.createdAt.getTime()) /
        (1000 * 60 * 60 * 24);
      return days <= 7;
    }).length;

    const bookedWithin14Days = timedOutcomeRows.filter((row) => {
      if (row.outcome !== "BOOKED") {
        return false;
      }
      const bookedAt = row.convertedAt ?? row.respondedAt;
      if (!bookedAt) {
        return false;
      }
      const days =
        (bookedAt.getTime() - row.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return days <= 14;
    }).length;

    const retainedWithin30Days = timedOutcomeRows.filter((row) => {
      if (row.outcome !== "RETAINED") {
        return false;
      }
      const retainedAt = row.convertedAt ?? row.respondedAt;
      if (!retainedAt) {
        return false;
      }
      const days =
        (retainedAt.getTime() - row.createdAt.getTime()) /
        (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;

    return {
      success: true,
      stats: {
        total,
        executed,
        deliverySuccessful,
        responses,
        converted,
        retained,
        reopened,
        booked,
        reactivatedWithin7Days,
        bookedWithin14Days,
        retainedWithin30Days,
        deliverySuccessRate: Math.round(deliverySuccessRate),
        responseRate: Math.round(responseRate),
        conversionRate: Math.round(conversionRate),
      },
    };
  } catch (error) {
    console.error("[getInterventionStats]", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}
