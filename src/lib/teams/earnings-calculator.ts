/**
 * Team Earnings Calculator
 * Handles revenue splits, earnings tracking, and balance calculations
 */

import prisma from "@/lib/prisma";

export interface EarningInput {
  teamId: string;
  memberId: string;
  jobId?: string;
  amount: number;
  splitPercent: number;
  reason: string;
}

/**
 * Calculate earnings split for a completed job
 */
export async function calculateJobSplit(
  jobId: string,
  customSplits?: Record<string, number> // memberId -> percentage
) {
  const job = await prisma.teamJob.findUnique({
    where: { id: jobId },
    include: {
      team: { select: { defaultSplit: true } },
      assignments: {
        where: { status: 'COMPLETED' },
        include: { member: true }
      }
    }
  });

  if (!job || !job.collected) {
    throw new Error("Job not found or not yet collected");
  }

  const totalAmount = Number(job.amount);
  const ownerSplit = job.team.defaultSplit; // e.g., 70%
  const workerSplit = 100 - ownerSplit; // e.g., 30%
  
  // Split worker share among all assigned workers
  const workerCount = job.assignments.length;
  if (workerCount === 0) return [];

  const perWorkerPercent = workerSplit / workerCount;
  const perWorkerAmount = (totalAmount * perWorkerPercent) / 100;

  const earnings: EarningInput[] = job.assignments.map(a => ({
    teamId: job.teamId,
    memberId: a.memberId,
    jobId: job.id,
    amount: customSplits?.[a.memberId] 
      ? (totalAmount * customSplits[a.memberId]) / 100
      : perWorkerAmount,
    splitPercent: customSplits?.[a.memberId] || perWorkerPercent,
    reason: `Job: ${job.title}`
  }));

  return earnings;
}

/**
 * Record earnings for team members
 */
export async function recordEarnings(earnings: EarningInput[]) {
  const results = await Promise.all(
    earnings.map(async (e) => {
      // Create earning record
      const earning = await prisma.teamEarning.create({
        data: {
          teamId: e.teamId,
          memberId: e.memberId,
          jobId: e.jobId,
          amount: e.amount,
          splitPercent: e.splitPercent,
          reason: e.reason,
          isPaid: false
        }
      });

      // Update member's total earnings
      await prisma.teamMember.update({
        where: { id: e.memberId },
        data: {
          totalEarnings: { increment: e.amount },
          totalJobsCompleted: { increment: e.jobId ? 1 : 0 }
        }
      });

      return earning;
    })
  );

  return results;
}

/**
 * Process job completion and split earnings
 */
export async function processJobEarnings(jobId: string) {
  const earnings = await calculateJobSplit(jobId);
  return await recordEarnings(earnings);
}

/**
 * Get today's collections for a team
 */
export async function getTodaysCollections(teamId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const jobs = await prisma.teamJob.findMany({
    where: {
      teamId,
      collected: true,
      collectedAt: { gte: today }
    },
    include: {
      assignments: {
        include: {
          member: {
            include: { user: { select: { name: true } } }
          }
        }
      }
    }
  });

  const totalCollected = jobs.reduce((sum, job) => sum + Number(job.amount), 0);
  
  // Group by collector
  const byCollector: Record<string, number> = {};
  jobs.forEach(job => {
    const collectorId = job.collectedBy || 'unknown';
    byCollector[collectorId] = (byCollector[collectorId] || 0) + Number(job.amount);
  });

  // Group by payment method
  const byMethod: Record<string, number> = {};
  jobs.forEach(job => {
    const method = job.paymentMethod || 'CASH';
    byMethod[method] = (byMethod[method] || 0) + Number(job.amount);
  });

  return {
    totalCollected,
    jobCount: jobs.length,
    byCollector,
    byMethod,
    jobs
  };
}

/**
 * Get member's unpaid balance
 */
export async function getMemberBalance(memberId: string) {
  const result = await prisma.teamEarning.aggregate({
    where: {
      memberId,
      isPaid: false
    },
    _sum: { amount: true },
    _count: true
  });

  return {
    unpaidAmount: Number(result._sum.amount || 0),
    pendingJobs: result._count
  };
}

/**
 * Get earnings breakdown by member for a period
 */
export async function getTeamEarningsBreakdown(
  teamId: string,
  startDate: Date,
  endDate: Date
) {
  const earnings = await prisma.teamEarning.groupBy({
    by: ['memberId'],
    where: {
      teamId,
      createdAt: { gte: startDate, lte: endDate }
    },
    _sum: { amount: true },
    _count: true
  });

  // Get member details
  const memberIds = earnings.map(e => e.memberId);
  const members = await prisma.teamMember.findMany({
    where: { id: { in: memberIds } },
    include: { user: { select: { name: true, image: true } } }
  });

  return earnings.map(e => {
    const member = members.find(m => m.id === e.memberId);
    return {
      memberId: e.memberId,
      memberName: member?.user.name || 'Unknown',
      memberImage: member?.user.image,
      totalEarned: Number(e._sum.amount || 0),
      jobCount: e._count
    };
  });
}

/**
 * Add bonus/tip to member
 */
export async function addBonusEarning(
  teamId: string,
  memberId: string,
  amount: number,
  reason: string = 'Bonus'
) {
  const earning = await prisma.teamEarning.create({
    data: {
      teamId,
      memberId,
      amount,
      splitPercent: 100, // Full amount to member
      reason,
      isPaid: false
    }
  });

  await prisma.teamMember.update({
    where: { id: memberId },
    data: { totalEarnings: { increment: amount } }
  });

  return earning;
}
