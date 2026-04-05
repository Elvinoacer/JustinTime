import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { hasRole } from "@/lib/auth/roles";
import {
  buildDailyEarningsSeries,
  PROVIDER_ANALYTICS_TIMEZONE,
} from "@/lib/analytics/providerAnalytics";

const EARNINGS_TIMEZONE = PROVIDER_ANALYTICS_TIMEZONE;

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get last 7 days of earnings
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const bookings = await prisma.booking.findMany({
      where: {
        providerId: userId,
        status: "COMPLETED",
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        createdAt: true,
        basePrice: true,
        discountAmount: true,
        totalAmount: true,
        netAmount: true,
        service: {
          select: {
            price: true,
          },
        },
        job: {
          select: {
            budget: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const chartData = buildDailyEarningsSeries(bookings, {
      days: 7,
      timeZone: EARNINGS_TIMEZONE,
    }).map((item) => ({
      name: item.name,
      earnings: item.earnings,
    }));

    return NextResponse.json({ data: chartData });
  } catch (error) {
    return handleError(error);
  }
}
