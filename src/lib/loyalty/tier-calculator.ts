import prisma from "@/lib/prisma";
import { LoyaltyTier } from "@/generated/prisma/client";

/**
 * Tier thresholds and benefits
 */
export const TIER_THRESHOLDS = {
  BRONZE: { minPoints: 0, maxPoints: 999, partnerCount: 1, color: '#CD7F32' },
  SILVER: { minPoints: 1000, maxPoints: 2999, partnerCount: 3, color: '#C0C0C0' },
  GOLD: { minPoints: 3000, maxPoints: 6999, partnerCount: 5, color: '#FFD700' },
  PLATINUM: { minPoints: 7000, maxPoints: 14999, partnerCount: 10, color: '#E5E4E2' },
  DIAMOND: { minPoints: 15000, maxPoints: Infinity, partnerCount: Infinity, color: '#B9F2FF' }
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
  PERFECT_WEEK: 200, // 7 jobs with 5-star ratings in a week
  REFERRAL: 150,
  PROFILE_COMPLETE: 100,
  TIER_BONUS_SILVER: 100,
  TIER_BONUS_GOLD: 250,
  TIER_BONUS_PLATINUM: 500,
  TIER_BONUS_DIAMOND: 1000
};

/**
 * Calculate tier from points
 */
export function calculateTierFromPoints(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS.DIAMOND.minPoints) return 'DIAMOND';
  if (points >= TIER_THRESHOLDS.PLATINUM.minPoints) return 'PLATINUM';
  if (points >= TIER_THRESHOLDS.GOLD.minPoints) return 'GOLD';
  if (points >= TIER_THRESHOLDS.SILVER.minPoints) return 'SILVER';
  return 'BRONZE';
}

/**
 * Calculate progress to next tier (0-100%)
 */
export function calculateTierProgress(currentPoints: number, currentTier: LoyaltyTier): number {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 100; // Already at max tier
  
  const currentThreshold = TIER_THRESHOLDS[currentTier];
  const nextThreshold = TIER_THRESHOLDS[nextTier];
  
  const pointsInCurrentTier = currentPoints - currentThreshold.minPoints;
  const pointsNeededForNext = nextThreshold.minPoints - currentThreshold.minPoints;
  
  return Math.min((pointsInCurrentTier / pointsNeededForNext) * 100, 100);
}

/**
 * Get next tier in the hierarchy
 */
function getNextTier(currentTier: LoyaltyTier): LoyaltyTier | null {
  const tiers: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
  const currentIndex = tiers.indexOf(currentTier);
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
}

/**
 * Award points to a user
 */
