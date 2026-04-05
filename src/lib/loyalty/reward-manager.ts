import prisma from "@/lib/prisma";
import { LoyaltyTier, Prisma } from "@/generated/prisma/client";
import {
  calculateTierFromPoints,
  calculateTierProgress,
} from "./tier-calculator";

export const REDEMPTION_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  USED: "USED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
  REVOKED: "REVOKED",
} as const;

type RedemptionStatus =
  (typeof REDEMPTION_STATUS)[keyof typeof REDEMPTION_STATUS];

type RedemptionActorType = "PUBLIC" | "PARTNER" | "ADMIN";

type RedemptionAuthContext = {
  actorType?: RedemptionActorType;
  actorPartnerId?: string | null;
  actorUserId?: string | null;
};

type LeaderboardPeriod = "all-time" | "weekly" | "monthly";

/**
 * Generate unique redemption code
 */
export function generateRedemptionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 12; i += 1) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isTierEligible(
  userTier: LoyaltyTier,
  requiredTier: LoyaltyTier,
): boolean {
  const tiers: LoyaltyTier[] = [
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "DIAMOND",
  ];
  const userIndex = tiers.indexOf(userTier);
  const requiredIndex = tiers.indexOf(requiredTier);
  return userIndex >= requiredIndex;
}

function getRewardNumericOption(reward: unknown, key: string): number {
  if (!reward || typeof reward !== "object") return 0;

  const value = (reward as Record<string, unknown>)[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function buildConsumableInventoryWhere(
  now: Date,
): Prisma.RewardRedemptionWhereInput {
  return {
    OR: [
      { status: REDEMPTION_STATUS.USED },
      {
        status: REDEMPTION_STATUS.ACTIVE,
        expiresAt: { gte: now },
      },
      {
        status: REDEMPTION_STATUS.PENDING,
        expiresAt: { gte: now },
      },
    ],
  };
}

function computeEffectiveStatus(
  status: string,
  expiresAt: Date,
): RedemptionStatus {
  if (status === REDEMPTION_STATUS.ACTIVE && expiresAt.getTime() < Date.now()) {
    return REDEMPTION_STATUS.EXPIRED;
  }

  return (status as RedemptionStatus) || REDEMPTION_STATUS.ACTIVE;
}

async function acquireRewardLock(
  tx: Prisma.TransactionClient,
  rewardId: string,
): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`reward:${rewardId}`}))`,
  );
}

async function acquireLoyaltyLock(
  tx: Prisma.TransactionClient,
  loyaltyId: string,
): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`loyalty:${loyaltyId}`}))`,
  );
}

