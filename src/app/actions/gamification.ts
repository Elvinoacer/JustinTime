"use server";

import { auth } from "@/auth";
import {
  awardBadge,
  evaluateBadgeProgress,
  getBadgesForUser,
  syncBadgeDefinitions,
} from "@/lib/gamification/badge-service";
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
  const canReadTargetUser =
    targetUserId === session.user.id || hasRole(session.user, "ADMIN");

  if (!canReadTargetUser) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const result = await getBadgesForUser(targetUserId);

    return {
      success: true,
      badges: result.badges,
      stats: result.stats,
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
    const badges = await evaluateBadgeProgress(session.user.id);
    revalidatePath("/dashboard/achievements");

    return {
      success: true,
      checked: badges.length,
      awarded: [],
      progress: badges
        .filter((badge) => !badge.earned)
        .map((badge) => ({
          badgeSlug: badge.slug,
          current: badge.progressCurrent,
          required: badge.progressRequired,
        })),
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
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await getBadgesForUser(session.user.id);

    return {
      success: true,
      badges: result.badges,
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
    const result = await awardBadge(userId, badgeSlug, {
      trigger: "ADMIN_MANUAL_AWARD",
      actorUserId: session.user.id,
    });

    if (!result.awarded) {
      return {
        success: true,
        message: `Badge ${badgeSlug} already exists for user ${userId}`,
      };
    }

    revalidatePath("/dashboard/achievements");
    revalidatePath("/dashboard/loyalty");

    return {
      success: true,
      message: `Badge ${badgeSlug} awarded to user ${userId}`,
    };
  } catch (error) {
    console.error("[manuallyAwardBadge]", error);
    return { success: false, error: "Failed to award badge" };
  }
}
