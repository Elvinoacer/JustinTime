import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { hasRole } from "@/lib/auth/roles";
import { calculateBookingBreakdown } from "@/lib/financials";

const EARNINGS_TIMEZONE = "Africa/Nairobi";

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

    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: EARNINGS_TIMEZONE,
    });

    const orderedDayKeys: string[] = [];
    const earningsByDay = new Map<string, number>();

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = dayFormatter.format(date);
      orderedDayKeys.push(dayKey);
      earningsByDay.set(dayKey, 0);
    }

    bookings.forEach((booking) => {
      const dayKey = dayFormatter.format(new Date(booking.createdAt));
      const baseAmount = Number(
        booking.basePrice ||
          booking.service?.price ||
          booking.job?.budget ||
          booking.totalAmount ||
          0,
      );
      const discountAmount = Number(booking.discountAmount || 0);
      const computed = calculateBookingBreakdown(baseAmount, discountAmount);
      const netAmount = Number(booking.netAmount || computed.netAmount || 0);

      if (!earningsByDay.has(dayKey)) {
        earningsByDay.set(dayKey, 0);
      }
      earningsByDay.set(dayKey, (earningsByDay.get(dayKey) || 0) + netAmount);
    });

    const chartData = orderedDayKeys.map((name) => ({
      name,
      earnings: Math.round(earningsByDay.get(name) || 0),
    }));

    return NextResponse.json({ data: chartData });
  } catch (error) {
    return handleError(error);
  }
}
