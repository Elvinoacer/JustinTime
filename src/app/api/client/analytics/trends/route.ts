import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow both CLIENT and PROVIDER roles to access client analytics
    if (!hasAnyRole(session.user, ["CLIENT", "PROVIDER"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const interval = searchParams.get("interval") || "day"; // day, week, month

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch jobs
    const jobs = await prisma.job.findMany({
      where: {
        clientId: userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        createdAt: true,
        _count: {
          select: { proposals: true },
        },
      },
    });

    // Fetch payments for spending
    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          clientId: userId,
        },
        status: "COMPLETED",
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    // Fetch proposals
    const proposals = await prisma.proposal.findMany({
      where: {
        job: {
          clientId: userId,
        },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    // Helper to format date based on interval
    const formatDate = (date: Date): string => {
      if (interval === "month") {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else if (interval === "week") {
        // Get ISO week number
        const onejan = new Date(date.getFullYear(), 0, 1);
        const week = Math.ceil(
          ((date.getTime() - onejan.getTime()) / 86400000 +
            onejan.getDay() +
            1) /
            7,
        );
        return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
      } else {
        // day
        return date.toISOString().split("T")[0];
      }
    };

    // Group jobs by date
    const jobsByDate = jobs.reduce(
      (acc, job) => {
        const dateKey = formatDate(new Date(job.createdAt));
        if (!acc[dateKey]) {
          acc[dateKey] = 0;
        }
        acc[dateKey] += 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group spending by date
    const spendingByDate = payments.reduce(
      (acc, payment) => {
        const dateKey = formatDate(new Date(payment.createdAt));
        if (!acc[dateKey]) {
          acc[dateKey] = 0;
        }
        acc[dateKey] += Number(payment.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group proposals by date
    const proposalsByDate = proposals.reduce(
      (acc, proposal) => {
        const dateKey = formatDate(new Date(proposal.createdAt));
        if (!acc[dateKey]) {
          acc[dateKey] = 0;
        }
        acc[dateKey] += 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get all unique dates and sort them
    const allDates = new Set([
      ...Object.keys(jobsByDate),
      ...Object.keys(spendingByDate),
      ...Object.keys(proposalsByDate),
    ]);

    const sortedDates = Array.from(allDates).sort();

    // Build response arrays
    const jobsPosted = sortedDates.map((date) => ({
      date,
      count: jobsByDate[date] || 0,
    }));

    const spending = sortedDates.map((date) => ({
      date,
      amount: spendingByDate[date] || 0,
    }));

    const proposalsReceived = sortedDates.map((date) => ({
      date,
      count: proposalsByDate[date] || 0,
    }));

    return NextResponse.json({
      jobsPosted,
      spending,
      proposals: proposalsReceived,
    });
  } catch (error) {
    return handleError(error);
  }
}
