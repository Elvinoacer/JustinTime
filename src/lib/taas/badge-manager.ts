/**
 * Badge Manager
 * Handles verification badge issuance, revocation, and status management
 */

import prisma from "@/lib/prisma";
import { BadgeType, BadgeStatus } from "@/generated/prisma/client";
import { updateTrustScore } from "./trust-score-calculator";

export interface BadgeRequest {
  userId: string;
  type: BadgeType;
  documentUrl?: string;
  metadata?: Record<string, any>;
}

// Badge expiration periods (in days)
const BADGE_EXPIRY_DAYS: Partial<Record<BadgeType, number>> = {
  GOOD_CONDUCT: 365, // 1 year
  KRA_VERIFIED: 365, // 1 year
  IDENTITY_VERIFIED: 730, // 2 years
  INSURANCE_ACTIVE: 365, // 1 year
  SKILLS_CERTIFIED: 730, // 2 years
};

/**
 * Request a verification badge
 */
export async function requestBadge(request: BadgeRequest) {
  const existing = await prisma.verificationBadge.findUnique({
    where: {
      userId_type: {
        userId: request.userId,
        type: request.type,
      },
    },
  });

  if (existing && existing.status === "VERIFIED") {
    return { success: false, error: "Badge already verified" };
  }

  const badge = await prisma.verificationBadge.upsert({
    where: {
      userId_type: {
        userId: request.userId,
        type: request.type,
      },
    },
    update: {
      status: "PENDING",
      documentUrl: request.documentUrl,
      metadata: request.metadata as any,
    },
    create: {
      userId: request.userId,
      type: request.type,
      status: "PENDING",
      documentUrl: request.documentUrl,
      metadata: request.metadata as any,
    },
  });

  // Log the request
  await prisma.verificationAudit.create({
    data: {
      userId: request.userId,
      action: "BADGE_REQUESTED",
      badgeType: request.type,
      performedBy: request.userId,
    },
  });

  return { success: true, badge };
}

/**
 * Approve a badge (admin action)
 */
export async function approveBadge(
  badgeId: string,
  adminId: string,
  notes?: string,
) {
  const badge = await prisma.verificationBadge.findUnique({
    where: { id: badgeId },
  });

  if (!badge) {
    return { success: false, error: "Badge not found" };
  }

  const expiryDays = BADGE_EXPIRY_DAYS[badge.type];
  const expiresAt = expiryDays
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
    : null;

  const updated = await prisma.verificationBadge.update({
    where: { id: badgeId },
    data: {
      status: "VERIFIED",
      verifiedAt: new Date(),
      verifiedBy: adminId,
      expiresAt,
      notes,
    },
  });

  // Log approval
  await prisma.verificationAudit.create({
    data: {
      userId: badge.userId,
      action: "BADGE_GRANTED",
      badgeType: badge.type,
      previousValue: "PENDING",
      newValue: "VERIFIED",
      performedBy: adminId,
      reason: notes,
    },
  });

  // Recalculate trust score
  await updateTrustScore(badge.userId);

  return { success: true, badge: updated };
}

/**
 * Revoke a badge (admin action)
 */
export async function revokeBadge(
  badgeId: string,
  adminId: string,
  reason: string,
) {
  const badge = await prisma.verificationBadge.findUnique({
    where: { id: badgeId },
  });

  if (!badge) {
    return { success: false, error: "Badge not found" };
  }

  const updated = await prisma.verificationBadge.update({
    where: { id: badgeId },
    data: {
      status: "REVOKED",
      notes: reason,
    },
  });

  // Log revocation
  await prisma.verificationAudit.create({
    data: {
      userId: badge.userId,
      action: "BADGE_REVOKED",
      badgeType: badge.type,
      previousValue: badge.status,
      newValue: "REVOKED",
      performedBy: adminId,
      reason,
    },
  });

  // Recalculate trust score
  await updateTrustScore(badge.userId);

  return { success: true, badge: updated };
}

/**
 * Get user's badges
 */
