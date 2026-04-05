import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { hasRole } from "@/lib/auth/roles";
import { resolveProviderNetAmount } from "@/lib/analytics/providerAnalytics";

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch stats in parallel
    const [
      completedBookingsForEarnings,
      activeJobs,
      pendingRequests,
      completedJobs,
    ] = await Promise.all([
      // Total Earnings from completed bookings (net amount source of truth)
      prisma.booking.findMany({
        where: {
          providerId: userId,
          status: "COMPLETED",
        },
        select: {
          basePrice: true,
          discountAmount: true,
          totalAmount: true,
          netAmount: true,
          createdAt: true,
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

    const totalEarningsAmount = completedBookingsForEarnings.reduce(
      (sum, booking) => sum + resolveProviderNetAmount(booking),
      0,
    );

    const stats = [
      {
        title: "Total Earnings",
        value: `KES ${Math.round(totalEarningsAmount).toLocaleString()}`,
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
