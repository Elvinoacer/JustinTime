/**
 * Team Payroll Processor
 * Handles payroll generation, processing, and history
 */

import prisma from "@/lib/prisma";

/**
 * Generate payroll for a period
 */
export async function generatePayroll(
  teamId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  return prisma.$transaction(async (tx) => {
    if (periodEnd < periodStart) {
      throw new Error("Period end must be after period start");
    }

    const overlappingOpenPayroll = await tx.teamPayroll.findFirst({
      where: {
        teamId,
        status: { in: ["PENDING", "PROCESSING"] },
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
      select: { id: true },
    });

    if (overlappingOpenPayroll) {
      throw new Error(
        "A pending or processing payroll already exists for an overlapping period",
      );
    }

    const exactCompletedPayroll = await tx.teamPayroll.findFirst({
      where: {
        teamId,
        status: "COMPLETED",
        periodStart,
        periodEnd,
      },
      select: { id: true },
    });

    if (exactCompletedPayroll) {
      throw new Error("This payroll period has already been processed");
    }

    const earnings = await tx.teamEarning.findMany({
      where: {
        teamId,
        isPaid: false,
        payrollId: null,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        member: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (earnings.length === 0) {
      throw new Error("No unpaid earnings found for this period");
    }

    const totalAmount = earnings.reduce(
      (sum, earning) => sum + Number(earning.amount),
      0,
    );
    const memberIds = [...new Set(earnings.map((earning) => earning.memberId))];

    const payroll = await tx.teamPayroll.create({
      data: {
        teamId,
        periodStart,
        periodEnd,
        totalAmount,
        memberCount: memberIds.length,
        status: "PENDING",
      },
    });

    const linkResult = await tx.teamEarning.updateMany({
      where: {
        id: { in: earnings.map((earning) => earning.id) },
        payrollId: null,
      },
      data: { payrollId: payroll.id },
    });

    if (linkResult.count !== earnings.length) {
      throw new Error(
        "Failed to reserve all earnings for this payroll. Please retry.",
      );
    }

    return {
      payroll,
      earnings,
      summary: {
        totalAmount,
        memberCount: memberIds.length,
        earningsCount: earnings.length,
      },
    };
  });
}

/**
 * Process/complete payroll (mark as paid)
 */
export async function processPayroll(
  payrollId: string,
  processedBy: string,
  notes?: string,
) {
  return prisma.$transaction(async (tx) => {
    const payroll = await tx.teamPayroll.findUnique({
      where: { id: payrollId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!payroll) {
      throw new Error("Payroll not found");
    }

    if (payroll.status !== "PENDING") {
      throw new Error("Only pending payroll can be processed");
    }

    const startProcessing = await tx.teamPayroll.updateMany({
      where: {
        id: payrollId,
        status: "PENDING",
      },
      data: {
        status: "PROCESSING",
        processedBy,
      },
    });

    if (startProcessing.count !== 1) {
      throw new Error("Payroll status changed. Please refresh and try again.");
    }

    const earningsToPay = await tx.teamEarning.findMany({
      where: {
        payrollId,
        isPaid: false,
      },
      select: { id: true },
    });

    if (earningsToPay.length === 0) {
      throw new Error("No unpaid earnings found for this payroll");
    }

    const markPaid = await tx.teamEarning.updateMany({
      where: {
        id: { in: earningsToPay.map((earning) => earning.id) },
        isPaid: false,
      },
      data: {
        isPaid: true,
        paidAt: new Date(),
      },
    });

    if (markPaid.count !== earningsToPay.length) {
      throw new Error(
        "Failed to mark all payroll earnings as paid. Please retry.",
      );
    }

    const completeResult = await tx.teamPayroll.updateMany({
      where: {
        id: payrollId,
        status: "PROCESSING",
      },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        notes,
      },
    });

    if (completeResult.count !== 1) {
      throw new Error("Failed to finalize payroll status");
    }

    return tx.teamPayroll.findUniqueOrThrow({ where: { id: payrollId } });
  });
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
            include: { user: { select: { name: true, image: true } } },
          },
        },
      },
      team: { select: { name: true } },
    },
  });

  if (!payroll) return null;

  // Group earnings by member
  const byMember: Record<
    string,
    {
      memberId: string;
      memberName: string;
      memberImage?: string | null;
      totalAmount: number;
      earnings: typeof payroll.earnings;
    }
  > = {};

  payroll.earnings.forEach((e) => {
    if (!byMember[e.memberId]) {
      byMember[e.memberId] = {
        memberId: e.memberId,
        memberName: e.member.user.name || "Unknown",
        memberImage: e.member.user.image,
        totalAmount: 0,
        earnings: [],
      };
    }
    byMember[e.memberId].totalAmount += Number(e.amount);
    byMember[e.memberId].earnings.push(e);
  });

  return {
    ...payroll,
    breakdown: Object.values(byMember),
  };
}

/**
 * Get payroll history for a team
 */
export async function getPayrollHistory(teamId: string, limit: number = 10) {
  const payrolls = await prisma.teamPayroll.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      _count: { select: { earnings: true } },
    },
  });

  return payrolls.map((p) => ({
    ...p,
    earningsCount: p._count.earnings,
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
      payrollId: null,
    },
    _sum: { amount: true },
    _count: true,
  });

  // Get by member
  const byMember = await prisma.teamEarning.groupBy({
    by: ["memberId"],
    where: {
      teamId,
      isPaid: false,
      payrollId: null,
    },
    _sum: { amount: true },
  });

  // Get member details
  const memberIds = byMember.map((b) => b.memberId);
  const members = await prisma.teamMember.findMany({
    where: { id: { in: memberIds } },
    include: { user: { select: { name: true, image: true } } },
  });

  return {
    totalUnpaid: Number(unpaidEarnings._sum.amount || 0),
    unpaidCount: unpaidEarnings._count,
    byMember: byMember.map((b) => {
      const member = members.find((m) => m.id === b.memberId);
      return {
        memberId: b.memberId,
        memberName: member?.user.name || "Unknown",
        memberImage: member?.user.image,
        amount: Number(b._sum.amount || 0),
      };
    }),
  };
}

/**
 * Cancel a pending payroll
 */
export async function cancelPayroll(payrollId: string) {
  await prisma.$transaction(async (tx) => {
    const payroll = await tx.teamPayroll.findUnique({
      where: { id: payrollId },
      select: { id: true, status: true },
    });

    if (!payroll) {
      throw new Error("Payroll not found");
    }

    if (payroll.status !== "PENDING") {
      throw new Error("Only pending payroll can be cancelled");
    }

    await tx.teamEarning.updateMany({
      where: { payrollId },
      data: { payrollId: null },
    });

    await tx.teamPayroll.delete({
      where: { id: payrollId },
    });
  });

  return { success: true };
}
