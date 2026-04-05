import prisma from "@/lib/prisma";
import { LoyaltyTier, Prisma } from "@/generated/prisma/client";

/**
 * Tier thresholds and benefits
 */
export const TIER_THRESHOLDS = {
  BRONZE: { minPoints: 0, maxPoints: 999, partnerCount: 1, color: "#CD7F32" },
  SILVER: {
    minPoints: 1000,
    maxPoints: 2999,
    partnerCount: 3,
    color: "#C0C0C0",
  },
  GOLD: {
    minPoints: 3000,
    maxPoints: 6999,
    partnerCount: 5,
    color: "#FFD700",
  },
  PLATINUM: {
    minPoints: 7000,
    maxPoints: 14999,
    partnerCount: 10,
    color: "#E5E4E2",
  },
  DIAMOND: {
    minPoints: 15000,
    maxPoints: Infinity,
    partnerCount: Infinity,
    color: "#B9F2FF",
  },
};

/**
 * Point earning rules
 */
export const POINT_RULES = {
  JOB_COMPLETION: 50,
  FIVE_STAR_REVIEW: 100,
  FOUR_STAR_REVIEW: 50,
  REPEAT_CLIENT: 75,
  FAST_RESPONSE: 25,
  PERFECT_WEEK: 200,
  REFERRAL: 150,
  PROFILE_COMPLETE: 100,
  TIER_BONUS_SILVER: 100,
  TIER_BONUS_GOLD: 250,
  TIER_BONUS_PLATINUM: 500,
  TIER_BONUS_DIAMOND: 1000,
};

const TIER_ORDER: LoyaltyTier[] = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
];

type AwardPointsOptions = {
  reasonCode?: string;
  sourceType?: string;
  sourceId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

type AwardPointsResult = {
  success: boolean;
  newTier?: LoyaltyTier;
  tierUpgrade?: boolean;
  idempotent?: boolean;
  pointsBalance?: number;
};

type ReversePointsResult = {
  success: boolean;
  reversed?: boolean;
  idempotent?: boolean;
  reversalTransactionId?: string;
  error?: string;
};

/**
 * Calculate tier from points
 */
export function calculateTierFromPoints(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS.DIAMOND.minPoints) return "DIAMOND";
  if (points >= TIER_THRESHOLDS.PLATINUM.minPoints) return "PLATINUM";
  if (points >= TIER_THRESHOLDS.GOLD.minPoints) return "GOLD";
  if (points >= TIER_THRESHOLDS.SILVER.minPoints) return "SILVER";
  return "BRONZE";
}

/**
 * Calculate progress to next tier (0-100%)
 */
export function calculateTierProgress(
  currentPoints: number,
  currentTier: LoyaltyTier,
): number {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 100;

  const currentThreshold = TIER_THRESHOLDS[currentTier];
  const nextThreshold = TIER_THRESHOLDS[nextTier];

  const pointsInCurrentTier = currentPoints - currentThreshold.minPoints;
  const pointsNeededForNext =
    nextThreshold.minPoints - currentThreshold.minPoints;

  if (pointsNeededForNext <= 0) return 100;

  return Math.max(
    0,
    Math.min((pointsInCurrentTier / pointsNeededForNext) * 100, 100),
  );
}

/**
 * Get next tier in the hierarchy
 */
function getNextTier(currentTier: LoyaltyTier): LoyaltyTier | null {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  return currentIndex < TIER_ORDER.length - 1
    ? TIER_ORDER[currentIndex + 1]
    : null;
}

function isTierUpgrade(oldTier: LoyaltyTier, newTier: LoyaltyTier): boolean {
  return TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(oldTier);
}

function isSerializableConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function buildIdempotencyKey(
  userId: string,
  reason: string,
  options: AwardPointsOptions,
): string | null {
  if (options.idempotencyKey?.trim()) {
    return options.idempotencyKey.trim();
  }

  if (options.sourceType?.trim() && options.sourceId?.trim()) {
    const reasonCode = options.reasonCode?.trim() || reason.trim();
    return `loyalty:${userId}:${options.sourceType.trim()}:${options.sourceId.trim()}:${reasonCode}`;
  }

  return null;
}

