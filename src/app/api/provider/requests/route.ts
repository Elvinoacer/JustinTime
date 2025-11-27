import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "PROVIDER") {
      return new NextResponse("Only providers can access this endpoint", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    // Build where clause based on status
    const where: any = {
      providerId: session.user.id,
    };

    if (status !== "all") {
      where.status = status.toUpperCase();
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              phone: true,
            },
          },
          service: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              images: true,
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
    console.error("[PROVIDER_REQUESTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
