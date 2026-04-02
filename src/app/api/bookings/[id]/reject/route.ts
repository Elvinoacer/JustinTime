import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  BOOKING_LIFECYCLE_EVENT_TYPES,
  recordBookingLifecycleEvent,
} from "@/lib/bookings/lifecycleTimeline";
import {
  JOB_LIFECYCLE_EVENT_TYPES,
  recordJobLifecycleEvent,
} from "@/lib/jobs/lifecycleTimeline";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = body;
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, title: true } },
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    // Check if the provider owns this booking
    if (booking.providerId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Check if booking is still pending
    if (booking.status !== "PENDING") {
      return new NextResponse("Booking is not pending", { status: 400 });
    }

    // Update booking status to CANCELLED
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        client: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, title: true } },
      },
    });

    const actorName = session.user.name?.trim() || "Provider";
    const rejectionReason =
      typeof reason === "string" && reason.trim().length > 0
        ? reason.trim()
        : "Booking rejected by provider.";

    await recordBookingLifecycleEvent({
      bookingId: booking.id,
      eventType: BOOKING_LIFECYCLE_EVENT_TYPES.BOOKING_STATUS_CHANGED,
      fromState: booking.status,
      toState: "CANCELLED",
      reason: rejectionReason,
      actorUserId: session.user.id,
      actorName,
      actorRole: "PROVIDER",
      idempotencyKey: `booking:${booking.id}:status:${booking.status}:CANCELLED:${updatedBooking.updatedAt.toISOString()}`,
    });

    if (booking.jobId) {
      await recordJobLifecycleEvent({
        jobId: booking.jobId,
        bookingId: booking.id,
        eventType: JOB_LIFECYCLE_EVENT_TYPES.BOOKING_STATUS_CHANGED,
        fromState: booking.status,
        toState: "CANCELLED",
        reason: rejectionReason,
        actorUserId: session.user.id,
        actorName,
        actorRole: "PROVIDER",
        idempotencyKey: `booking:${booking.id}:job-status:${booking.status}:CANCELLED:${updatedBooking.updatedAt.toISOString()}`,
      });
    }

    // Create notification for client
    await prisma.notification.create({
      data: {
        userId: booking.clientId,
        type: "BOOKING_CANCELLED",
        title: "Booking Rejected",
        message: reason
          ? `Your booking for ${booking.service?.title} was rejected. Reason: ${reason}`
          : `Your booking for ${booking.service?.title} was rejected by the provider.`,
      },
    });

    // TODO: Send email to client about rejection
    // await sendBookingRejectionEmail(booking.client.email, updatedBooking, reason);

    return NextResponse.json({
      ...updatedBooking,
      message: "Booking rejected successfully",
    });
  } catch (error) {
    console.error("[BOOKING_REJECT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
