import { Prisma, type BadgeCategory } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  BADGE_DEFINITIONS,
  type BadgeDefinition,
  type BadgeRequirement,
} from "./badge-definitions";

export type BadgeEvaluationTrigger =
  | "MANUAL"
  | "BOOKING_COMPLETED"
  | "REVIEW_CREATED"
  | "PROFILE_UPDATED"
  | "REVENUE_SETTLED"
  | "ACCOUNT_CREATED"
  | "ADMIN_MANUAL_AWARD";

export type EvaluatedBadge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  color: string;
  points: number;
  earned: boolean;
  awardedAt: Date | null;
  requirement: BadgeRequirement;
  progressCurrent: number;
  progressRequired: number;
  progressPercent: number;
  eligibleNow: boolean;
};

export type BadgeSummary = {
  totalBadges: number;
  earnedBadges: number;
  totalPoints: number;
  completionPercentage: number;
  recentlyAwarded: number;
};

type EvaluationContext = {
  completedJobs: number;
  avgCompletionMinutes: number | null;
  averageRating: number;
  reviewCount: number;
  profileCompleteness: number;
  revenueTotal: number;
  joinedAt: Date | null;
};

type RequirementEvaluation = {
  qualified: boolean;
  current: number;
  required: number;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (
    typeof value === "object" &&
    value &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function fallbackRequirement(raw: unknown): BadgeRequirement {
  if (
    raw &&
    typeof raw === "object" &&
    "type" in raw &&
    typeof (raw as { type?: unknown }).type === "string"
  ) {
    const knownType = (raw as { type: string }).type;
    if (
      knownType === "JOB_COUNT" ||
      knownType === "AVG_COMPLETION_TIME" ||
      knownType === "RATING_THRESHOLD" ||
      knownType === "PROFILE_COMPLETENESS" ||
      knownType === "REVENUE_MILESTONE" ||
      knownType === "JOINED_BEFORE_DATE" ||
      knownType === "MANUAL_ONLY"
    ) {
      return raw as BadgeRequirement;
    }
  }

  return { type: "MANUAL_ONLY" };
}

function requirementProgressPercent(
  requirement: BadgeRequirement,
  current: number,
  required: number,
): number {
  if (required <= 0) return 0;

  if (requirement.type === "AVG_COMPLETION_TIME") {
    if (current <= 0) return 0;
    return clampPercent((required / current) * 100);
  }

  return clampPercent((current / required) * 100);
}

async function buildEvaluationContext(
  userId: string,
): Promise<EvaluationContext> {
  const [
    user,
    profile,
    completedJobs,
    ratingAggregate,
    revenueAggregate,
    avgCompletionRows,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    }),
    prisma.profile.findUnique({
      where: { userId },
      select: {
        bio: true,
        hourlyRate: true,
        location: true,
        idDocument: true,
        skills: true,
        portfolio: true,
      },
    }),
    prisma.booking.count({
      where: {
        providerId: userId,
        status: "COMPLETED",
      },
    }),
    prisma.review.aggregate({
      where: {
        targetId: userId,
        booking: {
          status: "COMPLETED",
        },
      },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        booking: {
          providerId: userId,
        },
      },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<Array<{ avg_minutes: unknown }>>(Prisma.sql`
      SELECT AVG(
        EXTRACT(EPOCH FROM (
          COALESCE(complete_evt.complete_at, b."updatedAt")
          - COALESCE(start_evt.start_at, b."createdAt")
        )) / 60.0
      ) AS avg_minutes
      FROM "Booking" b
      LEFT JOIN LATERAL (
        SELECT MIN(e."createdAt") AS start_at
        FROM "BookingLifecycleEvent" e
        WHERE e."bookingId" = b.id
          AND e."eventType" = 'WORK_STARTED'
      ) start_evt ON true
      LEFT JOIN LATERAL (
        SELECT MIN(e2."createdAt") AS complete_at
        FROM "BookingLifecycleEvent" e2
        WHERE e2."bookingId" = b.id
          AND e2."eventType" IN ('CLIENT_CONFIRMED_COMPLETE', 'PROVIDER_MARKED_COMPLETE')
      ) complete_evt ON true
      WHERE b."providerId" = ${userId}
        AND b.status = 'COMPLETED'
    `),
  ]);

  const profileFields = [
    Boolean(profile?.bio && profile.bio.trim().length > 0),
    profile?.hourlyRate != null,
    Boolean(profile?.location && profile.location.trim().length > 0),
    Boolean(profile?.idDocument && profile.idDocument.trim().length > 0),
    Array.isArray(profile?.skills) && profile.skills.length > 0,
    Array.isArray(profile?.portfolio) && profile.portfolio.length > 0,
  ];

  const profileCompleteness = clampPercent(
    (profileFields.filter(Boolean).length / profileFields.length) * 100,
  );

  return {
    completedJobs,
    avgCompletionMinutes: toNumber(avgCompletionRows[0]?.avg_minutes),
    averageRating: Number(ratingAggregate._avg.rating ?? 0),
    reviewCount: ratingAggregate._count._all,
    profileCompleteness,
    revenueTotal: Number(revenueAggregate._sum.amount ?? 0),
    joinedAt: user?.createdAt ?? null,
  };
}

