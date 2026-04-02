import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { hasRole } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch stats in parallel
    const [totalEarnings, activeJobs, pendingRequests, completedJobs] =
      await Promise.all([
        // Total Earnings (Completed payments)
        prisma.payment.aggregate({
          where: {
            booking: {
              providerId: userId,
            },
            status: "COMPLETED",
          },
          _sum: {
            amount: true,
          },
        }),

        // Active Jobs (Confirmed or In Progress bookings)
        prisma.booking.count({
          where: {
            providerId: userId,
            status: {
              in: ["CONFIRMED", "IN_PROGRESS", "AWAITING_CLIENT_CONFIRMATION"],
            },
          },
        }),

        // Pending Requests (Pending proposals)
        prisma.proposal.count({
          where: {
            providerId: userId,
            status: "PENDING",
          },
        }),

        // Completed Jobs
        prisma.booking.count({
          where: {
            providerId: userId,
            status: "COMPLETED",
          },
        }),
      ]);

    const stats = [
      {
        title: "Total Earnings",
        value: `KES ${totalEarnings._sum.amount?.toString() || "0"}`,
        change: "+0%", // Placeholder - would need historical data
        isPositive: true,
        icon: "payments",
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
        title: "Pending Requests",
        value: pendingRequests.toString(),
        change: "+0",
        isPositive: true,
        icon: "pending_actions",
        color: "bg-amber-500",
      },
      {
        title: "Completed Jobs",
        value: completedJobs.toString(),
        change: "+0",
        isPositive: true,
        icon: "check_circle",
        color: "bg-purple-500",
      },
    ];

    return NextResponse.json({ stats });
  } catch (error) {
    return handleError(error);
  }
}
