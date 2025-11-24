import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "this-month";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case "this-week":
        startDate.setDate(now.getDate() - now.getDay());
        break;
      case "this-month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last-month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        // TODO: Handle end date filtering if needed
        break;
      case "this-year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Fetch completed bookings (earnings)
    const bookings = await prisma.booking.findMany({
      where: {
        providerId: userId,
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        service: true,
        job: true,
      },
    });

    // Calculate total earnings
    const totalEarnings = bookings.reduce((sum, booking) => {
      // Assuming price is stored in service or job. 
      // Adjust based on your actual schema if price is stored directly on booking or payment.
      // For now, using service price or job price.
      const price = booking.service?.price || booking.job?.budget || 0;
      return sum + Number(price);
    }, 0);

    // Calculate breakdown by service
    const breakdownMap = new Map<string, number>();
    bookings.forEach((booking) => {
      const name = booking.service?.title || booking.job?.title || "Unknown Service";
      const price = Number(booking.service?.price || booking.job?.budget || 0);
      breakdownMap.set(name, (breakdownMap.get(name) || 0) + price);
    });

    const breakdown = Array.from(breakdownMap.entries()).map(([service, amount]) => ({
      service,
      amount: `KES ${amount.toLocaleString()}`,
    }));

    // Fetch payouts (mocked for now as Payment model might not be fully set up for payouts)
    // In a real app, you'd query the Payment model where type is PAYOUT
    const payouts: any[] = []; 

    return successResponse({
      total: `KES ${totalEarnings.toLocaleString()}`,
      breakdown,
      payouts,
    });
  } catch (error) {
    return handleError(error);
  }
}