export async function awardPoints(
  userId: string,
  reason: string,
  points: number,
  metadata?: any
): Promise<{ success: boolean; newTier?: LoyaltyTier; tierUpgrade?: boolean }> {
  try {
    // Get or create loyalty record
    let loyalty = await prisma.userLoyalty.findUnique({
      where: { userId }
    });

    if (!loyalty) {
      loyalty = await prisma.userLoyalty.create({
        data: { userId }
      });
    }

    const oldTier = loyalty.currentTier;
    const newPoints = loyalty.points + points;
    const newTier = calculateTierFromPoints(newPoints);
    const tierUpgrade = newTier !== oldTier;

    // Update loyalty record
    await prisma.$transaction(async (tx) => {
      // Add point transaction
      await tx.loyaltyPointTransaction.create({
        data: {
          loyaltyId: loyalty!.id,
          points,
          reason,
          metadata: metadata || {}
        }
      });

      // Update loyalty record
      await tx.userLoyalty.update({
        where: { id: loyalty!.id },
        data: {
          points: newPoints,
          lifetimePoints: loyalty!.lifetimePoints + points,
          currentTier: newTier,
          tierProgress: calculateTierProgress(newPoints, newTier),
          lastTierUpdate: tierUpgrade ? new Date() : loyalty!.lastTierUpdate
        }
      });

      // If tier upgraded, award tier bonus
      if (tierUpgrade && newTier !== 'BRONZE') {
        const bonusKey = `TIER_BONUS_${newTier}` as keyof typeof POINT_RULES;
        const bonusPoints = POINT_RULES[bonusKey] || 0;
        
        if (bonusPoints > 0) {
          await tx.loyaltyPointTransaction.create({
            data: {
              loyaltyId: loyalty!.id,
              points: bonusPoints,
              reason: `Tier Upgrade Bonus - ${newTier}`,
              metadata: { tierUpgrade: true, fromTier: oldTier, toTier: newTier }
            }
          });

          await tx.userLoyalty.update({
            where: { id: loyalty!.id },
            data: {
              points: newPoints + bonusPoints,
              lifetimePoints: loyalty!.lifetimePoints + points + bonusPoints
            }
          });
        }

        // Create notification
        await tx.notification.create({
          data: {
            userId,
            title: `🎉 Tier Upgrade: Welcome to ${newTier}!`,
            message: `Congratulations! You've been promoted to ${newTier} tier. Unlock exclusive partner rewards!`,
            type: 'TIER_UPGRADE'
          }
        });
      }
    });

    return {
      success: true,
      newTier: tierUpgrade ? newTier : undefined,
      tierUpgrade
    };
  } catch (error) {
    console.error("[awardPoints]", error);
    return { success: false };
  }
}

/**
 * Get user's loyalty status with tier info
 */
export async function getUserLoyaltyStatus(userId: string) {
  let loyalty = await prisma.userLoyalty.findUnique({
    where: { userId },
    include: {
      pointHistory: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!loyalty) {
    loyalty = await prisma.userLoyalty.create({
      data: { userId },
      include: {
        pointHistory: true
      }
    });
  }

  const currentTierInfo = TIER_THRESHOLDS[loyalty.currentTier];
  const nextTier = getNextTier(loyalty.currentTier);
  const nextTierInfo = nextTier ? TIER_THRESHOLDS[nextTier] : null;
  
  const pointsToNextTier = nextTierInfo 
    ? nextTierInfo.minPoints - loyalty.points 
    : 0;

  return {
    ...loyalty,
    currentTierInfo,
    nextTier,
    nextTierInfo,
    pointsToNextTier,
    progress: calculateTierProgress(loyalty.points, loyalty.currentTier)
  };
}

/**
 * Check for perfect week achievement
 */
export async function checkPerfectWeekAchievement(userId: string): Promise<boolean> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const recentJobs = await prisma.booking.findMany({
    where: {
      providerId: userId,
      status: 'COMPLETED',
      updatedAt: { gte: oneWeekAgo }
    },
    include: {
      review: true
    }
  });

  // Check if we have exactly 7 jobs, all with 5-star reviews
  if (recentJobs.length >= 7) {
    const fiveStarCount = recentJobs.filter(job => 
      job.review && job.review.rating === 5
    ).length;
    
    if (fiveStarCount >= 7) {
      await awardPoints(userId, 'Perfect Week - 7 Five-Star Jobs', POINT_RULES.PERFECT_WEEK);
      return true;
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
  points: number
): Promise<boolean> {
  const loyalty = await prisma.userLoyalty.findUnique({
    where: { userId }
  });

  if (!loyalty || loyalty.points < points) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.loyaltyPointTransaction.create({
      data: {
        loyaltyId: loyalty.id,
        points: -points,
        reason,
        metadata: { deduction: true }
      }
    });

    const newPoints = loyalty.points - points;
    const newTier = calculateTierFromPoints(newPoints);

    await tx.userLoyalty.update({
      where: { id: loyalty.id },
      data: {
        points: newPoints,
        currentTier: newTier,
        tierProgress: calculateTierProgress(newPoints, newTier)
      }
    });
  });

  return true;
}
