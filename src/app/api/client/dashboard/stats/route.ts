import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Allow both CLIENT and PROVIDER roles to access client dashboard
    if (session.user.role !== "CLIENT" && session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch stats in parallel
    const [activeJobs, totalProposals, hiredPros, spending] = await Promise.all([
      // Active Jobs (Open or In Progress)
      prisma.job.count({
        where: {
          clientId: userId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      }),
      
      // Total Proposals received on client's jobs
      prisma.proposal.count({
        where: {
          job: {
            clientId: userId,
          },
        },
      }),

      // Hired Pros (Unique providers from confirmed/completed bookings)
      prisma.booking.findMany({
        where: {
          clientId: userId,
          status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
        },
        select: {
          providerId: true,
        },
        distinct: ["providerId"],
      }).then(bookings => bookings.length),

      // Total Spending (Completed payments)
      prisma.payment.aggregate({
        where: {
          booking: {
            clientId: userId,
          },
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const stats = [
      {
        title: "Total Spent",
        value: `KES ${spending._sum.amount?.toString() || "0"}`,
        change: "+0%", // Placeholder for now, would need historical data
        isPositive: true,
        icon: "account_balance_wallet",
        color: "bg-emerald-500",
      },
      {
        title: "Active Jobs",
        value: activeJobs.toString(),
        change: "0",
        isPositive: true,
        icon: "work",
        color: "bg-blue-500",
      },
      {
        title: "Proposals",
        value: totalProposals.toString(),
        change: "+0",
        isPositive: true,
        icon: "description",
        color: "bg-amber-500",
      },
      {
        title: "Hired Pros",
        value: hiredPros.toString(),
        change: "+0",
        isPositive: true,
        icon: "group",
        color: "bg-purple-500",
      },
    ];

    return NextResponse.json({ stats });
  } catch (error) {
    return handleError(error);
  }
}
