/**
 * Team Earnings Calculator
 * Handles revenue splits, earnings tracking, and balance calculations
 */

import prisma from "@/lib/prisma";
import { OWNER_PERMISSIONS } from "@/lib/permissions";

export interface EarningInput {
  teamId: string;
  memberId: string;
  jobId?: string;
  amount: number;
  splitPercent: number;
  reason: string;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

/**
 * Calculate earnings split for a completed job.
 */
export async function calculateJobSplit(
  jobId: string,
  customSplits?: Record<string, number>, // memberId -> percentage
) {
  const job = await prisma.teamJob.findUnique({
    where: { id: jobId },
    include: {
      team: { select: { defaultSplit: true, ownerId: true } },
      assignments: {
        where: {
          status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"] },
        },
        include: { member: true },
      },
    },
  });

  if (!job || !job.collected) {
    throw new Error("Job not found or not yet collected");
  }

  const totalAmount = Number(job.amount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return [];
  }

  const ownerSplit = clampPercent(Number(job.team.defaultSplit ?? 70));
  const workerSplit = 100 - ownerSplit;

  let ownerMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: job.teamId,
        userId: job.team.ownerId,
      },
    },
  });

  if (!ownerMember) {
    ownerMember = await prisma.teamMember.create({
      data: {
        teamId: job.teamId,
        userId: job.team.ownerId,
        role: "OWNER",
        permissions: OWNER_PERMISSIONS,
        status: "ONLINE",
      },
    });
  }

  const workerAssignments = job.assignments.filter(
    (assignment) => assignment.memberId !== ownerMember.id,
  );

  if (workerAssignments.length === 0) {
    return [
      {
        teamId: job.teamId,
        memberId: ownerMember.id,
        jobId: job.id,
        amount: totalAmount,
        splitPercent: 100,
        reason: `Job: ${job.title}`,
      },
    ];
  }

  const useCustom = customSplits && Object.keys(customSplits).length > 0;
  const defaultWorkerPercent = workerSplit / workerAssignments.length;

  const workerEarnings: EarningInput[] = workerAssignments.map((assignment) => {
    const customPercent = useCustom
      ? customSplits[assignment.memberId]
      : undefined;
    const splitPercent =
      typeof customPercent === "number"
        ? clampPercent(customPercent)
        : defaultWorkerPercent;

    return {
      teamId: job.teamId,
      memberId: assignment.memberId,
      jobId: job.id,
      amount: (totalAmount * splitPercent) / 100,
      splitPercent,
      reason: `Job: ${job.title}`,
    };
  });

  const workerAllocatedPercent = workerEarnings.reduce(
    (sum, earning) => sum + earning.splitPercent,
    0,
  );
  const ownerPercent = clampPercent(100 - workerAllocatedPercent);

  const ownerEarning: EarningInput = {
    teamId: job.teamId,
    memberId: ownerMember.id,
    jobId: job.id,
    amount: (totalAmount * ownerPercent) / 100,
    splitPercent: ownerPercent,
    reason: `Job: ${job.title}`,
  };

  return [...workerEarnings, ownerEarning].filter(
    (earning) => earning.amount > 0,
  );
}

/**
 * Record earnings for team members.
 */
export async function recordEarnings(earnings: EarningInput[]) {
  const results = await Promise.all(
    earnings.map(async (earningInput) => {
      if (earningInput.jobId) {
        const existing = await prisma.teamEarning.findFirst({
          where: {
            jobId: earningInput.jobId,
            memberId: earningInput.memberId,
            reason: earningInput.reason,
          },
        });

        if (existing) {
          return existing;
        }
      }

      const earning = await prisma.teamEarning.create({
        data: {
          teamId: earningInput.teamId,
          memberId: earningInput.memberId,
          jobId: earningInput.jobId,
          amount: earningInput.amount,
          splitPercent: earningInput.splitPercent,
          reason: earningInput.reason,
          isPaid: false,
        },
      });

      await prisma.teamMember.update({
        where: { id: earningInput.memberId },
        data: {
          totalEarnings: { increment: earningInput.amount },
          totalJobsCompleted: { increment: earningInput.jobId ? 1 : 0 },
        },
      });

      return earning;
    }),
  );

  return results;
}

/**
 * Process job completion and split earnings with idempotency protection.
 */
export async function processJobEarnings(jobId: string) {
  const existing = await prisma.teamEarning.findFirst({
    where: { jobId },
  });

  if (existing) {
    return prisma.teamEarning.findMany({
      where: { jobId },
    });
  }

  const earnings = await calculateJobSplit(jobId);
  if (earnings.length === 0) {
    return [];
  }

  return recordEarnings(earnings);
}

/**
 * Get today's collections for a team.
 */
export async function getTodaysCollections(teamId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const jobs = await prisma.teamJob.findMany({
    where: {
      teamId,
      collected: true,
      collectedAt: { gte: today, lt: tomorrow },
    },
    include: {
      assignments: {
        include: {
          member: {
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
  });

  const totalCollected = jobs.reduce((sum, job) => sum + Number(job.amount), 0);

  const byCollector: Record<string, number> = {};
  jobs.forEach((job) => {
    const collectorId = job.collectedBy || "unknown";
    byCollector[collectorId] =
      (byCollector[collectorId] || 0) + Number(job.amount);
  });

  const byMethod: Record<string, number> = {};
  jobs.forEach((job) => {
    const method = job.paymentMethod || "CASH";
    byMethod[method] = (byMethod[method] || 0) + Number(job.amount);
  });

  return {
    totalCollected,
    jobCount: jobs.length,
    byCollector,
    byMethod,
    jobs,
  };
}

/**
 * Get member's unpaid balance.
 */
export async function getMemberBalance(memberId: string) {
  const result = await prisma.teamEarning.aggregate({
    where: {
      memberId,
      isPaid: false,
    },
    _sum: { amount: true },
    _count: true,
  });

  return {
    unpaidAmount: Number(result._sum.amount || 0),
    pendingJobs: result._count,
  };
}

/**
 * Get earnings breakdown by member for a period.
 */
export async function getTeamEarningsBreakdown(
  teamId: string,
  startDate: Date,
  endDate: Date,
) {
  const earnings = await prisma.teamEarning.groupBy({
    by: ["memberId"],
    where: {
      teamId,
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: true,
  });

  const memberIds = earnings.map((entry) => entry.memberId);
  const members = await prisma.teamMember.findMany({
    where: { id: { in: memberIds } },
    include: { user: { select: { name: true, image: true } } },
  });

  return earnings.map((entry) => {
    const member = members.find((m) => m.id === entry.memberId);
    return {
      memberId: entry.memberId,
      memberName: member?.user.name || "Unknown",
      memberImage: member?.user.image,
      totalEarned: Number(entry._sum.amount || 0),
      jobCount: entry._count,
    };
  });
}

/**
 * Add bonus/tip to member.
 */
export async function addBonusEarning(
  teamId: string,
  memberId: string,
  amount: number,
  reason: string = "Bonus",
) {
  const earning = await prisma.teamEarning.create({
    data: {
      teamId,
      memberId,
      amount,
      splitPercent: 100,
      reason,
      isPaid: false,
    },
  });

  await prisma.teamMember.update({
    where: { id: memberId },
    data: { totalEarnings: { increment: amount } },
  });

  return earning;
}
