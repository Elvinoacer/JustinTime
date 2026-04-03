import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { hasRole } from "@/lib/auth/roles";
import { calculateBookingBreakdown } from "@/lib/financials";

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "this-month";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    let endDate: Date | undefined;

    switch (range) {
      case "this-week":
        startDate.setDate(now.getDate() - now.getDay());
        break;
      case "this-month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last-month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "this-year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const createdAtFilter: {
      gte: Date;
      lt?: Date;
    } = {
      gte: startDate,
    };

    if (endDate) {
      createdAtFilter.lt = endDate;
    }

    const bookings = await prisma.booking.findMany({
      where: {
        providerId: userId,
        status: "COMPLETED",
        createdAt: createdAtFilter,
      },
      include: {
        service: true,
        job: true,
      },
    });

    let totalEarningsAmount = 0;
    const breakdownMap = new Map<string, number>();

    bookings.forEach((booking) => {
      const name =
        booking.service?.title || booking.job?.title || "Unknown Service";

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

      totalEarningsAmount += netAmount;
      breakdownMap.set(name, (breakdownMap.get(name) || 0) + netAmount);
    });

    const breakdown = Array.from(breakdownMap.entries()).map(
      ([service, amount]) => ({
        service,
        amount: roundCurrency(amount),
        amountDisplay: `KES ${roundCurrency(amount).toLocaleString()}`,
      }),
    );

    const payoutRows = await prisma.transaction.findMany({
      where: {
        wallet: {
          userId,
        },
        type: "WITHDRAWAL",
        createdAt: createdAtFilter,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const payouts = payoutRows.map((payout) => ({
      id: payout.id,
      date: payout.createdAt.toISOString(),
      amount: Number(payout.amount),
      amountDisplay: `KES ${Number(payout.amount).toLocaleString()}`,
      description: payout.description,
    }));

    return successResponse({
      total: roundCurrency(totalEarningsAmount),
      totalDisplay: `KES ${roundCurrency(totalEarningsAmount).toLocaleString()}`,
      breakdown,
      payouts,
    });
  } catch (error) {
    return handleError(error);
  }
}