function evaluateRequirement(
  requirement: BadgeRequirement,
  context: EvaluationContext,
): RequirementEvaluation {
  switch (requirement.type) {
    case "JOB_COUNT": {
      const required = Number(requirement.value ?? 0);
      return {
        qualified: context.completedJobs >= required,
        current: context.completedJobs,
        required,
      };
    }

    case "AVG_COMPLETION_TIME": {
      const required = Number(requirement.value ?? 0);
      const current = context.avgCompletionMinutes ?? 0;
      return {
        qualified:
          context.avgCompletionMinutes != null &&
          context.avgCompletionMinutes <= required,
        current,
        required,
      };
    }

    case "RATING_THRESHOLD": {
      const minRating = Number(requirement.rating ?? 5);
      const minReviews = Number(requirement.minReviews ?? 1);

      if (context.reviewCount < minReviews) {
        return {
          qualified: false,
          current: context.reviewCount,
          required: minReviews,
        };
      }

      return {
        qualified: context.averageRating >= minRating,
        current: Number(context.averageRating.toFixed(1)),
        required: minRating,
      };
    }

    case "PROFILE_COMPLETENESS": {
      const required = Number(requirement.value ?? 100);
      return {
        qualified: context.profileCompleteness >= required,
        current: context.profileCompleteness,
        required,
      };
    }

    case "REVENUE_MILESTONE": {
      const required = Number(requirement.value ?? 0);
      return {
        qualified: context.revenueTotal >= required,
        current: Math.round(context.revenueTotal),
        required,
      };
    }

    case "JOINED_BEFORE_DATE": {
      const cutoffDate = requirement.date ? new Date(requirement.date) : null;
      const validCutoff = cutoffDate && Number.isFinite(cutoffDate.getTime());
      const qualified = Boolean(
        context.joinedAt &&
        validCutoff &&
        context.joinedAt.getTime() <= cutoffDate!.getTime(),
      );

      return {
        qualified,
        current: qualified ? 1 : 0,
        required: 1,
      };
    }

    case "MANUAL_ONLY":
    default:
      return {
        qualified: false,
        current: 0,
        required: 1,
      };
  }
}

