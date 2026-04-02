import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createBookingNotifications } from "@/lib/utils/notifications";
import {
  extractEscrowMilestones,
  upsertEscrowMilestones,
} from "@/lib/escrow/milestones";
import {
  BOOKING_LIFECYCLE_EVENT_TYPES,
  recordBookingLifecycleEvent,
} from "@/lib/bookings/lifecycleTimeline";
import {
  JOB_LIFECYCLE_EVENT_TYPES,
  recordJobLifecycleEvent,
} from "@/lib/jobs/lifecycleTimeline";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            provider: true,
          },
        },
        client: true,
        slots: true,
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    const isClient = booking.clientId === session.user.id;
    if (!isClient) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (booking.status === "COMPLETED") {
      return NextResponse.json({
        message: "Booking is already completed",
        bookingId: booking.id,
      });
    }

    if (booking.status !== "AWAITING_CLIENT_CONFIRMATION") {
      return NextResponse.json(
        {
          error:
            "Booking is not ready for completion confirmation by the client",
          currentStatus: booking.status,
        },
        { status: 409 },
      );
    }

    const actorName = session.user.name?.trim() || "Client";
    const actorRole = "CLIENT";
    const { plainNotes, escrow } = extractEscrowMilestones(booking.notes);

    const { updatedBooking } = await prisma.$transaction(async (tx) => {
      let notesForUpdate: string | null | undefined = booking.notes;

      if (escrow) {
        escrow.milestones = escrow.milestones.map((milestone) =>
          milestone.status === "RELEASED"
            ? milestone
            : {
                ...milestone,
                status: "RELEASED",
                releasedAt: new Date().toISOString(),
              },
        );
        escrow.releasedAmount = escrow.totalAmount;
        escrow.updatedAt = new Date().toISOString();
        notesForUpdate = upsertEscrowMilestones(plainNotes, escrow);
      }

      const completedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "COMPLETED",
          notes: notesForUpdate,
        },
      });

      await recordBookingLifecycleEvent(
        {
          bookingId: booking.id,
          eventType: BOOKING_LIFECYCLE_EVENT_TYPES.BOOKING_STATUS_CHANGED,
          fromState: booking.status,
          toState: "COMPLETED",
          reason: "Client confirmed work completion.",
          actorUserId: session.user.id,
          actorName,
          actorRole,
          idempotencyKey: `booking:${booking.id}:status:${booking.status}:COMPLETED:${completedBooking.updatedAt.toISOString()}`,
        },
        tx,
      );

      await recordBookingLifecycleEvent(
        {
          bookingId: booking.id,
          eventType: BOOKING_LIFECYCLE_EVENT_TYPES.CLIENT_CONFIRMED_COMPLETE,
          fromState: booking.status,
          toState: "COMPLETED",
          reason: "Client confirmed provider completion.",
          actorUserId: session.user.id,
          actorName,
          actorRole,
          idempotencyKey: `booking:${booking.id}:client-confirmed-complete:${completedBooking.updatedAt.toISOString()}`,
        },
        tx,
      );

      if (booking.jobId) {
        await recordJobLifecycleEvent(
          {
            jobId: booking.jobId,
            bookingId: booking.id,
            eventType: JOB_LIFECYCLE_EVENT_TYPES.BOOKING_STATUS_CHANGED,
            fromState: booking.status,
            toState: "COMPLETED",
            reason: "Client confirmed work completion.",
            actorUserId: session.user.id,
            actorName,
            actorRole,
            idempotencyKey: `booking:${booking.id}:job-status:${booking.status}:COMPLETED:${completedBooking.updatedAt.toISOString()}`,
          },
          tx,
        );
      }

      const pendingPayments = await tx.payment.findMany({
        where: {
          bookingId: id,
          status: "PENDING",
        },
        select: {
          id: true,
          status: true,
          method: true,
          transactionId: true,
        },
      });

      await tx.payment.updateMany({
        where: {
          bookingId: id,
          status: "PENDING",
        },
        data: {
          status: "COMPLETED",
          transactionId: `escrow_release_${id}`,
        },
      });

      if (pendingPayments.length > 0) {
        await Promise.all(
          pendingPayments.map((payment) =>
            recordBookingLifecycleEvent(
              {
                bookingId: booking.id,
                paymentId: payment.id,
                eventType: BOOKING_LIFECYCLE_EVENT_TYPES.PAYMENT_STATUS_CHANGED,
                fromState: payment.status,
                toState: "COMPLETED",
                reason: "Escrow released after client completion confirmation.",
                actorUserId: session.user.id,
                actorName,
                actorRole,
                metadata: {
                  method: payment.method,
                  previousTransactionId: payment.transactionId,
                  nextTransactionId: `escrow_release_${id}`,
                },
                idempotencyKey: `booking:${booking.id}:payment:${payment.id}:status:PENDING:COMPLETED:${completedBooking.updatedAt.toISOString()}`,
              },
              tx,
            ),
          ),
        );
      }

      if (booking.jobId && pendingPayments.length > 0) {
        await Promise.all(
          pendingPayments.map((payment) =>
            recordJobLifecycleEvent(
              {
                jobId: booking.jobId as string,
                bookingId: booking.id,
                paymentId: payment.id,
                eventType: JOB_LIFECYCLE_EVENT_TYPES.PAYMENT_STATUS_CHANGED,
                fromState: payment.status,
                toState: "COMPLETED",
                reason: "Escrow released after client completion confirmation.",
                actorUserId: session.user.id,
                actorName,
                actorRole,
                metadata: {
                  method: payment.method,
                  previousTransactionId: payment.transactionId,
                  nextTransactionId: `escrow_release_${id}`,
                },
                idempotencyKey: `payment:${payment.id}:status:PENDING:COMPLETED:${completedBooking.updatedAt.toISOString()}`,
              },
              tx,
            ),
          ),
        );
      }

      return {
        updatedBooking: completedBooking,
      };
    });

    await createBookingNotifications(
      booking.id,
      session.user.id,
      booking.providerId,
      "COMPLETED",
      booking.service?.title || "Service",
    );

    try {
      const { sendBookingStatusUpdateEmail, sendReviewRequestEmail } =
        await import("@/lib/email");

      const providerName = booking.service?.provider?.name || "Provider";
      const providerEmail = booking.service?.provider?.email;
      const clientName = booking.client.name || "Client";
      const clientEmail = booking.client.email;

      if (providerEmail) {
        await sendBookingStatusUpdateEmail(
          providerEmail,
          providerName,
          clientName,
          booking.service?.title || "Service",
          "COMPLETED",
          booking.date,
          booking.id,
          booking.slots,
        );
      }

      if (clientEmail) {
        await sendReviewRequestEmail(
          clientEmail,
          clientName,
          providerName,
          booking.service?.title || "Service",
          booking.id,
        );
      }

      try {
        const { checkAndAwardBadges } =
          await import("@/lib/gamification/badge-checker");
        await checkAndAwardBadges(booking.providerId);
      } catch (badgeError) {
        console.error(
          "[BOOKING_CONFIRM_COMPLETION] Error checking badges:",
          badgeError,
        );
      }
    } catch (emailError) {
      console.error(
        "[BOOKING_CONFIRM_COMPLETION] Error sending completion notifications:",
        emailError,
      );
    }

    const { escrow: updatedEscrow } = extractEscrowMilestones(
      updatedBooking.notes,
    );

    return NextResponse.json({
      ...updatedBooking,
      escrowMilestones: updatedEscrow,
      message: "Booking completion confirmed successfully",
    });
  } catch (error) {
    console.error("[BOOKING_CONFIRM_COMPLETION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
