import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    // Get bookings where user is the client
    const where: any = { clientId: session.user.id };
    if (searchParams.get("status")) where.status = searchParams.get("status");

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              category: { select: { name: true } },
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      items: bookings,
      total,
      page,
      pageSize,
      hasMore: skip + bookings.length < total,
    });
  } catch (error) {
    console.error("[BOOKINGS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