async function acquireLoyaltyLock(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`loyalty:${userId}`}))`,
  );
}

async function hasIdempotencyTransaction(
  tx: Prisma.TransactionClient,
  loyaltyId: string,
  idempotencyKey: string,
): Promise<boolean> {
  const existing = await tx.loyaltyPointTransaction.findFirst({
    where: {
      loyaltyId,
      idempotencyKey,
    },
    select: { id: true },
  });

  return Boolean(existing);
}

function buildTransactionMetadata(
  options: AwardPointsOptions,
  idempotencyKey: string | null,
): Record<string, unknown> {
  return {
    ...(options.metadata || {}),
    ...(options.reasonCode ? { reasonCode: options.reasonCode } : {}),
    ...(options.sourceType ? { sourceType: options.sourceType } : {}),
    ...(options.sourceId ? { sourceId: options.sourceId } : {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
  };
}

async function awardPointsInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  reason: string,
  points: number,
  options: AwardPointsOptions,
): Promise<AwardPointsResult> {
  const loyalty = await tx.userLoyalty.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  await acquireLoyaltyLock(tx, userId);

  const idempotencyKey = buildIdempotencyKey(userId, reason, options);

  if (idempotencyKey) {
    const hasDuplicate = await hasIdempotencyTransaction(
      tx,
      loyalty.id,
      idempotencyKey,
    );

    if (hasDuplicate) {
      const current = await tx.userLoyalty.findUnique({
        where: { id: loyalty.id },
        select: { points: true, currentTier: true },
      });

      return {
        success: true,
        idempotent: true,
        tierUpgrade: false,
        pointsBalance: current?.points,
        newTier: current?.currentTier,
      };
    }
  }

  const transactionMetadata = buildTransactionMetadata(options, idempotencyKey);

  await tx.loyaltyPointTransaction.create({
    data: {
      loyaltyId: loyalty.id,
      points,
      reason,
      reasonCode: options.reasonCode,
      sourceType: options.sourceType,
      sourceId: options.sourceId,
      idempotencyKey: idempotencyKey || undefined,
      metadata: transactionMetadata as unknown as Prisma.InputJsonValue,
    },
  });

  let updatedLoyalty = await tx.userLoyalty.update({
    where: { id: loyalty.id },
    data: {
      points: {
        increment: points,
      },
      availablePoints: {
        increment: points,
      },
      ...(points > 0
        ? {
            lifetimePoints: {
              increment: points,
            },
            lifetimeEarnedPoints: {
              increment: points,
            },
          }
        : {
            lifetimeSpentPoints: {
              increment: Math.abs(points),
            },
          }),
    },
    select: {
      points: true,
      currentTier: true,
      lastTierUpdate: true,
    },
  });

  const oldTier = loyalty.currentTier;
  const provisionalTier = calculateTierFromPoints(updatedLoyalty.points);
  const tierUpgrade = isTierUpgrade(oldTier, provisionalTier);

  if (tierUpgrade && provisionalTier !== "BRONZE") {
    const bonusKey =
      `TIER_BONUS_${provisionalTier}` as keyof typeof POINT_RULES;
    const bonusPoints = POINT_RULES[bonusKey] || 0;

    if (bonusPoints > 0) {
      const tierBonusIdempotencyKey = idempotencyKey
        ? `${idempotencyKey}:tier-bonus:${provisionalTier}`
        : `loyalty:${userId}:tier-bonus:${provisionalTier}:${Date.now()}`;

      const bonusAlreadyApplied = await hasIdempotencyTransaction(
        tx,
        loyalty.id,
        tierBonusIdempotencyKey,
      );

      if (!bonusAlreadyApplied) {
        await tx.loyaltyPointTransaction.create({
          data: {
            loyaltyId: loyalty.id,
            points: bonusPoints,
            reason: `Tier Upgrade Bonus - ${provisionalTier}`,
            reasonCode: "TIER_BONUS",
            sourceType: "TIER_UPGRADE",
            sourceId: provisionalTier,
            idempotencyKey: tierBonusIdempotencyKey,
            metadata: {
              reasonCode: "TIER_BONUS",
              sourceType: "TIER_UPGRADE",
              sourceId: provisionalTier,
              idempotencyKey: tierBonusIdempotencyKey,
              fromTier: oldTier,
              toTier: provisionalTier,
            },
          },
        });

        updatedLoyalty = await tx.userLoyalty.update({
          where: { id: loyalty.id },
          data: {
            points: {
              increment: bonusPoints,
            },
            availablePoints: {
              increment: bonusPoints,
            },
            lifetimePoints: {
              increment: bonusPoints,
            },
            lifetimeEarnedPoints: {
              increment: bonusPoints,
            },
          },
          select: {
            points: true,
            currentTier: true,
            lastTierUpdate: true,
          },
        });
      }
    }

    await tx.notification.create({
      data: {
        userId,
        title: `🎉 Tier Upgrade: Welcome to ${provisionalTier}!`,
        message: `Congratulations! You've been promoted to ${provisionalTier} tier. Unlock exclusive partner rewards!`,
        type: "TIER_UPGRADE",
      },
    });
  }

  const finalTier = calculateTierFromPoints(updatedLoyalty.points);

  const finalized = await tx.userLoyalty.update({
    where: { id: loyalty.id },
    data: {
      currentTier: finalTier,
      tierProgress: calculateTierProgress(updatedLoyalty.points, finalTier),
      ...(tierUpgrade
        ? {
            lastTierUpdate: new Date(),
          }
        : {}),
    },
    select: {
      points: true,
      currentTier: true,
    },
  });

  return {
    success: true,
    newTier: tierUpgrade ? finalized.currentTier : undefined,
    tierUpgrade,
    idempotent: false,
    pointsBalance: finalized.points,
  };
}

