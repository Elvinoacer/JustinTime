import prisma from "@/lib/prisma";
import { ChurnRiskLevel } from "@/generated/prisma/client";

export interface ChurnFactors {
  inactivityDays: number;
  inactivityScore: number;
  inactivityWeight: number;

  bookingDecline: number;
  bookingScore: number;
  bookingWeight: number;

  profileCompleteness: number;
  profileScore: number;
  profileWeight: number;

  avgRating: number;
  reviewScore: number;
  reviewWeight: number;

  totalScore: number;
}

export interface ChurnPrediction {
  score: number;
  riskLevel: ChurnRiskLevel;
  factors: ChurnFactors;
  lastActivityDays: number;
  bookingDecline: number | null;
  engagementScore: number;
}

interface AnalyzeUsersOptions {
  scope?: "ALL_USERS" | "PROVIDERS_ONLY";
  batchSize?: number;
}

/**
 * Calculate churn risk score for a user
 */
export async function calculateChurnScore(
  userId: string,
): Promise<ChurnPrediction> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      receivedReviews: {
        select: { rating: true },
      },
    },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // 1. INACTIVITY SCORE (40% weight)
  const lastActivity = await getLastActivity(userId, user.updatedAt);
  const daysSinceActivity = lastActivity
    ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  let inactivityScore = 0;
  if (daysSinceActivity >= 30) inactivityScore = 1.0;
  else if (daysSinceActivity >= 15) inactivityScore = 0.6;
  else if (daysSinceActivity >= 8) inactivityScore = 0.3;
  else inactivityScore = 0;

  // 2. BOOKING DECLINE SCORE (30% weight)
  const bookingDeclineData = await calculateBookingDecline(
    userId,
    user.createdAt,
  );
  let bookingScore = 0;
  if (bookingDeclineData.decline >= 50) bookingScore = 1.0;
  else if (bookingDeclineData.decline >= 25) bookingScore = 0.5;
  else bookingScore = 0;

  // 3. PROFILE INCOMPLETENESS SCORE (15% weight)
  const profileCompleteness = calculateProfileCompleteness(user.profile);
  let profileScore = 0;
  if (profileCompleteness < 50) profileScore = 1.0;
  else if (profileCompleteness < 80) profileScore = 0.5;
  else profileScore = 0;

  // 4. NEGATIVE REVIEWS SCORE (15% weight)
  const avgRating =
    user.receivedReviews.length > 0
      ? user.receivedReviews.reduce((sum, r) => sum + r.rating, 0) /
        user.receivedReviews.length
      : 5.0;

  let reviewScore = 0;
  if (avgRating < 3.5) reviewScore = 1.0;
  else if (avgRating < 4.0) reviewScore = 0.5;
  else reviewScore = 0;

  // WEIGHTED TOTAL SCORE
  const weights = {
    inactivity: 0.4,
    booking: 0.3,
    profile: 0.15,
    review: 0.15,
  };
  const totalScore =
    inactivityScore * weights.inactivity +
    bookingScore * weights.booking +
    profileScore * weights.profile +
    reviewScore * weights.review;

  let riskLevel: ChurnRiskLevel;
  if (totalScore >= 0.75) riskLevel = "CRITICAL";
  else if (totalScore >= 0.5) riskLevel = "HIGH";
  else if (totalScore >= 0.25) riskLevel = "MEDIUM";
  else riskLevel = "LOW";

  const factors: ChurnFactors = {
    inactivityDays: daysSinceActivity,
    inactivityScore,
    inactivityWeight: weights.inactivity,

    bookingDecline: bookingDeclineData.decline,
    bookingScore,
    bookingWeight: weights.booking,

    profileCompleteness,
    profileScore,
    profileWeight: weights.profile,

    avgRating,
    reviewScore,
    reviewWeight: weights.review,

    totalScore,
  };

  return {
    score: parseFloat(totalScore.toFixed(3)),
    riskLevel,
    factors,
    lastActivityDays: daysSinceActivity,
    bookingDecline: bookingDeclineData.decline,
    engagementScore: parseFloat((1 - totalScore).toFixed(3)),
  };
}

async function getLastActivity(
  userId: string,
  userUpdatedAt: Date,
): Promise<Date | null> {
  const lastTrackedActivity = await getTrackedLastActivity(userId);

  if (!lastTrackedActivity) {
    return userUpdatedAt;
  }

  return new Date(
    Math.max(lastTrackedActivity.getTime(), userUpdatedAt.getTime()),
  );
}

/**
 * Get last activity date for user across tracked signals.
 */
