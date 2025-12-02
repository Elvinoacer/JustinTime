import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";

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

    // Send notification to provider
    try {
      await sendComprehensiveNotification({
        userId: booking.providerId,
        title: `New Review from ${session.user.name}`,
        message: `You received a ${rating}-star review: "${comment ? (comment.length > 50 ? comment.substring(0, 50) + "..." : comment) : "No comment"}"`,
        type: "REVIEW",
        emailSubject: `New Review Received - JustInTime`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">New Review!</h2>
            <p><strong>${session.user.name}</strong> left you a review for a completed booking.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <div style="font-size: 24px; color: #fbbf24; margin-bottom: 10px;">
                ${"★".repeat(parseInt(rating))}${"☆".repeat(5 - parseInt(rating))}
              </div>
              <p style="font-style: italic; color: #4b5563;">"${comment || "No comment provided"}"</p>
            </div>
            <a href="${process.env.NEXTAUTH_URL}/dashboard/reviews" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View All Reviews</a>
          </div>
        `
      });
    } catch (notifError) {
      console.error("Failed to send review notification:", notifError);
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
