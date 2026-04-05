import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { hasClientAccess } from "@/lib/auth/clientAccess";
import { BookingStatus, Prisma } from "@/generated/prisma/client";

function parseDateRange(
  startDate?: string | null,
  endDate?: string | null,
): { start: Date | null; end: Date | null } {
  if (!startDate || !endDate) {
    return { start: null, end: null };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("INVALID_DATE_RANGE");
  }

  return { start, end };
}

function getCountValue(
  count: true | Record<string, number | undefined>,
  key: string,
): number {
  if (count === true) {
    return 0;
  }

  const value = count[key];
  if (typeof value === "number") {
    return value;
  }

  const all = count._all;
  return typeof all === "number" ? all : 0;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasClientAccess(session.user)) {
      return NextResponse.json(
        { error: "Client profile required" },
        { status: 403 },
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const { start, end } = parseDateRange(startDate, endDate);

    const jobDateFilter =
      start && end
        ? {
            createdAt: {
              gte: start,
              lte: end,
            },
          }
        : {};

    // Payments do not expose completedAt, so updatedAt is the best settlement proxy.
    const paymentDateFilter =
      start && end
        ? {
            updatedAt: {
              gte: start,
              lte: end,
            },
          }
        : {};

    const bookingDateFilter =
      start && end
        ? {
            updatedAt: {
              gte: start,
              lte: end,
            },
          }
        : {};

    const activeProviderStatuses: BookingStatus[] = [
      "CONFIRMED",
      "IN_PROGRESS",
      "AWAITING_CLIENT_CONFIRMATION",
      "COMPLETED",
    ];

    const [
      completedSpending,
      paymentStatusGroups,
      spendingByCategoryRows,
      totalJobs,
      jobsByStatusGroups,
      totalProposals,
      hireSnapshots,
      providerHireCounts,
      topProviderCounts,
      ratingsAverage,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          booking: { clientId: userId },
          status: "COMPLETED",
          ...paymentDateFilter,
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payment.groupBy({
        by: ["status"],
        where: {
          booking: { clientId: userId },
          ...paymentDateFilter,
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.$queryRaw<
        Array<{
          category: string;
          amount: Prisma.Decimal | number | string;
        }>
      >(Prisma.sql`
        SELECT
          COALESCE(c."name", 'Uncategorized') AS category,
          COALESCE(SUM(p."amount"), 0) AS amount
        FROM "Payment" p
        INNER JOIN "Booking" b ON b."id" = p."bookingId"
        LEFT JOIN "Job" j ON j."id" = b."jobId"
        LEFT JOIN "Category" c ON c."id" = j."categoryId"
        WHERE b."clientId" = ${userId}
          AND p."status" = 'COMPLETED'
          ${
            start && end
              ? Prisma.sql`AND p."updatedAt" >= ${start} AND p."updatedAt" <= ${end}`
              : Prisma.empty
          }
        GROUP BY COALESCE(c."name", 'Uncategorized')
        ORDER BY amount DESC
      `),
      prisma.job.count({
        where: {
          clientId: userId,
          ...jobDateFilter,
        },
      }),
      prisma.job.groupBy({
        by: ["status"],
        where: {
          clientId: userId,
          ...jobDateFilter,
        },
        _count: { _all: true },
      }),
      prisma.proposal.count({
        where: {
          job: {
            clientId: userId,
            ...jobDateFilter,
          },
        },
      }),
      prisma.booking.findMany({
        where: {
          clientId: userId,
          status: { in: activeProviderStatuses },
          jobId: { not: null },
          job: jobDateFilter,
        },
        select: {
          jobId: true,
          createdAt: true,
          job: {
            select: {
              createdAt: true,
            },
          },
        },
      }),
      prisma.booking.groupBy({
        by: ["providerId"],
        where: {
          clientId: userId,
          status: { in: activeProviderStatuses },
          ...bookingDateFilter,
        },
        _count: { providerId: true },
      }),
      prisma.booking.groupBy({
        by: ["providerId"],
        where: {
          clientId: userId,
          status: "COMPLETED",
          ...bookingDateFilter,
        },
        _count: { providerId: true },
        orderBy: {
          _count: {
            providerId: "desc",
          },
        },
        take: 5,
      }),
      prisma.review.aggregate({
        where: {
          authorId: userId,
          booking: {
            clientId: userId,
            ...bookingDateFilter,
          },
        },
        _avg: { rating: true },
      }),
    ]);

    const totalSpent = Number(completedSpending._sum.amount || 0);
    const completedPaymentCount = completedSpending._count._all;
    const avgSpent =
      completedPaymentCount > 0 ? totalSpent / completedPaymentCount : 0;

    const spendingByCategory = spendingByCategoryRows.map((row) => ({
      category: row.category,
      amount: Number(row.amount || 0),
    }));

    const spendingByStatusArray = paymentStatusGroups.map((group) => ({
      status: group.status,
      amount: Number(group._sum.amount || 0),
      count: group._count._all,
    }));

    const jobsByStatusArray = jobsByStatusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    }));

    const completedJobs =
      jobsByStatusGroups.find((group) => group.status === "COMPLETED")?._count
        ._all || 0;
    const completionRate =
      totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    const avgProposals = totalJobs > 0 ? totalProposals / totalJobs : 0;

    const firstHireByJob = new Map<
      string,
      {
        jobCreatedAt: Date;
        firstBookingAt: Date;
      }
    >();

    for (const snapshot of hireSnapshots) {
      const jobId = snapshot.jobId;
      if (!jobId || !snapshot.job?.createdAt) {
        continue;
      }

      const current = firstHireByJob.get(jobId);
      if (!current || snapshot.createdAt < current.firstBookingAt) {
        firstHireByJob.set(jobId, {
          jobCreatedAt: snapshot.job.createdAt,
          firstBookingAt: snapshot.createdAt,
        });
      }
    }

    const timeToHireValues = Array.from(firstHireByJob.values())
      .map((entry) => {
        const diffHours =
          (entry.firstBookingAt.getTime() - entry.jobCreatedAt.getTime()) /
          (1000 * 60 * 60);
        return diffHours >= 0 ? diffHours : null;
      })
      .filter((value): value is number => value !== null);

    const avgTimeToHire =
      timeToHireValues.length > 0
        ? timeToHireValues.reduce((sum, value) => sum + value, 0) /
          timeToHireValues.length
        : 0;

    const uniqueProviders = providerHireCounts.length;
    const repeatHires = providerHireCounts.filter(
      (group) =>
        getCountValue(
          group._count as true | Record<string, number | undefined>,
          "providerId",
        ) > 1,
    ).length;
    const repeatHireRate =
      uniqueProviders > 0 ? (repeatHires / uniqueProviders) * 100 : 0;

    const topProviderIds = topProviderCounts.map((group) => group.providerId);
    const [topProviderUsers, topProviderRatings] = await Promise.all([
      topProviderIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: topProviderIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      topProviderIds.length > 0
        ? prisma.review.groupBy({
            by: ["targetId"],
            where: {
              authorId: userId,
              targetId: { in: topProviderIds },
            },
            _avg: { rating: true },
          })
        : Promise.resolve([]),
    ]);

    const providerNameById = new Map(
      topProviderUsers.map((provider) => [
        provider.id,
        provider.name || "Unknown",
      ]),
    );
    const providerRatingById = new Map(
      topProviderRatings.map((rating) => [
        rating.targetId,
        Number(rating._avg.rating || 0),
      ]),
    );

    const topProviders = topProviderCounts.map((provider) => ({
      id: provider.providerId,
      name: providerNameById.get(provider.providerId) || "Unknown",
      jobsCompleted: getCountValue(
        provider._count as true | Record<string, number | undefined>,
        "providerId",
      ),
      avgRating: Number(
        (providerRatingById.get(provider.providerId) || 0).toFixed(1),
      ),
    }));

    const analytics = {
      spending: {
        total: totalSpent,
        average: avgSpent,
        byCategory: spendingByCategory,
        byStatus: spendingByStatusArray,
      },
      jobs: {
        total: totalJobs,
        byStatus: jobsByStatusArray,
        avgProposals: Math.round(avgProposals * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10,
        avgTimeToHire: Math.round(avgTimeToHire * 10) / 10,
      },
      providers: {
        unique: uniqueProviders,
        repeatHireRate: Math.round(repeatHireRate * 10) / 10,
        avgRating:
          Math.round(Number(ratingsAverage._avg.rating || 0) * 10) / 10,
        topProviders,
      },
    };

    return NextResponse.json(analytics);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE_RANGE") {
      return NextResponse.json(
        { error: "Invalid startDate/endDate" },
        { status: 400 },
      );
    }

    return handleError(error);
  }
}
