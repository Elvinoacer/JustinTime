import prisma from "@/lib/prisma";
import { ChurnRiskLevel } from "@/generated/prisma";

export interface ChurnFactors {
  inactivityDays: number;
  inactivityScore: number;
  inactivityWeight: number;
  
  bookingDecline: number;
  bookingScore: number;
  bookingWeight: number;
  
  profileCompleteness: number;
  profileScore: number;
  profileWeight: number;
  
  avgRating: number;
  reviewScore: number;
  reviewWeight: number;
  
  totalScore: number;
}

export interface ChurnPrediction {
  score: number;
  riskLevel: ChurnRiskLevel;
  factors: ChurnFactors;
  lastActivityDays: number;
  bookingDecline: number | null;
  engagementScore: number;
}

/**
 * Calculate churn risk score for a user
 */
export async function calculateChurnScore(userId: string): Promise<ChurnPrediction> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      bookings: {
        where: { providerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 100
      },
      receivedReviews: {
        select: { rating: true }
      }
    }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // 1. INACTIVITY SCORE (40% weight)
  const lastActivity = await getLastActivity(userId);
  const daysSinceActivity = lastActivity 
    ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  let inactivityScore = 0;
  if (daysSinceActivity >= 30) inactivityScore = 1.0;
  else if (daysSinceActivity >= 15) inactivityScore = 0.6;
  else if (daysSinceActivity >= 8) inactivityScore = 0.3;
  else inactivityScore = 0;

  // 2. BOOKING DECLINE SCORE (30% weight)
  const bookingDeclineData = await calculateBookingDecline(userId);
  let bookingScore = 0;
  if (bookingDeclineData.decline >= 50) bookingScore = 1.0;
  else if (bookingDeclineData.decline >= 25) bookingScore = 0.5;
  else bookingScore = 0;

  // 3. PROFILE INCOMPLETENESS SCORE (15% weight)
  const profileCompleteness = calculateProfileCompleteness(user.profile);
  let profileScore = 0;
  if (profileCompleteness < 50) profileScore = 1.0;
  else if (profileCompleteness < 80) profileScore = 0.5;
  else profileScore = 0;

  // 4. NEGATIVE REVIEWS SCORE (15% weight)
  const avgRating = user.receivedReviews.length > 0
    ? user.receivedReviews.reduce((sum, r) => sum + r.rating, 0) / user.receivedReviews.length
    : 5.0;
  
  let reviewScore = 0;
  if (avgRating < 3.5) reviewScore = 1.0;
  else if (avgRating < 4.0) reviewScore = 0.5;
  else reviewScore = 0;

  // WEIGHTED TOTAL SCORE
  const weights = { inactivity: 0.4, booking: 0.3, profile: 0.15, review: 0.15 };
  const totalScore = 
    (inactivityScore * weights.inactivity) +
    (bookingScore * weights.booking) +
    (profileScore * weights.profile) +
    (reviewScore * weights.review);

  // Determine risk level
  let riskLevel: ChurnRiskLevel;
  if (totalScore >= 0.75) riskLevel = 'CRITICAL';
  else if (totalScore >= 0.5) riskLevel = 'HIGH';
  else if (totalScore >= 0.25) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  const factors: ChurnFactors = {
    inactivityDays: daysSinceActivity,
    inactivityScore,
    inactivityWeight: weights.inactivity,
    
    bookingDecline: bookingDeclineData.decline,
    bookingScore,
    bookingWeight: weights.booking,
    
    profileCompleteness,
    profileScore,
    profileWeight: weights.profile,
    
    avgRating,
    reviewScore,
    reviewWeight: weights.review,
    
    totalScore
  };

  return {
    score: parseFloat(totalScore.toFixed(3)),
    riskLevel,
    factors,
    lastActivityDays: daysSinceActivity,
    bookingDecline: bookingDeclineData.decline,
    engagementScore: parseFloat((1 - totalScore).toFixed(3))
  };
}

/**
 * Get last activity date for user
 */
async function getLastActivity(userId: string): Promise<Date | null> {
  const activities = await Promise.all([
    // Last booking
    prisma.booking.findFirst({
      where: { 
        OR: [
          { providerId: userId },
          { clientId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }),
    
    // Last message
    prisma.message.findFirst({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }),
    
    // Last proposal
    prisma.proposal.findFirst({
      where: { providerId: userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })
  ]);

  const dates = activities
    .filter(a => a !== null)
    .map(a => a!.createdAt);

  if (dates.length === 0) return null;
  
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

/**
 * Calculate booking decline %
 */
async function calculateBookingDecline(userId: string): Promise<{ decline: number; recent: number; previous: number }> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [recentCount, previousCount] = await Promise.all([
    // Last 30 days
    prisma.booking.count({
      where: {
        providerId: userId,
        status: 'COMPLETED',
        createdAt: { gte: thirtyDaysAgo }
      }
    }),
    
    // 30-60 days ago
    prisma.booking.count({
      where: {
        providerId: userId,
        status: 'COMPLETED',
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo
        }
      }
    })
  ]);

  if (previousCount === 0) {
    return { decline: 0, recent: recentCount, previous: previousCount };
  }

  const decline = ((previousCount - recentCount) / previousCount) * 100;
  return {
    decline: Math.max(0, decline),
    recent: recentCount,
    previous: previousCount
  };
}

/**
 * Calculate profile completeness %
 */
function calculateProfileCompleteness(profile: any): number {
  if (!profile) return 0;

  const fields = [
    profile.bio,
    profile.hourlyRate,
    profile.location,
    profile.idDocument,
    profile.skills && profile.skills.length > 0,
    profile.portfolio && profile.portfolio.length > 0,
    profile.certifications,
    profile.education
  ];

  const filledCount = fields.filter(f => f).length;
  return Math.round((filledCount / fields.length) * 100);
}

/**
 * Analyze all users for churn and save scores
 */
export async function analyzeAllUsers(): Promise<{
  analyzed: number;
  atRisk: number;
  byLevel: Record<ChurnRiskLevel, number>;
}> {
  const providers = await prisma.user.findMany({
    where: { role: 'PROVIDER' },
    select: { id: true }
  });

  const results = {
    analyzed: 0,
    atRisk: 0,
    byLevel: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    } as Record<ChurnRiskLevel, number>
  };

  for (const provider of providers) {
    try {
      const prediction = await calculateChurnScore(provider.id);
      
      // Save score to database
      await prisma.churnScore.create({
        data: {
          userId: provider.id,
          riskLevel: prediction.riskLevel,
          score: prediction.score,
          factors: prediction.factors as any,
          lastActivityDays: prediction.lastActivityDays,
          bookingDecline: prediction.bookingDecline,
          engagementScore: prediction.engagementScore
        }
      });

      results.analyzed++;
      results.byLevel[prediction.riskLevel]++;
      
      if (prediction.riskLevel !== 'LOW') {
        results.atRisk++;
      }
    } catch (error) {
      console.error(`Error analyzing user ${provider.id}:`, error);
    }
  }

  return results;
}
