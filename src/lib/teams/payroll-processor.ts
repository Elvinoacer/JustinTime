/**
 * Team Payroll Processor
 * Handles payroll generation, processing, and history
 */

import prisma from "@/lib/prisma";
import { PayrollStatus } from "@/generated/prisma";

/**
 * Generate payroll for a period
 */
export async function generatePayroll(
  teamId: string,
  periodStart: Date,
  periodEnd: Date
) {
  // Get all unpaid earnings in the period
  const earnings = await prisma.teamEarning.findMany({
    where: {
      teamId,
      isPaid: false,
      createdAt: { gte: periodStart, lte: periodEnd }
    },
    include: {
      member: {
        include: { user: { select: { name: true } } }
      }
    }
  });

  if (earnings.length === 0) {
    throw new Error("No unpaid earnings found for this period");
  }

  // Calculate totals
  const totalAmount = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
  const memberIds = [...new Set(earnings.map(e => e.memberId))];

  // Create payroll record
  const payroll = await prisma.teamPayroll.create({
    data: {
      teamId,
      periodStart,
      periodEnd,
      totalAmount,
      memberCount: memberIds.length,
      status: 'PENDING'
    }
  });

  // Link earnings to payroll
  await prisma.teamEarning.updateMany({
    where: { id: { in: earnings.map(e => e.id) } },
    data: { payrollId: payroll.id }
  });

  return {
    payroll,
    earnings,
    summary: {
      totalAmount,
      memberCount: memberIds.length,
      earningsCount: earnings.length
    }
  };
}

/**
 * Process/complete payroll (mark as paid)
 */
export async function processPayroll(
  payrollId: string,
  processedBy: string,
  notes?: string
) {
  // Update payroll status
  const payroll = await prisma.teamPayroll.update({
    where: { id: payrollId },
    data: {
      status: 'PROCESSING',
      processedBy
    }
  });

  // Mark all linked earnings as paid
  await prisma.teamEarning.updateMany({
    where: { payrollId },
    data: {
      isPaid: true,
      paidAt: new Date()
    }
  });

  // Complete the payroll
  const completed = await prisma.teamPayroll.update({
    where: { id: payrollId },
    data: {
      status: 'COMPLETED',
      processedAt: new Date(),
      notes
    }
  });

  return completed;
}

/**
 * Get payroll details with breakdown
 */
export async function getPayrollDetails(payrollId: string) {
  const payroll = await prisma.teamPayroll.findUnique({
    where: { id: payrollId },
    include: {
      earnings: {
        include: {
          member: {
            include: { user: { select: { name: true, image: true } } }
          }
        }
      },
      team: { select: { name: true } }
    }
  });

  if (!payroll) return null;

  // Group earnings by member
  const byMember: Record<string, {
    memberId: string;
    memberName: string;
    memberImage?: string | null;
    totalAmount: number;
    earnings: typeof payroll.earnings;
  }> = {};

  payroll.earnings.forEach(e => {
    if (!byMember[e.memberId]) {
      byMember[e.memberId] = {
        memberId: e.memberId,
        memberName: e.member.user.name || 'Unknown',
        memberImage: e.member.user.image,
        totalAmount: 0,
        earnings: []
      };
    }
    byMember[e.memberId].totalAmount += Number(e.amount);
    byMember[e.memberId].earnings.push(e);
  });

  return {
    ...payroll,
    breakdown: Object.values(byMember)
  };
}

/**
 * Get payroll history for a team
 */
export async function getPayrollHistory(
  teamId: string,
  limit: number = 10
) {
  const payrolls = await prisma.teamPayroll.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      _count: { select: { earnings: true } }
    }
  });

  return payrolls.map(p => ({
    ...p,
    earningsCount: p._count.earnings
  }));
}

/**
 * Get pending payroll summary
 */
export async function getPendingPayrollSummary(teamId: string) {
  // Get unpaid earnings
  const unpaidEarnings = await prisma.teamEarning.aggregate({
    where: {
      teamId,
      isPaid: false,
      payrollId: null
    },
    _sum: { amount: true },
    _count: true
  });

  // Get by member
  const byMember = await prisma.teamEarning.groupBy({
    by: ['memberId'],
    where: {
      teamId,
      isPaid: false,
      payrollId: null
    },
    _sum: { amount: true }
  });

  // Get member details
  const memberIds = byMember.map(b => b.memberId);
  const members = await prisma.teamMember.findMany({
    where: { id: { in: memberIds } },
    include: { user: { select: { name: true, image: true } } }
  });

  return {
    totalUnpaid: Number(unpaidEarnings._sum.amount || 0),
    unpaidCount: unpaidEarnings._count,
    byMember: byMember.map(b => {
      const member = members.find(m => m.id === b.memberId);
      return {
        memberId: b.memberId,
        memberName: member?.user.name || 'Unknown',
        memberImage: member?.user.image,
        amount: Number(b._sum.amount || 0)
      };
    })
  };
}

/**
 * Cancel a pending payroll
 */
export async function cancelPayroll(payrollId: string) {
  // Unlink earnings
  await prisma.teamEarning.updateMany({
    where: { payrollId },
    data: { payrollId: null }
  });

  // Delete payroll
  await prisma.teamPayroll.delete({
    where: { id: payrollId }
  });

  return { success: true };
}
