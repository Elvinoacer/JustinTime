/**
 * Trust Score Calculator
 * Calculates comprehensive trust scores for TaaS Premium Verification
 */

import prisma from "@/lib/prisma";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";

// Score weights (must sum to 100)
const SCORE_WEIGHTS = {
  identity: 25, // ID & KRA verification
  conduct: 25, // Background check
  performance: 20, // Ratings & reviews
  reliability: 15, // Completion rate
  compliance: 15, // Tax & legal compliance
};

// Tier thresholds
const TIER_THRESHOLDS = {
  ELITE: 90,
  PREMIUM: 75,
  VERIFIED: 60,
  BASIC: 40,
  UNVERIFIED: 0,
};

// Premium multipliers by tier
const PREMIUM_MULTIPLIERS = {
  ELITE: 1.3, // +30%
  PREMIUM: 1.2, // +20%
  VERIFIED: 1.1, // +10%
  BASIC: 1.0,
  UNVERIFIED: 1.0,
};

export interface TrustScoreBreakdown {
  identityScore: number;
  conductScore: number;
  performanceScore: number;
  reliabilityScore: number;
  complianceScore: number;
  overallScore: number;
  tier: string;
  premiumEligible: boolean;
  premiumMultiplier: number;
}

/**
 * Calculate trust score for a user
 */
export async function calculateTrustScore(
  userId: string,
): Promise<TrustScoreBreakdown> {
  const [user, badges, reviews, bookings, taxSettings, backgroundCheck] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      prisma.verificationBadge.findMany({
        where: { userId, status: "VERIFIED" },
      }),
      prisma.review.findMany({
        where: { targetId: userId },
      }),
      prisma.booking.findMany({
        where: { providerId: userId },
      }),
      prisma.taxSettings.findUnique({ where: { userId } }),
      prisma.backgroundCheck.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  if (!user) {
    return getDefaultScore();
  }

  // Calculate identity score (0-100)
  const identityScore = calculateIdentityScore(badges, user);

  // Calculate conduct score (0-100)
  const conductScore = calculateConductScore(badges, backgroundCheck);

  // Calculate performance score (0-100)
  const performanceScore = calculatePerformanceScore(reviews);

  // Calculate reliability score (0-100)
  const reliabilityScore = calculateReliabilityScore(bookings);

  // Calculate compliance score (0-100)
  const complianceScore = calculateComplianceScore(badges, taxSettings);

  // Calculate weighted overall score
  const overallScore = Math.round(
    (identityScore * SCORE_WEIGHTS.identity +
      conductScore * SCORE_WEIGHTS.conduct +
      performanceScore * SCORE_WEIGHTS.performance +
      reliabilityScore * SCORE_WEIGHTS.reliability +
      complianceScore * SCORE_WEIGHTS.compliance) /
      100,
  );

  // Determine tier
  const tier = getTierFromScore(overallScore);

  // Premium eligibility (requires at least VERIFIED tier)
  const premiumEligible = ["VERIFIED", "PREMIUM", "ELITE"].includes(tier);
  const premiumMultiplier =
    PREMIUM_MULTIPLIERS[tier as keyof typeof PREMIUM_MULTIPLIERS] || 1.0;

  return {
    identityScore,
    conductScore,
    performanceScore,
    reliabilityScore,
    complianceScore,
    overallScore,
    tier,
    premiumEligible,
    premiumMultiplier,
  };
}

/**
 * Calculate and save trust score to database
 */
