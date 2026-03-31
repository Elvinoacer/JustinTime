"use server";

import { auth } from "@/auth";
import {
  getUserLoyaltyStatus,
  awardPoints,
} from "@/lib/loyalty/tier-calculator";
import {
  getAvailableRewards,
  redeemReward,
  getUserRedemptions,
  getLeaderboard,
} from "@/lib/loyalty/reward-manager";
import { seedPartners } from "@/lib/loyalty/partner-seeder";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { hasRole } from "@/lib/auth/roles";

/**
 * Get current user's loyalty status
 */
export async function getLoyaltyStatus() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const status = await getUserLoyaltyStatus(session.user.id);
    return {
      success: true,
      loyalty: status,
    };
  } catch (error) {
    console.error("[getLoyaltyStatus]", error);
    return { success: false, error: "Failed to fetch loyalty status" };
  }
}

/**
 * Get point transaction history
 */
export async function getPointHistory(limit: number = 20) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const loyalty = await prisma.userLoyalty.findUnique({
      where: { userId: session.user.id },
      include: {
        pointHistory: {
          orderBy: { createdAt: "desc" },
          take: limit,
        },
      },
    });

    return {
      success: true,
      history: loyalty?.pointHistory || [],
    };
  } catch (error) {
    console.error("[getPointHistory]", error);
    return { success: false, error: "Failed to fetch history" };
  }
}

/**
 * Get available partner rewards
 */
export async function getAvailablePartnerRewards() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await getAvailableRewards(session.user.id);
    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error("[getAvailablePartnerRewards]", error);
    return { success: false, error: "Failed to fetch rewards" };
  }
}

/**
 * Redeem a partner reward
 */
export async function redeemPartnerReward(rewardId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await redeemReward(session.user.id, rewardId);
    revalidatePath("/dashboard/loyalty");
    return result;
  } catch (error) {
    console.error("[redeemPartnerReward]", error);
    return { success: false, error: "Failed to redeem reward" };
  }
}

/**
 * Get redemption history
 */
export async function getRedemptionHistory() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const redemptions = await getUserRedemptions(session.user.id);
    return {
      success: true,
      redemptions,
    };
  } catch (error) {
    console.error("[getRedemptionHistory]", error);
    return { success: false, error: "Failed to fetch redemptions" };
  }
}

/**
 * Get loyalty leaderboard
 */
export async function getLoyaltyLeaderboard(limit: number = 10) {
  try {
    const leaderboard = await getLeaderboard(limit);
    return {
      success: true,
      leaderboard,
    };
  } catch (error) {
    console.error("[getLoyaltyLeaderboard]", error);
    return { success: false, error: "Failed to fetch leaderboard" };
  }
}

/**
 * Seed partner ecosystem (admin only)
 */
export async function seedPartnerEcosystem() {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const results = await seedPartners();
    revalidatePath("/dashboard/loyalty");
    return {
      success: true,
      ...results,
    };
  } catch (error) {
    console.error("[seedPartnerEcosystem]", error);
    return { success: false, error: "Failed to seed partners" };
  }
}

/**
 * Manually award points (admin only)
 */
export async function manuallyAwardPoints(
  userId: string,
  points: number,
  reason: string,
) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const result = await awardPoints(userId, reason, points);
    revalidatePath("/dashboard/loyalty");
    return result;
  } catch (error) {
    console.error("[manuallyAwardPoints]", error);
    return { success: false, error: "Failed to award points" };
  }
}