export async function evaluateBadgeProgress(
  userId: string,
): Promise<EvaluatedBadge[]> {
  const [badges, context] = await Promise.all([
    prisma.badge.findMany({
      where: { isActive: true },
      include: {
        userBadges: {
          where: { userId },
          orderBy: { awardedAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ category: "asc" }, { points: "asc" }],
    }),
    buildEvaluationContext(userId),
  ]);

  return badges.map((badge) => {
    const requirement = fallbackRequirement(badge.requirement);
    const evaluation = evaluateRequirement(requirement, context);
    const earned = badge.userBadges.length > 0;
    const progressCurrent = earned
      ? Math.max(evaluation.current, evaluation.required)
      : evaluation.current;
    const progressRequired = Math.max(evaluation.required, 1);

    return {
      id: badge.id,
      slug: badge.slug,
      name: badge.name,
      description: badge.description,
      category: badge.category,
      icon: badge.icon,
      color: badge.color,
      points: badge.points,
      earned,
      awardedAt: badge.userBadges[0]?.awardedAt ?? null,
      requirement,
      progressCurrent,
      progressRequired,
      progressPercent: earned
        ? 100
        : requirementProgressPercent(
            requirement,
            progressCurrent,
            progressRequired,
          ),
      eligibleNow: !earned && evaluation.qualified,
    };
  });
}

export async function getBadgesForUser(userId: string): Promise<{
  badges: EvaluatedBadge[];
  stats: BadgeSummary;
}> {
  const [badges, recentlyAwarded] = await Promise.all([
    evaluateBadgeProgress(userId),
    prisma.notification.count({
      where: {
        userId,
        type: "BADGE_EARNED",
        deletedAt: null,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const earnedBadges = badges.filter((badge) => badge.earned);
  const totalPoints = earnedBadges.reduce(
    (sum, badge) => sum + badge.points,
    0,
  );

  return {
    badges,
    stats: {
      totalBadges: badges.length,
      earnedBadges: earnedBadges.length,
      totalPoints,
      completionPercentage:
        badges.length > 0
          ? clampPercent((earnedBadges.length / badges.length) * 100)
          : 0,
      recentlyAwarded,
    },
  };
}

function getBadgeDefinitionBySlug(slug: string): BadgeDefinition {
  const definition = BADGE_DEFINITIONS.find((badge) => badge.slug === slug);
  if (!definition) {
    throw new Error(`Badge definition not found for slug: ${slug}`);
  }
  return definition;
}

type AwardContext = {
  trigger?: BadgeEvaluationTrigger;
  eventId?: string | null;
  actorUserId?: string | null;
};

export async function awardBadge(
  userId: string,
  badgeSlug: string,
  context: AwardContext = {},
): Promise<{ awarded: boolean; badgeSlug: string }> {
  const awardResult = await prisma.$transaction(async (tx) => {
    let badge = await tx.badge.findUnique({ where: { slug: badgeSlug } });

    if (!badge) {
      const definition = getBadgeDefinitionBySlug(badgeSlug);
      badge = await tx.badge.create({
        data: {
          slug: definition.slug,
          name: definition.name,
          description: definition.description,
          category: definition.category,
          icon: definition.icon,
          color: definition.color,
          requirementType: definition.requirement.type,
          isManualOnly: definition.requirement.type === "MANUAL_ONLY",
          requirement:
            definition.requirement as unknown as Prisma.InputJsonValue,
          points: definition.points,
        },
      });
    }

    try {
      await tx.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
          awardedByEventType: context.trigger ?? "MANUAL",
          awardedByEventId: context.eventId ?? null,
          awardedByUserId: context.actorUserId ?? null,
        },
      });
    } catch (error) {
      const isDuplicateAward =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (isDuplicateAward) {
        return { awarded: false, badgeSlug: badge.slug };
      }

      throw error;
    }

    await tx.notification.create({
      data: {
        userId,
        title: `🎉 Badge Earned: ${badge.name}!`,
        message: badge.description,
        type: "BADGE_EARNED",
        entityType: "BADGE",
        entityId: badge.id,
        actorId: context.actorUserId ?? null,
        metadata: {
          badgeSlug: badge.slug,
          trigger: context.trigger ?? "MANUAL",
          eventId: context.eventId ?? null,
        },
      },
    });

    return { awarded: true, badgeSlug: badge.slug };
  });

  return awardResult;
}

export async function awardEligibleBadges(
  userId: string,
  context: AwardContext = {},
): Promise<{
  checked: number;
  awarded: string[];
  progress: Array<{ badgeSlug: string; current: number; required: number }>;
}> {
  const badges = await evaluateBadgeProgress(userId);
  const eligible = badges.filter((badge) => !badge.earned && badge.eligibleNow);

  const awarded: string[] = [];
  for (const badge of eligible) {
    const result = await awardBadge(userId, badge.slug, context);
    if (result.awarded) {
      awarded.push(result.badgeSlug);
    }
  }

  return {
    checked: badges.length,
    awarded,
    progress: badges
      .filter((badge) => !badge.earned)
      .map((badge) => ({
        badgeSlug: badge.slug,
        current: badge.progressCurrent,
        required: badge.progressRequired,
      })),
  };
}

export async function syncBadgeDefinitions() {
  const result = {
    created: 0,
    updated: 0,
    total: BADGE_DEFINITIONS.length,
  };

  for (const definition of BADGE_DEFINITIONS) {
    const existing = await prisma.badge.findUnique({
      where: { slug: definition.slug },
      select: { id: true },
    });

    if (!existing) {
      await prisma.badge.create({
        data: {
          slug: definition.slug,
          name: definition.name,
          description: definition.description,
          category: definition.category,
          icon: definition.icon,
          color: definition.color,
          requirementType: definition.requirement.type,
          isManualOnly: definition.requirement.type === "MANUAL_ONLY",
          requirement:
            definition.requirement as unknown as Prisma.InputJsonValue,
          points: definition.points,
          isActive: true,
        },
      });
      result.created += 1;
      continue;
    }

    await prisma.badge.update({
      where: { slug: definition.slug },
      data: {
        name: definition.name,
        description: definition.description,
        category: definition.category,
        icon: definition.icon,
        color: definition.color,
        requirementType: definition.requirement.type,
        isManualOnly: definition.requirement.type === "MANUAL_ONLY",
        requirement: definition.requirement as unknown as Prisma.InputJsonValue,
        points: definition.points,
      },
    });
    result.updated += 1;
  }

  return result;
}
