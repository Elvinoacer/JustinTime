"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  syncBadgeDefinitions,
  checkAndAwardBadges,
} from "@/lib/gamification/badge-checker";
import { revalidatePath } from "next/cache";
import { hasRole } from "@/lib/auth/roles";

/**
 * Get all badges for a user
 */
export async function getUserBadges(userId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const targetUserId = userId || session.user.id;

  try {
    const badges = await prisma.badge.findMany({
      where: { isActive: true },
      include: {
        userBadges: {
          where: { userId: targetUserId },
        },
      },
      orderBy: [{ category: "asc" }, { points: "asc" }],
    });

    const earnedBadges = badges.filter((b) => b.userBadges.length > 0);
    const totalPoints = earnedBadges.reduce((sum, b) => sum + b.points, 0);

    return {
      success: true,
      badges: badges.map((b) => ({
        ...b,
        earned: b.userBadges.length > 0,
        awardedAt: b.userBadges[0]?.awardedAt || null,
      })),
      stats: {
        totalBadges: badges.length,
        earnedBadges: earnedBadges.length,
        totalPoints,
        completionPercentage: Math.round(
          (earnedBadges.length / badges.length) * 100,
        ),
      },
    };
  } catch (error) {
    console.error("[getUserBadges]", error);
    return { success: false, error: "Failed to fetch badges" };
  }
}

/**
 * Get badge progress for current user
 */
export async function getBadgeProgress() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await checkAndAwardBadges(session.user.id);
    revalidatePath("/dashboard/achievements");

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error("[getBadgeProgress]", error);
    return { success: false, error: "Failed to check progress" };
  }
}

/**
 * Get all available badges (admin/public)
 */
export async function getAllBadges() {
  try {
    const badges = await prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { points: "asc" }],
    });

    return {
      success: true,
      badges,
    };
  } catch (error) {
    console.error("[getAllBadges]", error);
    return { success: false, error: "Failed to fetch badges" };
  }
}

/**
 * Sync badge definitions to database (admin only)
 */
export async function syncBadges() {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const results = await syncBadgeDefinitions();
    revalidatePath("/dashboard/achievements");

    return {
      success: true,
      ...results,
    };
  } catch (error) {
    console.error("[syncBadges]", error);
    return { success: false, error: "Failed to sync badges" };
  }
}

/**
 * Manually award a badge (admin only)
 */
export async function manuallyAwardBadge(userId: string, badgeSlug: string) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return { success: false, error: "Unauthorized - Admin only" };
  }

  try {
    const { awardBadge } = await import("@/lib/gamification/badge-checker");
    await awardBadge(userId, badgeSlug);
    revalidatePath("/dashboard/achievements");

    return {
      success: true,
      message: `Badge ${badgeSlug} awarded to user ${userId}`,
    };
  } catch (error) {
    console.error("[manuallyAwardBadge]", error);
    return { success: false, error: "Failed to award badge" };
  }
}
