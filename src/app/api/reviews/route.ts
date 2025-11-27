import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { bookingId, rating, comment } = body;

    if (!bookingId || !rating) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Fetch booking to verify ownership and status
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        review: true,
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    // Verify user is the client
    if (booking.clientId !== session.user.id) {
      return new NextResponse("Unauthorized - Only the client can review this booking", { status: 403 });
    }

    // Verify booking is completed
    if (booking.status !== "COMPLETED") {
      return new NextResponse("Booking must be completed to leave a review", { status: 400 });
    }

    // Check if review already exists
    if (booking.review) {
      return new NextResponse("Review already exists for this booking", { status: 409 });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId,
        authorId: session.user.id,
        targetId: booking.providerId,
        rating: parseInt(rating),
        comment,
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