export async function getUserBadges(userId: string) {
  const badges = await prisma.verificationBadge.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return badges;
}

/**
 * Get verified badges only
 */
export async function getVerifiedBadges(userId: string) {
  const badges = await prisma.verificationBadge.findMany({
    where: {
      userId,
      status: "VERIFIED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  return badges;
}

/**
 * Check and grant automatic badges
 */
export async function checkAutomaticBadges(userId: string) {
  const grantedBadges: BadgeType[] = [];

  // Check SOS_ENABLED
  const trustedContacts = await prisma.trustedContact.count({
    where: { userId },
  });

  if (trustedContacts >= 2) {
    const sosBadge = await prisma.verificationBadge.findUnique({
      where: { userId_type: { userId, type: "SOS_ENABLED" } },
    });

    if (!sosBadge || sosBadge.status !== "VERIFIED") {
      await prisma.verificationBadge.upsert({
        where: { userId_type: { userId, type: "SOS_ENABLED" } },
        update: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: "SYSTEM",
        },
        create: {
          userId,
          type: "SOS_ENABLED",
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: "SYSTEM",
        },
      });
      grantedBadges.push("SOS_ENABLED");
    }
  }

  // Check TOP_RATED
  const reviews = await prisma.review.findMany({
    where: { targetId: userId },
  });

  if (reviews.length >= 50) {
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    if (avgRating >= 4.8) {
      const topRatedBadge = await prisma.verificationBadge.findUnique({
        where: { userId_type: { userId, type: "TOP_RATED" } },
      });

      if (!topRatedBadge || topRatedBadge.status !== "VERIFIED") {
        await prisma.verificationBadge.upsert({
          where: { userId_type: { userId, type: "TOP_RATED" } },
          update: {
            status: "VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: "SYSTEM",
          },
          create: {
            userId,
            type: "TOP_RATED",
            status: "VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: "SYSTEM",
          },
        });
        grantedBadges.push("TOP_RATED");
      }
    }
  }

  // Check KRA_VERIFIED
  const taxSettings = await prisma.taxSettings.findUnique({
    where: { userId },
  });
  if (taxSettings?.kraPinVerified) {
    const kraBadge = await prisma.verificationBadge.findUnique({
      where: { userId_type: { userId, type: "KRA_VERIFIED" } },
    });

    if (!kraBadge || kraBadge.status !== "VERIFIED") {
      await prisma.verificationBadge.upsert({
        where: { userId_type: { userId, type: "KRA_VERIFIED" } },
        update: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: "SYSTEM",
        },
        create: {
          userId,
          type: "KRA_VERIFIED",
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: "SYSTEM",
        },
      });
      grantedBadges.push("KRA_VERIFIED");
    }
  }

  // Update trust score if badges were granted
  if (grantedBadges.length > 0) {
    await updateTrustScore(userId);
  }

  return grantedBadges;
}

/**
 * Get expiring badges (for admin notification)
 */
export async function getExpiringBadges(daysAhead: number = 30) {
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

  const badges = await prisma.verificationBadge.findMany({
    where: {
      status: "VERIFIED",
      expiresAt: {
        lte: futureDate,
        not: null,
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { expiresAt: "asc" },
  });

  return badges;
}

/**
 * Process expired badges
 */
export async function processExpiredBadges() {
  const now = new Date();

  const expired = await prisma.verificationBadge.findMany({
    where: {
      status: "VERIFIED",
      expiresAt: { lt: now },
    },
  });

  for (const badge of expired) {
    await prisma.verificationBadge.update({
      where: { id: badge.id },
      data: { status: "EXPIRED" },
    });

    await prisma.verificationAudit.create({
      data: {
        userId: badge.userId,
        action: "BADGE_EXPIRED",
        badgeType: badge.type,
        previousValue: "VERIFIED",
        newValue: "EXPIRED",
        performedBy: "SYSTEM",
      },
    });

    await updateTrustScore(badge.userId);
  }

  return expired.length;
}
