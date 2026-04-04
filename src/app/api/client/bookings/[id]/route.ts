import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !hasAnyRole(session.user, ["CLIENT"])) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        review: {
          select: {
            id: true,
            authorId: true,
          },
        },
        dispute: {
          select: {
            status: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
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
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    // Ensure the booking belongs to the client
    if (booking.clientId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Return client-safe booking data
    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      startTime: booking.startTime,
      date: booking.date,
      service: booking.service,
      job: booking.job,
      provider: booking.provider,
      review: booking.review,
      dispute: booking.dispute,
    });
  } catch (error) {
    console.error("Error fetching client booking:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