async function createRedemptionWithRetry(
  tx: Prisma.TransactionClient,
  data: Omit<Prisma.RewardRedemptionCreateInput, "code">,
  maxAttempts = 5,
) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts += 1;

    try {
      return await tx.rewardRedemption.create({
        data: {
          ...data,
          code: generateRedemptionCode(),
        },
        include: {
          reward: {
            include: {
              partner: true,
            },
          },
        },
      });
    } catch (error) {
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (!collision || attempts >= maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Failed to create unique redemption code");
}

/**
 * Get available rewards for user based on their tier
 */
export async function getAvailableRewards(userId: string) {
  const loyalty = await prisma.userLoyalty.findUnique({
    where: { userId },
    select: {
      id: true,
      currentTier: true,
      points: true,
      availablePoints: true,
    },
  });

  if (!loyalty) {
    return {
      rewards: [],
      userTier: "BRONZE" as LoyaltyTier,
      userPoints: 0,
      redemptionModel: "TIER_PERK",
    };
  }

  const now = new Date();
  const tiers: LoyaltyTier[] = [
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "DIAMOND",
  ];
  const userTierIndex = tiers.indexOf(loyalty.currentTier);
  const accessibleTiers = tiers.slice(0, userTierIndex + 1);

  const rewards = await prisma.partnerReward.findMany({
    where: {
      isActive: true,
      minTierRequired: { in: accessibleTiers },
      OR: [{ expiryDate: null }, { expiryDate: { gte: now } }],
    },
    include: {
      partner: true,
    },
    orderBy: [{ minTierRequired: "asc" }, { createdAt: "desc" }],
  });

  const hasPointsCostRewards = rewards.some(
    (reward) => getRewardNumericOption(reward, "pointsCost") > 0,
  );
  const hasTierPerkRewards = rewards.some(
    (reward) => getRewardNumericOption(reward, "pointsCost") <= 0,
  );
  const redemptionModel = hasPointsCostRewards
    ? hasTierPerkRewards
      ? "HYBRID"
      : "POINTS_COST"
    : "TIER_PERK";

  const rewardIds = rewards.map((reward) => reward.id);

  if (rewardIds.length === 0) {
    return {
      rewards: [],
      userTier: loyalty.currentTier,
      userPoints: loyalty.availablePoints,
      redemptionModel,
    };
  }

  const [globalCounts, userCounts, userActiveByReward] = await Promise.all([
    prisma.rewardRedemption.groupBy({
      by: ["rewardId"],
      where: {
        rewardId: { in: rewardIds },
        ...buildConsumableInventoryWhere(now),
      },
      _count: { _all: true },
    }),
    prisma.rewardRedemption.groupBy({
      by: ["rewardId"],
      where: {
        rewardId: { in: rewardIds },
        loyaltyId: loyalty.id,
      },
      _count: { _all: true },
    }),
    prisma.rewardRedemption.findMany({
      where: {
        rewardId: { in: rewardIds },
        loyaltyId: loyalty.id,
        status: REDEMPTION_STATUS.ACTIVE,
        expiresAt: { gte: now },
      },
      select: {
        rewardId: true,
        id: true,
        code: true,
      },
    }),
  ]);

  const globalCountMap = new Map(
    globalCounts.map((entry) => [entry.rewardId, entry._count._all]),
  );
  const userCountMap = new Map(
    userCounts.map((entry) => [entry.rewardId, entry._count._all]),
  );
  const userActiveMap = new Map(
    userActiveByReward.map((entry) => [entry.rewardId, entry]),
  );

  return {
    rewards: rewards.map((reward) => {
      const globalConsumed = globalCountMap.get(reward.id) ?? 0;
      const userRedeemCount = userCountMap.get(reward.id) ?? 0;
      const activeRedemption = userActiveMap.get(reward.id) || null;
      const pointsCost = getRewardNumericOption(reward, "pointsCost");
      const maxPerUser = getRewardNumericOption(reward, "maxPerUser");

      const remainingGlobal = reward.maxRedemptions
        ? Math.max(reward.maxRedemptions - globalConsumed, 0)
        : Infinity;
      const userEligibleByQuota =
        maxPerUser > 0 ? userRedeemCount < maxPerUser : true;
      const userEligibleByPoints =
        pointsCost <= 0 || loyalty.availablePoints >= pointsCost;

      return {
        ...reward,
        pointsCost,
        remainingGlobal,
        remainingRedemptions: remainingGlobal,
        userHasRedeemed: userRedeemCount > 0,
        userRedeemCount,
        hasActiveRedemption: Boolean(activeRedemption),
        activeRedemptionCode: activeRedemption?.code || null,
        canRedeem:
          remainingGlobal > 0 && userEligibleByQuota && userEligibleByPoints,
      };
    }),
    userTier: loyalty.currentTier,
    userPoints: loyalty.availablePoints,
    redemptionModel,
  };
}

/**
 * Redeem a reward
 */
export async function redeemReward(
  userId: string,
  rewardId: string,
  options: { idempotencyKey?: string } = {},
) {
  const now = new Date();

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const loyalty = await tx.userLoyalty.findUnique({
          where: { userId },
          select: {
            id: true,
            points: true,
            availablePoints: true,
            currentTier: true,
            lifetimePoints: true,
            lifetimeSpentPoints: true,
          },
        });

        if (!loyalty) {
          return {
            success: false as const,
            error: "Loyalty account not found",
          };
        }

        await acquireLoyaltyLock(tx, loyalty.id);
        await acquireRewardLock(tx, rewardId);

        const reward = await tx.partnerReward.findUnique({
          where: { id: rewardId },
          include: {
            partner: true,
          },
        });

        if (!reward) {
          return { success: false as const, error: "Reward not found" };
        }

        if (!reward.isActive) {
          return {
            success: false as const,
            error: "Reward is no longer active",
          };
        }

        if (reward.expiryDate && reward.expiryDate < now) {
          return { success: false as const, error: "Reward has expired" };
        }

        if (!isTierEligible(loyalty.currentTier, reward.minTierRequired)) {
          return {
            success: false as const,
            error: `Requires ${reward.minTierRequired} tier or higher`,
          };
        }

        const existingActive = await tx.rewardRedemption.findFirst({
          where: {
            loyaltyId: loyalty.id,
            rewardId: reward.id,
            status: REDEMPTION_STATUS.ACTIVE,
            expiresAt: { gte: now },
          },
          include: {
            reward: {
              include: {
                partner: true,
              },
            },
          },
          orderBy: { redeemedAt: "desc" },
        });

        if (existingActive) {
          return {
            success: true as const,
            redemption: existingActive,
            code: existingActive.code,
            idempotent: true,
          };
        }

        const consumedCount = await tx.rewardRedemption.count({
          where: {
            rewardId: reward.id,
            ...buildConsumableInventoryWhere(now),
          },
        });

        if (reward.maxRedemptions && consumedCount >= reward.maxRedemptions) {
          return {
            success: false as const,
            error: "Maximum redemptions reached for this reward",
          };
        }

        const maxPerUser = getRewardNumericOption(reward, "maxPerUser");
        if (maxPerUser > 0) {
          const userRedemptions = await tx.rewardRedemption.count({
            where: {
              rewardId: reward.id,
              loyaltyId: loyalty.id,
            },
          });

          if (userRedemptions >= maxPerUser) {
            return {
              success: false as const,
              error: "You have reached your redemption limit for this reward",
            };
          }
        }

        const maxActivePerUser = getRewardNumericOption(
          reward,
          "maxActivePerUser",
        );
        if (maxActivePerUser > 0) {
          const activeByUser = await tx.rewardRedemption.count({
            where: {
              rewardId: reward.id,
              loyaltyId: loyalty.id,
              status: REDEMPTION_STATUS.ACTIVE,
              expiresAt: { gte: now },
            },
          });

          if (activeByUser >= maxActivePerUser) {
            return {
              success: false as const,
              error:
                "You already have the maximum number of active redemptions",
            };
          }
        }

        const pointsCost = getRewardNumericOption(reward, "pointsCost");
        if (pointsCost > 0 && loyalty.availablePoints < pointsCost) {
          return {
            success: false as const,
            error: `Insufficient points. ${pointsCost} points are required`,
          };
        }

        const redemptionWindowDays =
          getRewardNumericOption(reward, "redemptionWindowDays") || 30;
        const expiresAt = new Date(
          now.getTime() + redemptionWindowDays * 24 * 60 * 60 * 1000,
        );

        const requiresManualApproval =
          Boolean((reward as Record<string, unknown>).requiresManualApproval) ||
          false;

        const redemption = await createRedemptionWithRetry(tx, {
          loyalty: {
            connect: { id: loyalty.id },
          },
          reward: {
            connect: { id: reward.id },
          },
          expiresAt,
          status: requiresManualApproval
            ? REDEMPTION_STATUS.PENDING
            : REDEMPTION_STATUS.ACTIVE,
        });

        if (pointsCost > 0) {
          const updatedPoints = loyalty.points - pointsCost;
          const recalculatedTier = calculateTierFromPoints(updatedPoints);
          const redemptionIdempotencyKey =
            options.idempotencyKey || `redemption:${redemption.id}`;

          await tx.loyaltyPointTransaction.create({
            data: {
              loyaltyId: loyalty.id,
              points: -pointsCost,
              reason: `Reward Redemption - ${reward.title}`,
              reasonCode: "REWARD_REDEMPTION",
              sourceType: "REWARD_REDEMPTION",
              sourceId: redemption.id,
              idempotencyKey: redemptionIdempotencyKey,
              metadata: {
                reasonCode: "REWARD_REDEMPTION",
                sourceType: "REWARD_REDEMPTION",
                sourceId: redemption.id,
                idempotencyKey: redemptionIdempotencyKey,
                rewardId: reward.id,
                rewardTitle: reward.title,
              },
            },
          });

          await tx.userLoyalty.update({
            where: { id: loyalty.id },
            data: {
              points: {
                decrement: pointsCost,
              },
              availablePoints: {
                decrement: pointsCost,
              },
              lifetimeSpentPoints: {
                increment: pointsCost,
              },
              currentTier: recalculatedTier,
              tierProgress: calculateTierProgress(
                updatedPoints,
                recalculatedTier,
              ),
            },
          });
        }

        await tx.notification.create({
          data: {
            userId,
            title: `🎁 Reward Redeemed: ${reward.title}`,
            message: requiresManualApproval
              ? `Your redemption request is pending approval. Code: ${redemption.code}`
              : `Your redemption code: ${redemption.code}. Valid until ${expiresAt.toLocaleDateString()}`,
            type: "REWARD_REDEMPTION",
            entityType: "REWARD_REDEMPTION",
            entityId: redemption.id,
            metadata: {
              rewardId: reward.id,
              rewardTitle: reward.title,
              pointsCost,
              requiresManualApproval,
            },
          },
        });

        return {
          success: true as const,
          redemption,
          code: redemption.code,
          idempotent: false,
          pointsCost,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return result;
  } catch (error) {
    console.error("[redeemReward]", error);
    return { success: false, error: "Failed to create redemption" };
  }
}

/**
 * Validate a redemption code with tiered data exposure.
 */
export async function validateRedemptionCode(
  code: string,
  authContext: RedemptionAuthContext = {},
) {
  const actorType = authContext.actorType || "PUBLIC";
  const actorPartnerId =
    typeof authContext.actorPartnerId === "string" &&
    authContext.actorPartnerId.trim().length > 0
      ? authContext.actorPartnerId.trim()
      : null;

  const redemption = await prisma.rewardRedemption.findUnique({
    where: { code },
    include: {
      reward: {
        include: {
          partner: true,
        },
      },
      loyalty: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!redemption) {
    return { valid: false, error: "Invalid code" };
  }

  const effectiveStatus = computeEffectiveStatus(
    redemption.status,
    redemption.expiresAt,
  );

  if (actorType === "PARTNER" && !actorPartnerId) {
    return { valid: false, error: "Forbidden" };
  }

  if (actorPartnerId && redemption.reward.partnerId !== actorPartnerId) {
    return { valid: false, error: "Forbidden" };
  }

  if (
    effectiveStatus === REDEMPTION_STATUS.USED ||
    effectiveStatus === REDEMPTION_STATUS.CANCELLED ||
    effectiveStatus === REDEMPTION_STATUS.REVOKED
  ) {
    return { valid: false, error: "Code is no longer redeemable" };
  }

  if (effectiveStatus === REDEMPTION_STATUS.EXPIRED) {
    return { valid: false, error: "Code has expired" };
  }

  const base = {
    valid: true,
    status: effectiveStatus,
    code: redemption.code,
    expiresAt: redemption.expiresAt,
    reward: {
      id: redemption.reward.id,
      title: redemption.reward.title,
      partnerName: redemption.reward.partner.name,
    },
  };

  if (actorType === "PUBLIC") {
    return base;
  }

  if (actorType === "PARTNER") {
    return {
      ...base,
      redemptionId: redemption.id,
      user: {
        id: redemption.loyalty.user.id,
        name: redemption.loyalty.user.name,
      },
    };
  }

  return {
    ...base,
    redemptionId: redemption.id,
    user: {
      id: redemption.loyalty.user.id,
      name: redemption.loyalty.user.name,
      email: redemption.loyalty.user.email,
    },
    loyaltyId: redemption.loyaltyId,
  };
}

/**
 * Mark redemption as used (partner/admin only)
 */
export async function markRedemptionUsed(
  code: string,
  authContext: RedemptionAuthContext,
) {
  const actorType = authContext.actorType;
  const actorPartnerId =
    typeof authContext.actorPartnerId === "string" &&
    authContext.actorPartnerId.trim().length > 0
      ? authContext.actorPartnerId.trim()
      : null;

  if (!actorType || actorType === "PUBLIC") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`redemption:${code}`}))`,
        );

        const redemption = await tx.rewardRedemption.findUnique({
          where: { code },
          include: {
            reward: {
              include: {
                partner: true,
              },
            },
            loyalty: {
              select: {
                userId: true,
              },
            },
          },
        });

        if (!redemption) {
          return { success: false as const, error: "Invalid code" };
        }

        if (actorType === "PARTNER" && !actorPartnerId) {
          return { success: false as const, error: "Forbidden" };
        }

        if (actorPartnerId && redemption.reward.partnerId !== actorPartnerId) {
          return { success: false as const, error: "Forbidden" };
        }

        const effectiveStatus = computeEffectiveStatus(
          redemption.status,
          redemption.expiresAt,
        );

        if (effectiveStatus === REDEMPTION_STATUS.EXPIRED) {
          await tx.rewardRedemption.update({
            where: { id: redemption.id },
            data: { status: REDEMPTION_STATUS.EXPIRED },
          });

          return { success: false as const, error: "Code has expired" };
        }

        if (effectiveStatus === REDEMPTION_STATUS.USED) {
          return { success: true as const, idempotent: true };
        }

        if (effectiveStatus !== REDEMPTION_STATUS.ACTIVE) {
          return { success: false as const, error: "Code is not active" };
        }

        await tx.rewardRedemption.update({
          where: { id: redemption.id },
          data: {
            status: REDEMPTION_STATUS.USED,
            usedAt: new Date(),
            usedByActorId: authContext.actorUserId ?? null,
            validatedByPartnerId: actorPartnerId,
          },
        });

        await tx.notification.create({
          data: {
            userId: redemption.loyalty.userId,
            title: `✅ Reward Used: ${redemption.reward.title}`,
            message: `Your redemption code ${redemption.code} was marked as used at ${redemption.reward.partner.name}.`,
            type: "REWARD_REDEMPTION",
            entityType: "REWARD_REDEMPTION",
            entityId: redemption.id,
            actorId: authContext.actorUserId ?? null,
            metadata: {
              markedUsedBy: actorType,
              partnerId: redemption.reward.partnerId,
            },
          },
        });

        return { success: true as const, idempotent: false };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return result;
  } catch (error) {
    console.error("[markRedemptionUsed]", error);
    return { success: false, error: "Failed to mark redemption as used" };
  }
}

/**
 * Expire stale active redemptions.
 * Intended for cron/background job execution.
 */
export async function expireStaleRedemptions(now = new Date()) {
  const result = await prisma.rewardRedemption.updateMany({
    where: {
      status: REDEMPTION_STATUS.ACTIVE,
      expiresAt: { lt: now },
    },
    data: {
      status: REDEMPTION_STATUS.EXPIRED,
    },
  });

  return { expired: result.count };
}

/**
 * Get user's redemption history
 */
export async function getUserRedemptions(userId: string) {
  const loyalty = await prisma.userLoyalty.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!loyalty) {
    return [];
  }

  const redemptions = await prisma.rewardRedemption.findMany({
    where: { loyaltyId: loyalty.id },
    include: {
      reward: {
        include: {
          partner: true,
        },
      },
    },
    orderBy: { redeemedAt: "desc" },
  });

  return redemptions.map((redemption) => ({
    ...redemption,
    effectiveStatus: computeEffectiveStatus(
      redemption.status,
      redemption.expiresAt,
    ),
  }));
}

function isProviderUser(user: {
  role?: string | null;
  roles?: string[] | null;
}): boolean {
  const primary = (user.role || "").toUpperCase();
  if (primary === "PROVIDER") return true;

  const roleList = Array.isArray(user.roles) ? user.roles : [];
  return roleList.some((role) => role.toUpperCase() === "PROVIDER");
}

function isLeaderboardVisible(user: { privacySettings?: unknown }): boolean {
  if (!user.privacySettings || typeof user.privacySettings !== "object") {
    return true;
  }

  const raw = user.privacySettings as Record<string, unknown>;
  if (typeof raw.profileVisible === "boolean") {
    return raw.profileVisible;
  }

  return true;
}

function startDateForPeriod(period: LeaderboardPeriod): Date | null {
  const now = new Date();

  if (period === "weekly") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (period === "monthly") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return null;
}

/**
 * Get leaderboard (top users by points)
 */
export async function getLeaderboard(
  limit = 10,
  options: { period?: LeaderboardPeriod; providerOnly?: boolean } = {},
) {
  const period = options.period || "all-time";
  const providerOnly = options.providerOnly ?? true;
  const safeLimit = Math.max(1, Math.min(limit, 100));

  if (period === "all-time") {
    const topUsers = await prisma.userLoyalty.findMany({
      take: safeLimit * 3,
      orderBy: [{ points: "desc" }, { lifetimePoints: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            roles: true,
            privacySettings: true,
            profile: {
              select: {
                location: true,
              },
            },
          },
        },
      },
    });

    const filtered = topUsers
      .filter((entry) => (providerOnly ? isProviderUser(entry.user) : true))
      .filter((entry) => isLeaderboardVisible(entry.user))
      .slice(0, safeLimit)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        period,
      }));

    return filtered;
  }

  const since = startDateForPeriod(period);
  if (!since) return [];

  const pointLeaders = await prisma.loyaltyPointTransaction.groupBy({
    by: ["loyaltyId"],
    where: {
      createdAt: { gte: since },
    },
    _sum: {
      points: true,
    },
    orderBy: {
      _sum: {
        points: "desc",
      },
    },
    take: safeLimit * 5,
  });

  const loyaltyIds = pointLeaders.map((entry) => entry.loyaltyId);
  if (loyaltyIds.length === 0) return [];

  const loyaltyRows = await prisma.userLoyalty.findMany({
    where: {
      id: {
        in: loyaltyIds,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          role: true,
          roles: true,
          privacySettings: true,
          profile: {
            select: {
              location: true,
            },
          },
        },
      },
    },
  });

  const loyaltyById = new Map(loyaltyRows.map((row) => [row.id, row]));

  const enriched = pointLeaders
    .map((entry) => {
      const loyalty = loyaltyById.get(entry.loyaltyId);
      if (!loyalty) return null;

      return {
        ...loyalty,
        periodPoints: entry._sum.points ?? 0,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .filter((entry) => (providerOnly ? isProviderUser(entry.user) : true))
    .filter((entry) => isLeaderboardVisible(entry.user))
    .sort((a, b) => {
      if ((b.periodPoints || 0) !== (a.periodPoints || 0)) {
        return (b.periodPoints || 0) - (a.periodPoints || 0);
      }
      return b.points - a.points;
    })
    .slice(0, safeLimit)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      period,
    }));

  return enriched;
}
