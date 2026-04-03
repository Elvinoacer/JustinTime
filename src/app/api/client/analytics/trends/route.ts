import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { hasClientAccess } from "@/lib/auth/clientAccess";
import { Prisma } from "@/generated/prisma/client";

type Interval = "day" | "week" | "month";

function getIsoWeek(date: Date): { year: number; week: number } {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: utcDate.getUTCFullYear(), week };
}

function toBucketKey(date: Date, interval: Interval): string {
  if (interval === "month") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  if (interval === "week") {
    const { year, week } = getIsoWeek(date);
    return `${year}-W${String(week).padStart(2, "0")}`;
  }

  return date.toISOString().split("T")[0];
}

function parseDateRange(
  startDate: string,
  endDate: string,
): {
  start: Date;
  end: Date;
} {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("INVALID_DATE_RANGE");
  }

  return { start, end };
}

function getTruncSql(interval: Interval): Prisma.Sql {
  if (interval === "month") {
    return Prisma.sql`date_trunc('month', "createdAt" AT TIME ZONE 'UTC')`;
  }

  if (interval === "week") {
    return Prisma.sql`date_trunc('week', "createdAt" AT TIME ZONE 'UTC')`;
  }

  return Prisma.sql`date_trunc('day', "createdAt" AT TIME ZONE 'UTC')`;
}

function getProposalTruncSql(interval: Interval): Prisma.Sql {
  if (interval === "month") {
    return Prisma.sql`date_trunc('month', p."createdAt" AT TIME ZONE 'UTC')`;
  }

  if (interval === "week") {
    return Prisma.sql`date_trunc('week', p."createdAt" AT TIME ZONE 'UTC')`;
  }

  return Prisma.sql`date_trunc('day', p."createdAt" AT TIME ZONE 'UTC')`;
}

function getPaymentTruncSql(interval: Interval): Prisma.Sql {
  if (interval === "month") {
    return Prisma.sql`date_trunc('month', p."updatedAt" AT TIME ZONE 'UTC')`;
  }

  if (interval === "week") {
    return Prisma.sql`date_trunc('week', p."updatedAt" AT TIME ZONE 'UTC')`;
  }

  return Prisma.sql`date_trunc('day', p."updatedAt" AT TIME ZONE 'UTC')`;
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
    const rawInterval = (searchParams.get("interval") || "day").toLowerCase();
    const interval: Interval =
      rawInterval === "week" || rawInterval === "month" || rawInterval === "day"
        ? rawInterval
        : "day";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 },
      );
    }

    const { start, end } = parseDateRange(startDate, endDate);
    const jobTrunc = getTruncSql(interval);
    const proposalTrunc = getProposalTruncSql(interval);
    const paymentTrunc = getPaymentTruncSql(interval);

    const [jobsByBucket, proposalsByBucket, spendingByBucket] =
      await Promise.all([
        prisma.$queryRaw<Array<{ bucket: Date; count: bigint | number }>>(
          Prisma.sql`
            SELECT
              ${jobTrunc} AS bucket,
              COUNT(*)::bigint AS count
            FROM "Job"
            WHERE "clientId" = ${userId}
              AND "createdAt" >= ${start}
              AND "createdAt" <= ${end}
            GROUP BY 1
            ORDER BY 1
          `,
        ),
        prisma.$queryRaw<Array<{ bucket: Date; count: bigint | number }>>(
          Prisma.sql`
            SELECT
              ${proposalTrunc} AS bucket,
              COUNT(*)::bigint AS count
            FROM "Proposal" p
            INNER JOIN "Job" j ON j."id" = p."jobId"
            WHERE j."clientId" = ${userId}
              AND p."createdAt" >= ${start}
              AND p."createdAt" <= ${end}
            GROUP BY 1
            ORDER BY 1
          `,
        ),
        prisma.$queryRaw<
          Array<{ bucket: Date; amount: Prisma.Decimal | number | string }>
        >(
          Prisma.sql`
            SELECT
              ${paymentTrunc} AS bucket,
              COALESCE(SUM(p."amount"), 0) AS amount
            FROM "Payment" p
            INNER JOIN "Booking" b ON b."id" = p."bookingId"
            WHERE b."clientId" = ${userId}
              AND p."status" = 'COMPLETED'
              AND p."updatedAt" >= ${start}
              AND p."updatedAt" <= ${end}
            GROUP BY 1
            ORDER BY 1
          `,
        ),
      ]);

    const jobsByDate = jobsByBucket.reduce(
      (acc, row) => {
        const key = toBucketKey(new Date(row.bucket), interval);
        acc[key] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const proposalsByDate = proposalsByBucket.reduce(
      (acc, row) => {
        const key = toBucketKey(new Date(row.bucket), interval);
        acc[key] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const spendingByDate = spendingByBucket.reduce(
      (acc, row) => {
        const key = toBucketKey(new Date(row.bucket), interval);
        acc[key] = Number(row.amount || 0);
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
    if (error instanceof Error && error.message === "INVALID_DATE_RANGE") {
      return NextResponse.json(
        { error: "Invalid startDate/endDate" },
        { status: 400 },
      );
    }

    return handleError(error);
  }
}