export async function updateTrustScore(
  userId: string,
): Promise<TrustScoreBreakdown> {
  const breakdown = await calculateTrustScore(userId);

  await prisma.trustScore.upsert({
    where: { userId },
    update: {
      ...breakdown,
      lastCalculated: new Date(),
    },
    create: {
      userId,
      ...breakdown,
      lastCalculated: new Date(),
    },
  });

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      premiumPricingEnabled: true,
      premiumMultiplier: true,
    },
  });

  if (profile?.premiumPricingEnabled && !breakdown.premiumEligible) {
    await prisma.profile.update({
      where: { userId },
      data: {
        premiumPricingEnabled: false,
        premiumMultiplier: 1.0,
      },
    });

    await prisma.verificationAudit.create({
      data: {
        userId,
        action: "PREMIUM_REVOKED",
        previousValue: String(profile.premiumMultiplier ?? 1.0),
        newValue: "1.0",
        performedBy: "SYSTEM",
        reason: "Trust score dropped below premium eligibility threshold",
      },
    });

    await sendComprehensiveNotification({
      userId,
      title: "Premium pricing has been paused",
      message:
        "Your Trust Score is currently below the premium threshold, so premium pricing has been turned off automatically.",
      type: "TRUST_SCORE",
      emailSubject: "Premium pricing update - JustInTime",
      emailHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111827;">Premium pricing paused</h2>
          <p>Your latest Trust Score update moved you below the premium eligibility threshold.</p>
          <p>To protect pricing integrity, premium pricing has been disabled and your multiplier reset to 1.0x.</p>
          <p>You can re-enable premium pricing automatically when your score becomes eligible again.</p>
        </div>
      `,
    });
  } else if (
    profile?.premiumPricingEnabled &&
    profile.premiumMultiplier !== breakdown.premiumMultiplier
  ) {
    await prisma.profile.update({
      where: { userId },
      data: {
        premiumMultiplier: breakdown.premiumMultiplier,
      },
    });
  }

  // Log the update
  await prisma.verificationAudit.create({
    data: {
      userId,
      action: "SCORE_UPDATED",
      newValue: JSON.stringify(breakdown),
      performedBy: "SYSTEM",
    },
  });

  return breakdown;
}

/**
 * Get trust score for display
 */
export async function getTrustScore(userId: string) {
  let score = await prisma.trustScore.findUnique({ where: { userId } });

  // Calculate if doesn't exist or is stale (older than 24 hours)
  const isStale =
    score &&
    new Date().getTime() - score.lastCalculated.getTime() > 24 * 60 * 60 * 1000;

  if (!score || isStale) {
    await updateTrustScore(userId);
    score = await prisma.trustScore.findUnique({ where: { userId } });
  }

  return score;
}

// Helper functions

function calculateIdentityScore(badges: any[], user: any): number {
  let score = 0;

  // KRA verified badge: +40
  if (badges.some((b) => b.type === "KRA_VERIFIED")) {
    score += 40;
  }

  // Identity verified badge: +40
  if (badges.some((b) => b.type === "IDENTITY_VERIFIED")) {
    score += 40;
  }

  // Has complete profile: +20
  if (user.profile && user.profile.bio && user.profile.skills?.length > 0) {
    score += 20;
  }

  return Math.min(score, 100);
}

function calculateConductScore(badges: any[], backgroundCheck: any): number {
  let score = 0;

  // Good conduct badge: +60
  if (badges.some((b) => b.type === "GOOD_CONDUCT")) {
    score += 60;
  }

  // Background check cleared: +30
  if (backgroundCheck?.status === "APPROVED") {
    score += 30;
  }

  // SOS enabled: +10
  if (badges.some((b) => b.type === "SOS_ENABLED")) {
    score += 10;
  }

  return Math.min(score, 100);
}

function calculatePerformanceScore(reviews: any[]): number {
  if (reviews.length === 0) return 0;

  const avgRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  // Base score from rating (0-80)
  let score = Math.round((avgRating / 5) * 80);

  // Bonus for volume (up to +20)
  if (reviews.length >= 50) {
    score += 20;
  } else if (reviews.length >= 20) {
    score += 15;
  } else if (reviews.length >= 10) {
    score += 10;
  } else if (reviews.length >= 5) {
    score += 5;
  }

  return Math.min(score, 100);
}

function calculateReliabilityScore(bookings: any[]): number {
  if (bookings.length === 0) return 0;

  const completed = bookings.filter((b) => b.status === "COMPLETED").length;
  const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
  const total = bookings.length;

  // Completion rate score (0-80)
  const completionRate = completed / total;
  let score = Math.round(completionRate * 80);

  // Low cancellation bonus (up to +20)
  const cancellationRate = cancelled / total;
  if (cancellationRate < 0.05) {
    score += 20;
  } else if (cancellationRate < 0.1) {
    score += 10;
  }

  return Math.min(score, 100);
}

function calculateComplianceScore(badges: any[], taxSettings: any): number {
  let score = 0;

  // KRA PIN verified: +40
  if (taxSettings?.kraPinVerified) {
    score += 40;
  }

  // VAT registered: +20
  if (taxSettings?.vatRegistered) {
    score += 20;
  }

  // Insurance active: +20
  if (badges.some((b) => b.type === "INSURANCE_ACTIVE")) {
    score += 20;
  }

  // Skills certified: +20
  if (badges.some((b) => b.type === "SKILLS_CERTIFIED")) {
    score += 20;
  }

  return Math.min(score, 100);
}

function getTierFromScore(score: number): string {
  if (score >= TIER_THRESHOLDS.ELITE) return "ELITE";
  if (score >= TIER_THRESHOLDS.PREMIUM) return "PREMIUM";
  if (score >= TIER_THRESHOLDS.VERIFIED) return "VERIFIED";
  if (score >= TIER_THRESHOLDS.BASIC) return "BASIC";
  return "UNVERIFIED";
}

function getDefaultScore(): TrustScoreBreakdown {
  return {
    identityScore: 0,
    conductScore: 0,
    performanceScore: 0,
    reliabilityScore: 0,
    complianceScore: 0,
    overallScore: 0,
    tier: "UNVERIFIED",
    premiumEligible: false,
    premiumMultiplier: 1.0,
  };
}
