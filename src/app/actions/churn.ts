"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  ChurnInterventionChannel,
  ChurnInterventionOutcome,
  ChurnInterventionStatus,
  ChurnRiskLevel,
  Prisma,
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

    const searchQuery = filters.search?.trim();
    const scoreAgeThreshold =
      filters.scoreAgeDays && filters.scoreAgeDays > 0
        ? new Date(Date.now() - filters.scoreAgeDays * 24 * 60 * 60 * 1000)
        : null;
    const contactedThreshold =
      filters.contactedWithinDays && filters.contactedWithinDays > 0
        ? new Date(
            Date.now() - filters.contactedWithinDays * 24 * 60 * 60 * 1000,
          )
        : null;

    const whereClauses: Prisma.ChurnScoreWhereInput[] = [];

    whereClauses.push({
      riskLevel: filters.riskLevel
        ? filters.riskLevel
        : {
            not: "LOW",
          },
    });

    if (searchQuery) {
      whereClauses.push({
        user: {
          is: {
            OR: [
              {
                id: {
                  contains: searchQuery,
                },
              },
              {
                name: {
                  contains: searchQuery,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: searchQuery,
                  mode: "insensitive",
                },
              },
            ],
          },
        },
      });
    }

    if (scoreAgeThreshold) {
      whereClauses.push({
        calculatedAt: {
          gte: scoreAgeThreshold,
        },
      });
    }

    if (filters.interventionStatus === "NONE" || filters.onlyNotContacted) {
      whereClauses.push({
        user: {
          is: {
            churnInterventions: {
              none: {},
            },
          },
        },
      });
    } else if (filters.interventionStatus) {
      whereClauses.push({
        user: {
          is: {
            churnInterventions: {
              some: {
                status: filters.interventionStatus,
              },
            },
          },
        },
      });
    }

    if (contactedThreshold) {
      whereClauses.push({
        user: {
          is: {
            churnInterventions: {
              some: {
                createdAt: {
                  gte: contactedThreshold,
                },
              },
            },
          },
        },
      });
    }

    const where: Prisma.ChurnScoreWhereInput = {
      isCurrent: true,
      AND: whereClauses,
    };

    const [hasAnyScoresCount, hasAnyLatestAtRiskCount, totalFiltered] =
      await Promise.all([
        prisma.churnScore.count({
          where: {
            isCurrent: true,
          },
        }),
        prisma.churnScore.count({
          where: {
            isCurrent: true,
            riskLevel: {
              not: "LOW",
            },
          },
        }),
        prisma.churnScore.count({ where }),
      ]);

    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const normalizedPage = Math.min(page, totalPages);

    const scores = await prisma.churnScore.findMany({
      where,
      skip: (normalizedPage - 1) * pageSize,
      take: pageSize,
      orderBy: [{ score: "desc" }, { calculatedAt: "desc" }],
      select: {
        id: true,
        userId: true,
        riskLevel: true,
        score: true,
        calculatedAt: true,
        lastActivityDays: true,
        bookingDecline: true,
        engagementScore: true,
        factors: true,
        user: {
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
        },
      },
    });

    const users = scores.map((scoreRow) => ({
      userId: scoreRow.user.id,
      user: {
        id: scoreRow.user.id,
        name: scoreRow.user.name,
        email: scoreRow.user.email,
        image: scoreRow.user.image,
        role: scoreRow.user.role,
        roles: scoreRow.user.roles,
        hourlyRate: scoreRow.user.profile?.hourlyRate
          ? Number(scoreRow.user.profile.hourlyRate)
          : null,
      },
      latestScore: {
        id: scoreRow.id,
        riskLevel: scoreRow.riskLevel,
        score: Number(scoreRow.score),
        calculatedAt: scoreRow.calculatedAt,
        lastActivityDays: scoreRow.lastActivityDays,
        bookingDecline:
          scoreRow.bookingDecline != null
            ? Number(scoreRow.bookingDecline)
            : null,
        engagementScore:
          scoreRow.engagementScore != null
            ? Number(scoreRow.engagementScore)
            : null,
        factors: scoreRow.factors,
      },
      scoreHistory: scoreRow.user.churnScores.map((history) => ({
        id: history.id,
        riskLevel: history.riskLevel,
        score: Number(history.score),
        calculatedAt: history.calculatedAt,
      })),
      lastIntervention: scoreRow.user.churnInterventions[0] || null,
      interventionHistory: scoreRow.user.churnInterventions,
      interventionCount: scoreRow.user._count.churnInterventions,
    }));

    return {
      success: true,
      users,
      meta: {
        page: normalizedPage,
        pageSize,
        totalFiltered,
        totalPages,
        hasAnyScores: hasAnyScoresCount > 0,
        hasAnyLatestAtRisk: hasAnyLatestAtRiskCount > 0,
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

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendManualInterventionEmail(input: {
  email: string;
  name: string | null;
  message: string;
}) {
  const { sendEmail } = await import("@/lib/email");
  const recipientName = input.name?.trim() || "there";
  const safeMessage = escapeHtml(input.message).replaceAll("\n", "<br />");

  await sendEmail({
    to: input.email,
    subject: "A quick update from JustInTime",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h2 style="margin-bottom: 16px;">Hi ${escapeHtml(recipientName)},</h2>
        <div style="line-height: 1.6; font-size: 15px;">${safeMessage}</div>
      </div>
    `,
  });
}

async function sendManualInterventionPush(input: {
  userId: string;
  message: string;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: "JustInTime update",
      message: input.message.slice(0, 400),
      type: "CHURN_RE_ENGAGEMENT",
    },
  });
}

type ManualExecutionTriggerSource =
  | "create-dialog-execute-now"
  | "detail-panel-execute-now";

function appendExecutionAuditLog(params: {
  existingResponse: string | null;
  executedBy: string;
  triggerSource: ManualExecutionTriggerSource;
  executedAtIso: string;
}): string {
  const line = `[execution-audit] by=${params.executedBy} source=${params.triggerSource} at=${params.executedAtIso}`;
  const existing = params.existingResponse?.trim();
  return existing ? `${existing}\n${line}` : line;
}

/**
 * Execute a manual intervention draft immediately for EMAIL/PUSH channels.
 */
export async function executeManualInterventionDraft(input: {
  interventionId: string;
  triggerSource?: ManualExecutionTriggerSource;
}) {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  const executedBy = session.user.id;
  const triggerSource =
    input.triggerSource ?? ("detail-panel-execute-now" as const);

  try {
    const intervention = await prisma.churnIntervention.findUnique({
      where: { id: input.interventionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!intervention) {
      return { success: false, error: "Intervention not found" };
    }

    if (intervention.executed) {
      return {
        success: true,
        skipped: true,
        intervention,
        audit: {
          executedBy,
          triggerSource,
          executedAt: intervention.executedAt,
        },
      };
    }

    if (!["DRAFT", "SCHEDULED"].includes(intervention.status)) {
      return {
        success: false,
        error: "Only DRAFT or SCHEDULED interventions can be executed now",
      };
    }

    if (intervention.channel !== "EMAIL" && intervention.channel !== "PUSH") {
      return {
        success: false,
        error: "Immediate execution is supported only for EMAIL or PUSH drafts",
      };
    }

    const lock = await prisma.churnIntervention.updateMany({
      where: {
        id: intervention.id,
        executed: false,
        status: {
          in: ["DRAFT", "SCHEDULED"],
        },
      },
      data: {
        status: "EXECUTING",
      },
    });

    if (lock.count === 0) {
      return {
        success: false,
        error:
          "Intervention is already being processed or no longer executable",
      };
    }

    try {
      if (intervention.channel === "EMAIL") {
        if (!intervention.user.email) {
          throw new Error("Cannot execute email draft: user has no email");
        }

        await sendManualInterventionEmail({
          email: intervention.user.email,
          name: intervention.user.name,
          message: intervention.message,
        });
      }

      if (intervention.channel === "PUSH") {
        await sendManualInterventionPush({
          userId: intervention.user.id,
          message: intervention.message,
        });
      }

      const executedAt = new Date();
      const executedAtIso = executedAt.toISOString();
      const auditResponse = appendExecutionAuditLog({
        existingResponse: intervention.response,
        executedBy,
        triggerSource,
        executedAtIso,
      });

      const completed = await prisma.churnIntervention.update({
        where: { id: intervention.id },
        data: {
          status: "SENT",
          executed: true,
          executedAt,
          deliveryOk: true,
          successful: null,
          response: auditResponse,
        },
      });

      revalidatePath("/admin/churn-analysis");

      return {
        success: true,
        intervention: completed,
        audit: {
          executedBy,
          triggerSource,
          executedAt,
        },
      };
    } catch (deliveryError) {
      const executedAt = new Date();
      const executedAtIso = executedAt.toISOString();
      const failureMessage =
        deliveryError instanceof Error
          ? deliveryError.message
          : "Manual execution failed";
      const failureBase = intervention.response?.trim()
        ? `${intervention.response.trim()}\n[failure] ${failureMessage}`
        : `[failure] ${failureMessage}`;
      const auditResponse = appendExecutionAuditLog({
        existingResponse: failureBase,
        executedBy,
        triggerSource,
        executedAtIso,
      });

      const failed = await prisma.churnIntervention.update({
        where: { id: intervention.id },
        data: {
          status: "FAILED",
          executed: true,
          executedAt,
          deliveryOk: false,
          successful: false,
          response: auditResponse,
        },
      });

      revalidatePath("/admin/churn-analysis");

      return {
        success: false,
        intervention: failed,
        audit: {
          executedBy,
          triggerSource,
          executedAt,
        },
        error:
          deliveryError instanceof Error
            ? deliveryError.message
            : "Failed to execute manual draft",
      };
    }
  } catch (error) {
    console.error("[executeManualInterventionDraft]", error);
    return { success: false, error: "Failed to execute manual intervention" };
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
