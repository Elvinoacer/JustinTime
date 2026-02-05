import prisma from "@/lib/prisma";
import { LoyaltyTier } from "@/generated/prisma";

/**
 * Generate unique redemption code
 */
export function generateRedemptionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get available rewards for user based on their tier
 */
export async function getAvailableRewards(userId: string) {
  const loyalty = await prisma.userLoyalty.findUnique({
    where: { userId }
  });

  if (!loyalty) {
    return { rewards: [], userTier: 'BRONZE' as LoyaltyTier };
  }

  // Get tier hierarchy
  const tiers: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
  const userTierIndex = tiers.indexOf(loyalty.currentTier);
  const accessibleTiers = tiers.slice(0, userTierIndex + 1);

  const rewards = await prisma.partnerReward.findMany({
    where: {
      isActive: true,
      minTierRequired: { in: accessibleTiers },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: new Date() } }
      ]
    },
    include: {
      partner: true,
      redemptions: {
        where: { loyaltyId: loyalty.id }
      }
    },
    orderBy: [
      { minTierRequired: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  return {
    rewards: rewards.map(reward => ({
      ...reward,
      remainingRedemptions: reward.maxRedemptions 
        ? reward.maxRedemptions - reward.redemptions.length 
        : Infinity,
      userHasRedeemed: reward.redemptions.length > 0,
      canRedeem: !reward.maxRedemptions || reward.redemptions.length < reward.maxRedemptions
    })),
    userTier: loyalty.currentTier
  };
}

/**
 * Redeem a reward
 */
export async function redeemReward(userId: string, rewardId: string) {
  const loyalty = await prisma.userLoyalty.findUnique({
    where: { userId }
  });

  if (!loyalty) {
    return { success: false, error: 'Loyalty account not found' };
  }

  const reward = await prisma.partnerReward.findUnique({
    where: { id: rewardId },
    include: {
      partner: true,
      redemptions: true
    }
  });

  if (!reward) {
    return { success: false, error: 'Reward not found' };
  }

  if (!reward.isActive) {
    return { success: false, error: 'Reward is no longer active' };
  }

  // Check tier requirement
  if (!isTierEligible(loyalty.currentTier, reward.minTierRequired)) {
    return { 
      success: false, 
      error: `Requires ${reward.minTierRequired} tier or higher` 
    };
  }

  // Check if max redemptions reached
  if (reward.maxRedemptions && reward.redemptions.length >= reward.maxRedemptions) {
    return { success: false, error: 'Maximum redemptions reached for this reward' };
  }

  // Check expiry
  if (reward.expiryDate && reward.expiryDate < new Date()) {
    return { success: false, error: 'Reward has expired' };
  }

  // Create redemption
  try {
    const code = generateRedemptionCode();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const redemption = await prisma.rewardRedemption.create({
      data: {
        loyaltyId: loyalty.id,
        rewardId: reward.id,
        code,
        expiresAt,
        status: 'ACTIVE'
      },
      include: {
        reward: {
          include: {
            partner: true
          }
        }
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: `🎁 Reward Redeemed: ${reward.title}`,
        message: `Your redemption code: ${code}. Valid until ${expiresAt.toLocaleDateString()}`,
        type: 'REWARD_REDEMPTION'
      }
    });

    return {
      success: true,
      redemption,
      code
    };
  } catch (error) {
    console.error("[redeemReward]", error);
    return { success: false, error: 'Failed to create redemption' };
  }
}

/**
 * Check if user's tier meets requirement
 */
function isTierEligible(userTier: LoyaltyTier, requiredTier: LoyaltyTier): boolean {
  const tiers: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
  const userIndex = tiers.indexOf(userTier);
  const requiredIndex = tiers.indexOf(requiredTier);
  return userIndex >= requiredIndex;
}

/**
 * Validate a redemption code
 */
export async function validateRedemptionCode(code: string) {
  const redemption = await prisma.rewardRedemption.findUnique({
    where: { code },
    include: {
      reward: {
        include: {
          partner: true
        }
      },
      loyalty: {
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!redemption) {
    return { valid: false, error: 'Invalid code' };
  }

  if (redemption.status === 'USED') {
    return { valid: false, error: 'Code already used' };
  }

  if (redemption.status === 'EXPIRED' || redemption.expiresAt < new Date()) {
    return { valid: false, error: 'Code has expired' };
  }

  return {
    valid: true,
    redemption
  };
}

/**
 * Mark redemption as used (called by partner)
 */
export async function markRedemptionUsed(code: string) {
  try {
    await prisma.rewardRedemption.update({
      where: { code },
      data: {
        status: 'USED',
        usedAt: new Date()
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[markRedemptionUsed]", error);
    return { success: false };
  }
}

/**
 * Get user's redemption history
 */
export async function getUserRedemptions(userId: string) {
  const loyalty = await prisma.userLoyalty.findUnique({
    where: { userId }
  });

  if (!loyalty) {
    return [];
  }

  const redemptions = await prisma.rewardRedemption.findMany({
    where: { loyaltyId: loyalty.id },
    include: {
      reward: {
        include: {
          partner: true
        }
      }
    },
    orderBy: { redeemedAt: 'desc' }
  });

  return redemptions;
}

/**
 * Get leaderboard (top users by points)
 */
export async function getLeaderboard(limit: number = 10) {
  const topUsers = await prisma.userLoyalty.findMany({
    take: limit,
    orderBy: [
      { points: 'desc' },
      { lifetimePoints: 'desc' }
    ],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          profile: {
            select: {
              location: true
            }
          }
        }
      }
    }
  });

  return topUsers;
}
