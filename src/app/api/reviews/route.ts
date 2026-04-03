import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";
import {
  JOB_LIFECYCLE_EVENT_TYPES,
  recordJobLifecycleEvent,
} from "@/lib/jobs/lifecycleTimeline";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { bookingId, rating, comment, idempotencyKey } = body;

    if (!bookingId || !rating) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const numericRating = Number(rating);
    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return new NextResponse("Rating must be an integer between 1 and 5", {
        status: 400,
      });
    }

    // Fetch booking to verify ownership and status
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        review: true,
        dispute: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    // Verify user is the client
    if (booking.clientId !== session.user.id) {
      return new NextResponse(
        "Unauthorized - Only the client can review this booking",
        { status: 403 },
      );
    }

    const targetUserId = booking.providerId;

    const scheduledStartAt = (() => {
      const date = new Date(booking.date);
      if (!booking.startTime) {
        return date;
      }

      const [hours, minutes] = booking.startTime
        .split(":")
        .map((value) => Number(value));

      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        date.setHours(hours, minutes, 0, 0);
      }

      return date;
    })();

    const cancelledAfterScheduledStart =
      booking.status === "CANCELLED" &&
      scheduledStartAt.getTime() <= Date.now();

    const disputeResolved = Boolean(
      booking.dispute &&
      ["RESOLVED", "CLOSED"].includes(booking.dispute.status),
    );

    const reviewAllowed =
      booking.status === "COMPLETED" ||
      cancelledAfterScheduledStart ||
      disputeResolved;

    if (!reviewAllowed) {
      return new NextResponse(
        "Review is only allowed for completed work, qualifying cancellations, or resolved disputes",
        {
          status: 400,
        },
      );
    }

    // Handle client retries idempotently when review already exists.
    if (booking.review?.authorId === session.user.id && idempotencyKey) {
      return NextResponse.json({
        review: booking.review,
        idempotent: true,
      });
    }

    if (booking.review) {
      return new NextResponse("Review already exists for this booking", {
        status: 409,
      });
    }

    let review;
    try {
      review = await prisma.review.create({
        data: {
          bookingId,
          authorId: session.user.id,
          targetId: targetUserId,
          rating: numericRating,
          comment,
        },
      });
    } catch (createError) {
      const maybePrismaError = createError as { code?: string };
      if (maybePrismaError?.code === "P2002") {
        const existingReview = await prisma.review.findUnique({
          where: { bookingId },
        });

        if (existingReview?.authorId === session.user.id) {
          return NextResponse.json({
            review: existingReview,
            idempotent: true,
          });
        }

        return new NextResponse("Review already exists for this booking", {
          status: 409,
        });
      }

      throw createError;
    }

    if (booking.jobId) {
      await recordJobLifecycleEvent({
        jobId: booking.jobId,
        bookingId: booking.id,
        eventType: JOB_LIFECYCLE_EVENT_TYPES.REVIEW_SUBMITTED,
        fromState: "COMPLETED",
        toState: "COMPLETED",
        reason: "Client submitted feedback after completion.",
        actorUserId: session.user.id,
        actorName: session.user.name,
        actorRole: "CLIENT",
        metadata: {
          reviewId: review.id,
          rating: review.rating,
          hasComment: Boolean(comment && String(comment).trim()),
          idempotencyKey:
            typeof idempotencyKey === "string" ? idempotencyKey : undefined,
        },
        idempotencyKey: `review:${review.id}:submitted`,
      });
    }

    // Send notification to provider
    try {
      await sendComprehensiveNotification({
        userId: targetUserId,
        title: `New Review from ${session.user.name}`,
        message: `You received a ${numericRating}-star review: "${comment ? (comment.length > 50 ? comment.substring(0, 50) + "..." : comment) : "No comment"}"`,
        type: "REVIEW",
        emailSubject: `New Review Received - JustInTime`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">New Review!</h2>
            <p><strong>${session.user.name}</strong> left you a review for a completed booking.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <div style="font-size: 24px; color: #fbbf24; margin-bottom: 10px;">
                ${"★".repeat(numericRating)}${"☆".repeat(5 - numericRating)}
              </div>
              <p style="font-style: italic; color: #4b5563;">"${comment || "No comment provided"}"</p>
            </div>
            <a href="${process.env.NEXTAUTH_URL}/dashboard/reviews" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View All Reviews</a>
          </div>
        `,
      });
    } catch (notifError) {
      console.error("Failed to send review notification:", notifError);
    }

    return NextResponse.json({ review, idempotent: false });
  } catch (error) {
    console.error("Error creating review:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