async function getTrackedLastActivity(userId: string): Promise<Date | null> {
  const activities = await Promise.all([
    prisma.booking.findFirst({
      where: {
        OR: [{ providerId: userId }, { clientId: userId }],
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),

    prisma.message.findFirst({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),

    prisma.proposal.findFirst({
      where: { providerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),

    prisma.job.findFirst({
      where: { clientId: userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),

    prisma.service.findFirst({
      where: { providerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),

    prisma.availability.findFirst({
      where: { providerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),

    prisma.availabilityException.findFirst({
      where: { providerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),

    prisma.wallet.findUnique({
      where: { userId },
      select: { updatedAt: true },
    }),

    prisma.supportTicket.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),

    prisma.supportTicketMessage.findFirst({
      where: { authorId: userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const dates = activities.reduce<Date[]>((acc, activity) => {
    if (!activity) {
      return acc;
    }

    if ("updatedAt" in activity) {
      acc.push(activity.updatedAt);
    } else {
      acc.push(activity.createdAt);
    }

    return acc;
  }, []);

  if (dates.length === 0) {
    return null;
  }

  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

/**
 * Calculate booking decline %
 */
async function calculateBookingDecline(
  userId: string,
  userCreatedAt: Date,
): Promise<{ decline: number; recent: number; previous: number }> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const accountAgeDays = Math.floor(
    (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const [recentCount, previousCount] = await Promise.all([
    prisma.booking.count({
      where: {
        OR: [{ providerId: userId }, { clientId: userId }],
        status: "COMPLETED",
        createdAt: { gte: thirtyDaysAgo },
      },
    }),

    prisma.booking.count({
      where: {
        OR: [{ providerId: userId }, { clientId: userId }],
        status: "COMPLETED",
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
    }),
  ]);

  if (previousCount === 0) {
    // Cohort-aware fallback for new and low-volume users.
    if (recentCount === 0 && accountAgeDays > 45) {
      return { decline: 40, recent: recentCount, previous: previousCount };
    }

    if (recentCount === 0 && accountAgeDays > 14) {
      return { decline: 20, recent: recentCount, previous: previousCount };
    }

    return { decline: 0, recent: recentCount, previous: previousCount };
  }

  if (previousCount < 3) {
    if (recentCount === 0) {
      return { decline: 35, recent: recentCount, previous: previousCount };
    }
    if (recentCount < previousCount) {
      return { decline: 20, recent: recentCount, previous: previousCount };
    }
  }

  const decline = ((previousCount - recentCount) / previousCount) * 100;
  return {
    decline: Math.max(0, decline),
    recent: recentCount,
    previous: previousCount,
  };
}

/**
 * Calculate profile completeness %
 */
function calculateProfileCompleteness(profile: any): number {
  if (!profile) return 0;

  const fields = [
    profile.bio,
    profile.hourlyRate,
    profile.location,
    profile.idDocument,
    profile.skills && profile.skills.length > 0,
    profile.portfolio && profile.portfolio.length > 0,
    profile.certifications,
    profile.education,
  ];

  const filledCount = fields.filter((f) => f).length;
  return Math.round((filledCount / fields.length) * 100);
}

export async function saveChurnScoreSnapshot(
  userId: string,
  prediction: ChurnPrediction,
) {
  return prisma.$transaction(async (tx) => {
    await tx.churnScore.updateMany({
      where: { userId, isCurrent: true },
      data: { isCurrent: false },
    });

    return tx.churnScore.create({
      data: {
        userId,
        isCurrent: true,
        riskLevel: prediction.riskLevel,
        score: prediction.score,
        factors: prediction.factors as any,
        lastActivityDays: prediction.lastActivityDays,
        bookingDecline: prediction.bookingDecline,
        engagementScore: prediction.engagementScore,
      },
    });
  });
}

/**
 * Analyze users for churn and save scores
 */
export async function analyzeAllUsers(): Promise<{
  analyzed: number;
  atRisk: number;
  byLevel: Record<ChurnRiskLevel, number>;
}> {
  return analyzeUsersForChurn();
}

export async function analyzeUsersForChurn(
  options: AnalyzeUsersOptions = {},
): Promise<{
  analyzed: number;
  atRisk: number;
  byLevel: Record<ChurnRiskLevel, number>;
}> {
  const { scope = "ALL_USERS", batchSize = 25 } = options;

  const users = await prisma.user.findMany({
    where: {
      isBanned: false,
      ...(scope === "PROVIDERS_ONLY"
        ? { OR: [{ role: "PROVIDER" }, { roles: { has: "PROVIDER" } }] }
        : { NOT: { role: "ADMIN" } }),
    },
    select: { id: true },
  });

  const results = {
    analyzed: 0,
    atRisk: 0,
    byLevel: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    } as Record<ChurnRiskLevel, number>,
  };

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (user) => {
        try {
          const prediction = await calculateChurnScore(user.id);
          await saveChurnScoreSnapshot(user.id, prediction);
          return prediction;
        } catch (error) {
          console.error(`Error analyzing user ${user.id}:`, error);
          return null;
        }
      }),
    );

    for (const prediction of batchResults) {
      if (!prediction) {
        continue;
      }

      results.analyzed++;
      results.byLevel[prediction.riskLevel]++;
      if (prediction.riskLevel !== "LOW") {
        results.atRisk++;
      }
    }
  }

  return results;
}
