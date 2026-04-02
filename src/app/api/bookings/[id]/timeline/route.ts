import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { hasRole } from "@/lib/auth/roles";

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: bookingId } = await params;
    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(
      toPositiveInt(searchParams.get("pageSize"), 50),
      200,
    );
    const skip = (page - 1) * pageSize;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        clientId: true,
        providerId: true,
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    const isAdmin = hasRole(session.user, "ADMIN");
    const canAccess =
      isAdmin ||
      booking.clientId === session.user.id ||
      booking.providerId === session.user.id;

    if (!canAccess) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const [events, total] = await Promise.all([
      prisma.bookingLifecycleEvent.findMany({
        where: { bookingId },
        include: {
          payment: {
            select: {
              id: true,
              method: true,
              status: true,
              transactionId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.bookingLifecycleEvent.count({ where: { bookingId } }),
    ]);

    return NextResponse.json({
      items: events,
      page,
      pageSize,
      total,
      hasMore: skip + events.length < total,
    });
  } catch (error) {
    console.error("[BOOKING_TIMELINE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