/**
 * Award points to a user (positive or negative).
 * For production event flows prefer earnPoints/spendPoints wrappers.
 */
export async function awardPoints(
  userId: string,
  reason: string,
  points: number,
  metadata?: Record<string, unknown> | null,
  options: AwardPointsOptions = {},
): Promise<AwardPointsResult> {
  if (!Number.isFinite(points) || points === 0) {
    return { success: false };
  }

  const mergedOptions: AwardPointsOptions = {
    ...options,
    metadata: {
      ...(options.metadata || {}),
      ...(metadata && typeof metadata === "object" ? metadata : {}),
    },
  };

  let attempts = 0;
  while (attempts < 3) {
    attempts += 1;

    try {
      const result = await prisma.$transaction(
        (tx) =>
          awardPointsInTransaction(tx, userId, reason, points, mergedOptions),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return result;
    } catch (error) {
      if (isSerializableConflict(error) && attempts < 3) {
        continue;
      }

      console.error("[awardPoints]", error);
      return { success: false };
    }
  }

  return { success: false };
}

export async function earnPoints(
  userId: string,
  reason: string,
  points: number,
  options: AwardPointsOptions = {},
): Promise<AwardPointsResult> {
  const amount = Math.abs(points);
  return awardPoints(userId, reason, amount, options.metadata, options);
}

export async function spendPoints(
  userId: string,
  reason: string,
  points: number,
  options: AwardPointsOptions = {},
): Promise<AwardPointsResult> {
  const amount = Math.abs(points);
  return awardPoints(userId, reason, -amount, options.metadata, options);
}

/**
 * Get user's loyalty status with tier info
 */
export async function getUserLoyaltyStatus(userId: string) {
  let loyalty = await prisma.userLoyalty.findUnique({
    where: { userId },
    include: {
      pointHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!loyalty) {
    loyalty = await prisma.userLoyalty.create({
      data: { userId },
      include: {
        pointHistory: true,
      },
    });
  }

  const currentTierInfo = TIER_THRESHOLDS[loyalty.currentTier];
  const nextTier = getNextTier(loyalty.currentTier);
  const nextTierInfo = nextTier ? TIER_THRESHOLDS[nextTier] : null;

  const pointsToNextTier = nextTierInfo
    ? Math.max(nextTierInfo.minPoints - loyalty.points, 0)
    : 0;

  return {
    ...loyalty,
    currentTierInfo,
    nextTier,
    nextTierInfo,
    pointsToNextTier,
    progress: calculateTierProgress(loyalty.points, loyalty.currentTier),
  };
}

function getIsoWeekKey(date: Date): string {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Check for perfect week achievement
 */
export async function checkPerfectWeekAchievement(
  userId: string,
): Promise<boolean> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentJobs = await prisma.booking.findMany({
    where: {
      providerId: userId,
      status: "COMPLETED",
      updatedAt: { gte: oneWeekAgo },
    },
    include: {
      review: true,
    },
  });

  if (recentJobs.length >= 7) {
    const fiveStarCount = recentJobs.filter(
      (job) => job.review && job.review.rating === 5,
    ).length;

    if (fiveStarCount >= 7) {
      const weekKey = getIsoWeekKey(new Date());
      const awarded = await earnPoints(
        userId,
        "Perfect Week - 7 Five-Star Jobs",
        POINT_RULES.PERFECT_WEEK,
        {
          reasonCode: "PERFECT_WEEK",
          sourceType: "WEEKLY_PERFORMANCE",
          sourceId: weekKey,
          idempotencyKey: `loyalty:${userId}:perfect-week:${weekKey}`,
          metadata: {
            fiveStarCount,
            totalJobs: recentJobs.length,
          },
        },
      );

      return awarded.success;
    }
  }

  return false;
}

/**
 * Deduct points (for reward redemption)
 */
export async function deductPoints(
  userId: string,
  reason: string,
  points: number,
  options: AwardPointsOptions = {},
): Promise<boolean> {
  const loyalty = await prisma.userLoyalty.findUnique({
    where: { userId },
    select: { availablePoints: true },
  });

  const amount = Math.abs(points);
  if (!loyalty || loyalty.availablePoints < amount) {
    return false;
  }

  const result = await spendPoints(userId, reason, amount, {
    ...options,
    reasonCode: options.reasonCode || "POINTS_SPENT",
  });

  return result.success;
}

/**
 * Reverse a previously posted loyalty transaction with an auditable counter-entry.
 */
export async function reversePointTransaction(
  transactionId: string,
  actorUserId: string,
  adjustmentReason: string,
): Promise<ReversePointsResult> {
  const reason = adjustmentReason.trim();
  if (!reason) {
    return { success: false, error: "Adjustment reason is required" };
  }

  let attempts = 0;
  while (attempts < 3) {
    attempts += 1;

    try {
      return await prisma.$transaction(
        async (tx) => {
          const original = await tx.loyaltyPointTransaction.findUnique({
            where: { id: transactionId },
            include: {
              loyalty: {
                select: {
                  id: true,
                  userId: true,
                },
              },
            },
          });

          if (!original) {
            return { success: false, error: "Transaction not found" };
          }

          await acquireLoyaltyLock(tx, original.loyalty.userId);

          if (original.reasonCode === "POINT_REVERSAL") {
            return {
              success: false,
              error: "Cannot reverse a reversal transaction",
            };
          }

          const existingReversal = await tx.loyaltyPointTransaction.findFirst({
            where: {
              reversedTransactionId: original.id,
            },
            select: { id: true },
          });

          if (existingReversal) {
            return {
              success: true,
              reversed: false,
              idempotent: true,
              reversalTransactionId: existingReversal.id,
            };
          }

          const loyalty = await tx.userLoyalty.findUnique({
            where: { id: original.loyaltyId },
            select: {
              id: true,
              points: true,
              availablePoints: true,
              lifetimePoints: true,
              lifetimeEarnedPoints: true,
              lifetimeSpentPoints: true,
            },
          });

          if (!loyalty) {
            return { success: false, error: "Loyalty account not found" };
          }

          const reversalPoints = -original.points;
          const nextPoints = loyalty.points + reversalPoints;
          const nextAvailablePoints = loyalty.availablePoints + reversalPoints;

          if (nextPoints < 0 || nextAvailablePoints < 0) {
            return {
              success: false,
              error:
                "Cannot reverse transaction because spendable balance is insufficient",
            };
          }

          const nextLifetimePoints =
            original.points > 0
              ? Math.max(loyalty.lifetimePoints - original.points, 0)
              : loyalty.lifetimePoints;

          const nextLifetimeEarned =
            original.points > 0
              ? Math.max(loyalty.lifetimeEarnedPoints - original.points, 0)
              : loyalty.lifetimeEarnedPoints;

          const nextLifetimeSpent =
            original.points < 0
              ? Math.max(
                  loyalty.lifetimeSpentPoints - Math.abs(original.points),
                  0,
                )
              : loyalty.lifetimeSpentPoints;

          const reversal = await tx.loyaltyPointTransaction.create({
            data: {
              loyaltyId: loyalty.id,
              points: reversalPoints,
              reason: `Reversal - ${original.reason}`,
              reasonCode: "POINT_REVERSAL",
              sourceType: "REVERSAL",
              sourceId: original.id,
              idempotencyKey: `loyalty-reversal:${original.id}`,
              status: "POSTED",
              reversedTransactionId: original.id,
              createdByUserId: actorUserId,
              createdByType: "ADMIN",
              adjustmentReason: reason,
              metadata: {
                reversedTransactionId: original.id,
                originalPoints: original.points,
                adjustmentReason: reason,
                actorUserId,
              },
            },
            select: { id: true },
          });

          const recalculatedTier = calculateTierFromPoints(nextPoints);

          await tx.userLoyalty.update({
            where: { id: loyalty.id },
            data: {
              points: nextPoints,
              availablePoints: nextAvailablePoints,
              lifetimePoints: nextLifetimePoints,
              lifetimeEarnedPoints: nextLifetimeEarned,
              lifetimeSpentPoints: nextLifetimeSpent,
              currentTier: recalculatedTier,
              tierProgress: calculateTierProgress(nextPoints, recalculatedTier),
            },
          });

          await tx.loyaltyPointTransaction.update({
            where: { id: original.id },
            data: {
              status: "REVERSED",
              adjustmentReason: reason,
            },
          });

          return {
            success: true,
            reversed: true,
            idempotent: false,
            reversalTransactionId: reversal.id,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (isSerializableConflict(error) && attempts < 3) {
        continue;
      }

      console.error("[reversePointTransaction]", error);
      return { success: false, error: "Failed to reverse transaction" };
    }
  }

  return { success: false, error: "Failed to reverse transaction" };
}
