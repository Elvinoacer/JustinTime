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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {
      providerId: userId,
    };

    if (status) {
      where.status = status;
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            name: true,
            image: true,
          },
        },
        service: {
          select: {
            title: true,
          },
        },
        job: {
          select: {
            title: true,
          },
        },
        slots: true,
      },
      orderBy: {
        date: "desc",
      },
      take: 10, // Limit to recent bookings
    });

    // Format for frontend
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      client: booking.client.name || "Unknown Client",
      clientImage: booking.client.image,
      clientPhone: booking.clientPhone,
      clientAddress: booking.clientAddress,
      service: booking.service?.title || booking.job?.title || "Custom Service",
      date: new Date(booking.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      slots: booking.slots,
      amount: `Kes ${Number(booking.totalAmount).toLocaleString()}`,
      status: booking.status,
      notes: booking.notes,
      statusColor: getStatusColor(booking.status),
    }));

    return NextResponse.json({ bookings: formattedBookings });
  } catch (error) {
    return handleError(error);
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";
    case "IN_PROGRESS":
    case "CONFIRMED":
      return "bg-blue-100 text-blue-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
