import prisma from "@/lib/prisma";
import { BADGE_DEFINITIONS } from "./badge-definitions";

/**
 * Main function to check and award all applicable badges for a user
 */
export async function checkAndAwardBadges(userId: string) {
  const results = {
    checked: 0,
    awarded: [] as string[],
    progress: [] as Array<{ badgeSlug: string; current: number; required: number }>
  };

  for (const badgeDef of BADGE_DEFINITIONS) {
    results.checked++;
    
    // Check if user already has this badge
    const existingBadge = await prisma.userBadge.findFirst({
      where: {
        userId,
        badge: { slug: badgeDef.slug }
      }
    });

    if (existingBadge) {
      continue; // Already earned
    }

    // Check if user qualifies for this badge
    const qualifies = await checkBadgeRequirement(userId, badgeDef.requirement);
    
    if (qualifies.qualified) {
      await awardBadge(userId, badgeDef.slug);
      results.awarded.push(badgeDef.slug);
    } else if (qualifies.progress !== undefined) {
      results.progress.push({
        badgeSlug: badgeDef.slug,
        current: qualifies.progress,
        required: qualifies.required || 0
      });
    }
  }

  return results;
}

/**
 * Check if user meets requirements for a specific badge
 */
async function checkBadgeRequirement(
  userId: string,
  requirement: any
): Promise<{ qualified: boolean; progress?: number; required?: number }> {
  switch (requirement.type) {
    case 'JOB_COUNT':
      return await checkJobCount(userId, requirement.value);
    
    case 'AVG_COMPLETION_TIME':
      return await checkAvgCompletionTime(userId, requirement.value);
    
    case 'RATING_THRESHOLD':
      return await checkRatingThreshold(userId, requirement.rating, requirement.minReviews);
    
    case 'PROFILE_COMPLETENESS':
      return await checkProfileCompleteness(userId, requirement.value);
    
    default:
      return { qualified: false };
  }
}

/**
 * Check job completion count
 */
async function checkJobCount(userId: string, requiredCount: number) {
  const completedJobs = await prisma.booking.count({
    where: {
      providerId: userId,
      status: 'COMPLETED'
    }
  });

  return {
    qualified: completedJobs >= requiredCount,
    progress: completedJobs,
    required: requiredCount
  };
}

/**
 * Check average completion time
 */
async function checkAvgCompletionTime(userId: string, maxMinutes: number) {
  // Get completed bookings with timestamps
  const bookings = await prisma.booking.findMany({
    where: {
      providerId: userId,
      status: 'COMPLETED'
    },
    select: {
      createdAt: true,
      updatedAt: true
    }
  });

  if (bookings.length === 0) {
    return { qualified: false };
  }

  // Calculate average time (in minutes)
  const totalMinutes = bookings.reduce((sum, booking) => {
    const diffMs = booking.updatedAt.getTime() - booking.createdAt.getTime();
    return sum + (diffMs / 1000 / 60);
  }, 0);

  const avgMinutes = totalMinutes / bookings.length;

  return {
    qualified: avgMinutes <= maxMinutes,
    progress: Math.round(avgMinutes),
    required: maxMinutes
  };
}

/**
 * Check rating threshold
 */
async function checkRatingThreshold(userId: string, minRating: number, minReviews: number) {
  const reviews = await prisma.review.findMany({
    where: {
      targetId: userId
    },
    select: {
      rating: true
    }
  });

  if (reviews.length < minReviews) {
    return {
      qualified: false,
      progress: reviews.length,
      required: minReviews
    };
  }

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return {
    qualified: avgRating >= minRating,
    progress: Math.round(avgRating * 10) / 10,
    required: minRating
  };
}

/**
 * Check profile completeness
 */
async function checkProfileCompleteness(userId: string, requiredPercent: number) {
  const profile = await prisma.profile.findUnique({
    where: { userId }
  });

  if (!profile) {
    return { qualified: false, progress: 0, required: requiredPercent };
  }

  // Calculate completeness percentage
  const fields = [
    profile.bio,
    profile.hourlyRate,
    profile.location,
    profile.idDocument,
    profile.skills.length > 0,
    profile.portfolio.length > 0
  ];

  const filledFields = fields.filter(f => f).length;
  const completeness = Math.round((filledFields / fields.length) * 100);

  return {
    qualified: completeness >= requiredPercent,
    progress: completeness,
    required: requiredPercent
  };
}

/**
 * Award a specific badge to a user
 */
export async function awardBadge(userId: string, badgeSlug: string) {
  // Find badge by slug
  let badge = await prisma.badge.findUnique({
    where: { slug: badgeSlug }
  });

  // If badge doesn't exist in DB, create it from definition
  if (!badge) {
    const badgeDef = BADGE_DEFINITIONS.find(b => b.slug === badgeSlug);
    if (!badgeDef) {
      throw new Error(`Badge definition not found: ${badgeSlug}`);
    }

    badge = await prisma.badge.create({
      data: {
        slug: badgeDef.slug,
        name: badgeDef.name,
        description: badgeDef.description,
        category: badgeDef.category,
        icon: badgeDef.icon,
        color: badgeDef.color,
        requirement: badgeDef.requirement as any,
        points: badgeDef.points
      }
    });
  }

  // Award badge to user (upsert to avoid duplicates)
  await prisma.userBadge.upsert({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id
      }
    },
    update: {},
    create: {
      userId,
      badgeId: badge.id
    }
  });

  // Create notification
  await prisma.notification.create({
    data: {
      userId,
      title: `🎉 Badge Earned: ${badge.name}!`,
      message: badge.description,
      type: 'BADGE_EARNED'
    }
  });

  return badge;
}

/**
 * Sync all badge definitions to database
 */
export async function syncBadgeDefinitions() {
  const results = {
    created: 0,
    updated: 0,
    total: BADGE_DEFINITIONS.length
  };

  for (const badgeDef of BADGE_DEFINITIONS) {
    const existing = await prisma.badge.findUnique({
      where: { slug: badgeDef.slug }
    });

    if (existing) {
      await prisma.badge.update({
        where: { slug: badgeDef.slug },
        data: {
          name: badgeDef.name,
          description: badgeDef.description,
          category: badgeDef.category,
          icon: badgeDef.icon,
          color: badgeDef.color,
          requirement: badgeDef.requirement as any,
          points: badgeDef.points
        }
      });
      results.updated++;
    } else {
      await prisma.badge.create({
        data: {
          slug: badgeDef.slug,
          name: badgeDef.name,
          description: badgeDef.description,
          category: badgeDef.category,
          icon: badgeDef.icon,
          color: badgeDef.color,
          requirement: badgeDef.requirement as any,
          points: badgeDef.points
        }
      });
      results.created++;
    }
  }

  return results;
}
