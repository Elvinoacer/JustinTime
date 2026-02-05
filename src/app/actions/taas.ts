"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { BadgeType } from "@/generated/prisma";
import { 
  requestBadge, 
  approveBadge, 
  revokeBadge, 
  getUserBadges,
  getVerifiedBadges,
  checkAutomaticBadges,
  getExpiringBadges
} from "@/lib/taas/badge-manager";
import { 
  getTrustScore, 
  updateTrustScore,
  TrustScoreBreakdown
} from "@/lib/taas/trust-score-calculator";

// ============ USER ACTIONS ============

/**
 * Get current user's verification status
 */
export async function getMyVerificationStatus() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [badges, trustScore] = await Promise.all([
      getUserBadges(session.user.id),
      getTrustScore(session.user.id)
    ]);

    return {
      success: true,
      badges,
      trustScore,
      isGovernmentVerified: badges.some(
        b => b.status === 'VERIFIED' && 
        ['KRA_VERIFIED', 'GOOD_CONDUCT', 'IDENTITY_VERIFIED'].includes(b.type)
      ),
      isPremiumEligible: trustScore?.premiumEligible || false
    };
  } catch (error) {
    console.error("[getMyVerificationStatus]", error);
    return { success: false, error: "Failed to get status" };
  }
}

/**
 * Request a verification badge
 */
export async function requestVerificationBadge(
  type: BadgeType,
  documentUrl?: string,
  metadata?: Record<string, any>
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await requestBadge({
      userId: session.user.id,
      type,
      documentUrl,
      metadata
    });

    revalidatePath('/dashboard/verification');
    return result;
  } catch (error) {
    console.error("[requestVerificationBadge]", error);
    return { success: false, error: "Failed to request badge" };
  }
}

/**
 * Trigger automatic badge checks
 */
export async function checkMyAutomaticBadges() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const granted = await checkAutomaticBadges(session.user.id);
    revalidatePath('/dashboard/verification');
    return { success: true, grantedBadges: granted };
  } catch (error) {
    console.error("[checkMyAutomaticBadges]", error);
    return { success: false, error: "Failed to check badges" };
  }
}

/**
 * Refresh trust score
 */
export async function refreshMyTrustScore() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const score = await updateTrustScore(session.user.id);
    revalidatePath('/dashboard/verification');
    return { success: true, score };
  } catch (error) {
    console.error("[refreshMyTrustScore]", error);
    return { success: false, error: "Failed to refresh score" };
  }
}

/**
 * Toggle premium pricing
 */
export async function togglePremiumPricing(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Check eligibility
    const trustScore = await getTrustScore(session.user.id);
    if (!trustScore?.premiumEligible) {
      return { success: false, error: "Not eligible for premium pricing yet" };
    }

    // Update user profile with premium pricing status
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        premiumPricingEnabled: enabled,
        premiumMultiplier: enabled ? trustScore.premiumMultiplier : 1.0
      }
    });

    revalidatePath('/dashboard');
    return { success: true, enabled, multiplier: enabled ? trustScore.premiumMultiplier : 1.0 };
  } catch (error) {
    console.error("[togglePremiumPricing]", error);
    return { success: false, error: "Failed to toggle premium pricing" };
  }
}

// ============ ADMIN ACTIONS ============

/**
 * Get pending badge requests (admin)
 */
export async function getPendingBadgeRequests() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const badges = await prisma.verificationBadge.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return { success: true, badges };
  } catch (error) {
    console.error("[getPendingBadgeRequests]", error);
    return { success: false, error: "Failed to get requests" };
  }
}

/**
 * Approve a badge (admin)
 */
export async function adminApproveBadge(badgeId: string, notes?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await approveBadge(badgeId, session.user.id, notes);
    revalidatePath('/admin/verification');
    return result;
  } catch (error) {
    console.error("[adminApproveBadge]", error);
    return { success: false, error: "Failed to approve badge" };
  }
}

/**
 * Reject/revoke a badge (admin)
 */
export async function adminRevokeBadge(badgeId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await revokeBadge(badgeId, session.user.id, reason);
    revalidatePath('/admin/verification');
    return result;
  } catch (error) {
    console.error("[adminRevokeBadge]", error);
    return { success: false, error: "Failed to revoke badge" };
  }
}

/**
 * Get expiring badges (admin)
 */
export async function getExpiringBadgesAdmin(daysAhead: number = 30) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const badges = await getExpiringBadges(daysAhead);
    return { success: true, badges };
  } catch (error) {
    console.error("[getExpiringBadgesAdmin]", error);
    return { success: false, error: "Failed to get expiring badges" };
  }
}

/**
 * Get provider verification for public view
 */
export async function getProviderVerification(userId: string) {
  try {
    const [badges, trustScore] = await Promise.all([
      getVerifiedBadges(userId),
      getTrustScore(userId)
    ]);

    return {
      success: true,
      badges: badges.map(b => ({ type: b.type, verifiedAt: b.verifiedAt })),
      tier: trustScore?.tier || 'UNVERIFIED',
      overallScore: trustScore?.overallScore || 0,
      isPremium: trustScore?.premiumEligible || false
    };
  } catch (error) {
    console.error("[getProviderVerification]", error);
    return { success: false, error: "Failed to get verification" };
  }
}

/**
 * Filter providers by verification tier
 */
export async function getVerifiedProviders(minTier: string = 'VERIFIED') {
  try {
    const tiers = ['UNVERIFIED', 'BASIC', 'VERIFIED', 'PREMIUM', 'ELITE'];
    const minIndex = tiers.indexOf(minTier);
    const eligibleTiers = tiers.slice(minIndex);

    const providers = await prisma.trustScore.findMany({
      where: {
        tier: { in: eligibleTiers }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: {
              select: { bio: true, location: true }
            }
          }
        }
      },
      orderBy: { overallScore: 'desc' }
    });

    return { success: true, providers };
  } catch (error) {
    console.error("[getVerifiedProviders]", error);
    return { success: false, error: "Failed to get providers" };
  }
}
