import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get last 7 days of earnings
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          providerId: userId,
        },
        status: "COMPLETED",
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by day
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const earningsByDay: Record<string, number> = {};

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayName = dayNames[date.getDay()];
      earningsByDay[dayName] = 0;
    }

    // Aggregate payments by day
    payments.forEach(payment => {
      const dayName = dayNames[new Date(payment.createdAt).getDay()];
      earningsByDay[dayName] += Number(payment.amount);
    });

    // Format for chart
    const chartData = Object.entries(earningsByDay).map(([name, earnings]) => ({
      name,
      earnings: Math.round(earnings),
    }));

    return NextResponse.json({ data: chartData });
  } catch (error) {
    return handleError(error);
  }
}
