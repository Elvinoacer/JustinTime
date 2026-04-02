import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createBookingNotifications } from "@/lib/utils/notifications";
import {
  extractEscrowMilestones,
  upsertEscrowMilestones,
} from "@/lib/escrow/milestones";
import {
  JOB_LIFECYCLE_EVENT_TYPES,
  recordJobLifecycleEvent,
} from "@/lib/jobs/lifecycleTimeline";
import {
  BOOKING_LIFECYCLE_EVENT_TYPES,
  recordBookingLifecycleEvent,
} from "@/lib/bookings/lifecycleTimeline";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes, cancellationReason } = body;

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

    // Verify ownership (either provider or client can update specific things, but mainly provider for status)
    // For now, let's allow provider to update status/notes, and client to cancel (update status to CANCELLED)
    const isProvider = booking.providerId === session.user.id;
    const isClient = booking.clientId === session.user.id;

    console.log("[BOOKING_PATCH] Authorization check:", {
      bookingId: id,
      sessionUserId: session.user.id,
      bookingProviderId: booking.providerId,
      bookingClientId: booking.clientId,
      isProvider,
      isClient,
    });

    if (!isProvider && !isClient) {
      console.error(
        "[BOOKING_PATCH] Authorization failed - user is neither provider nor client",
      );
      return new NextResponse(
        JSON.stringify({
          error: "Unauthorized",
          message: "You do not have permission to update this booking",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    if (isClient && !isProvider && status && status !== "CANCELLED") {
      console.error(
        "[BOOKING_PATCH] Client trying to update to non-CANCELLED status:",
        status,
      );
      return new NextResponse(
        JSON.stringify({
          error: "Forbidden",
          message: "Clients can only cancel bookings",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const { plainNotes, escrow } = extractEscrowMilestones(booking.notes);
    const notesForUpdate =
      typeof notes === "string"
        ? escrow
          ? upsertEscrowMilestones(notes.trim() || null, escrow)
          : notes || undefined
        : undefined;

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: status || undefined,
        notes: notesForUpdate,
        ...(status === "CANCELLED"
          ? {
              cancelledAt: new Date(),
              cancelledBy: session.user.id,
              cancellationReason:
                typeof cancellationReason === "string"
                  ? cancellationReason.trim().slice(0, 500)
                  : undefined,
            }
          : {}),
      },
    });

    const actorRole = isProvider ? "PROVIDER" : "CLIENT";
    const actorName =
      session.user.name?.trim() || (isProvider ? "Provider" : "Client");

    if (status && status !== booking.status) {
      await recordBookingLifecycleEvent({
        bookingId: booking.id,
        eventType: BOOKING_LIFECYCLE_EVENT_TYPES.BOOKING_STATUS_CHANGED,
        fromState: booking.status,
        toState: status,
        reason:
          status === "CANCELLED"
            ? cancellationReason || "Booking was cancelled."
            : "Booking status updated.",
        actorUserId: session.user.id,
        actorName,
        actorRole,
        idempotencyKey: `booking:${booking.id}:status:${booking.status}:${status}:${updatedBooking.updatedAt.toISOString()}`,
      });

      if (booking.jobId) {
        await recordJobLifecycleEvent({
          jobId: booking.jobId,
          bookingId: booking.id,
          eventType: JOB_LIFECYCLE_EVENT_TYPES.BOOKING_STATUS_CHANGED,
          fromState: booking.status,
          toState: status,
          reason:
            status === "CANCELLED"
              ? cancellationReason || "Booking was cancelled."
              : "Booking status updated.",
          actorUserId: session.user.id,
          actorName,
          actorRole,
          idempotencyKey: `booking:${booking.id}:status:${booking.status}:${status}:${updatedBooking.updatedAt.toISOString()}`,
        });
      }

      if (status === "COMPLETED") {
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

          await prisma.booking.update({
            where: { id },
            data: {
              notes: upsertEscrowMilestones(plainNotes, escrow),
            },
          });
        }

        const pendingPayments = await prisma.payment.findMany({
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

        await prisma.payment.updateMany({
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
              recordBookingLifecycleEvent({
                bookingId: booking.id,
                paymentId: payment.id,
                eventType: BOOKING_LIFECYCLE_EVENT_TYPES.PAYMENT_STATUS_CHANGED,
                fromState: payment.status,
                toState: "COMPLETED",
                reason: "Escrow released after booking completion.",
                actorUserId: session.user.id,
                actorName,
                actorRole,
                metadata: {
                  method: payment.method,
                  previousTransactionId: payment.transactionId,
                  nextTransactionId: `escrow_release_${id}`,
                },
                idempotencyKey: `booking:${booking.id}:payment:${payment.id}:status:PENDING:COMPLETED:${updatedBooking.updatedAt.toISOString()}`,
              }),
            ),
          );
        }

        if (booking.jobId && pendingPayments.length > 0) {
          await Promise.all(
            pendingPayments.map((payment) =>
              recordJobLifecycleEvent({
                jobId: booking.jobId as string,
                bookingId: booking.id,
                paymentId: payment.id,
                eventType: JOB_LIFECYCLE_EVENT_TYPES.PAYMENT_STATUS_CHANGED,
                fromState: payment.status,
                toState: "COMPLETED",
                reason: "Escrow released after booking completion.",
                actorUserId: session.user.id,
                actorName,
                actorRole,
                metadata: {
                  method: payment.method,
                  previousTransactionId: payment.transactionId,
                  nextTransactionId: `escrow_release_${id}`,
                },
                idempotencyKey: `payment:${payment.id}:status:PENDING:COMPLETED:${updatedBooking.updatedAt.toISOString()}`,
              }),
            ),
          );
        }
      }

      if (status === "CANCELLED") {
        const refundablePayments = await prisma.payment.findMany({
          where: {
            bookingId: id,
            status: {
              in: ["PENDING", "COMPLETED"],
            },
          },
          select: {
            id: true,
            status: true,
            method: true,
            transactionId: true,
          },
        });

        await prisma.payment.updateMany({
          where: {
            bookingId: id,
            status: {
              in: ["PENDING", "COMPLETED"],
            },
          },
          data: {
            status: "REFUNDED",
            transactionId: `escrow_refund_${id}`,
          },
        });

        if (refundablePayments.length > 0) {
          await Promise.all(
            refundablePayments.map((payment) =>
              recordBookingLifecycleEvent({
                bookingId: booking.id,
                paymentId: payment.id,
                eventType: BOOKING_LIFECYCLE_EVENT_TYPES.PAYMENT_STATUS_CHANGED,
                fromState: payment.status,
                toState: "REFUNDED",
                reason:
                  (typeof cancellationReason === "string" &&
                    cancellationReason.trim()) ||
                  "Booking cancelled and payment refunded.",
                actorUserId: session.user.id,
                actorName,
                actorRole,
                metadata: {
                  method: payment.method,
                  previousTransactionId: payment.transactionId,
                  nextTransactionId: `escrow_refund_${id}`,
                },
                idempotencyKey: `booking:${booking.id}:payment:${payment.id}:status:${payment.status}:REFUNDED:${updatedBooking.updatedAt.toISOString()}`,
              }),
            ),
          );
        }

        if (booking.jobId && refundablePayments.length > 0) {
          await Promise.all(
            refundablePayments.map((payment) =>
              recordJobLifecycleEvent({
                jobId: booking.jobId as string,
                bookingId: booking.id,
                paymentId: payment.id,
                eventType: JOB_LIFECYCLE_EVENT_TYPES.PAYMENT_STATUS_CHANGED,
                fromState: payment.status,
                toState: "REFUNDED",
                reason:
                  (typeof cancellationReason === "string" &&
                    cancellationReason.trim()) ||
                  "Booking cancelled and payment refunded.",
                actorUserId: session.user.id,
                actorName,
                actorRole,
                metadata: {
                  method: payment.method,
                  previousTransactionId: payment.transactionId,
                  nextTransactionId: `escrow_refund_${id}`,
                },
                idempotencyKey: `payment:${payment.id}:status:${payment.status}:REFUNDED:${updatedBooking.updatedAt.toISOString()}`,
              }),
            ),
          );
        }
      }
    }

    // Send notifications if status changed
    if (status && status !== booking.status) {
      // Notify the OTHER party
      const recipientId = isProvider ? booking.clientId : booking.providerId;

      await createBookingNotifications(
        booking.id,
        session.user.id,
        recipientId,
        status, // Status is used as notification type/content hint
        booking.service?.title || "Service",
      );

      // Send email to client when provider updates status
      const recipientEmail = isProvider
        ? booking.client.email
        : booking.service?.provider?.email;
      const recipientName = isProvider
        ? booking.client.name
        : booking.service?.provider?.name;

      if (recipientEmail && recipientName) {
        // Send email notification when provider updates status
        if (isProvider) {
          try {
            const { sendBookingStatusUpdateEmail, sendReviewRequestEmail } =
              await import("@/lib/email");
            const providerName = session.user.name || "The provider";

            await sendBookingStatusUpdateEmail(
              recipientEmail,
              recipientName,
              providerName,
              booking.service?.title || "Service",
              status,
              booking.date,
              booking.id,
              booking.slots,
            );
            console.log(`[BOOKING_PATCH] Email sent to ${recipientEmail}`);

            if (status === "COMPLETED") {
              await sendReviewRequestEmail(
                recipientEmail,
                recipientName,
                providerName,
                booking.service?.title || "Service",
                booking.id,
              );
              console.log(
                `[BOOKING_PATCH] Review request email sent to ${recipientEmail}`,
              );

              // Check and award badges for the provider
              try {
                const { checkAndAwardBadges } =
                  await import("@/lib/gamification/badge-checker");
                await checkAndAwardBadges(booking.providerId);
                console.log(
                  `[BOOKING_PATCH] Badge check completed for provider ${booking.providerId}`,
                );
              } catch (badgeError) {
                console.error(
                  "[BOOKING_PATCH] Error checking badges:",
                  badgeError,
                );
                // Don't fail the request if badge check fails
              }
            }
          } catch (emailError) {
            console.error("[BOOKING_PATCH] Error sending email:", emailError);
            // Don't fail the request if email fails
          }
        }
      }
    }

    const { escrow: updatedEscrow } = extractEscrowMilestones(
      updatedBooking.notes,
    );

    return NextResponse.json({
      ...updatedBooking,
      escrowMilestones: updatedEscrow,
    });
  } catch (error) {
    console.error("[BOOKING_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
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

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            title: true,
            price: true,
            defaultDuration: true,
            provider: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        client: {
          select: {
            name: true,
            email: true,
            image: true,
            phone: true,
          },
        },
        slots: true,
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    if (
      booking.providerId !== session.user.id &&
      booking.clientId !== session.user.id
    ) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const { escrow } = extractEscrowMilestones(booking.notes);

    return NextResponse.json({
      ...booking,
      escrowMilestones: escrow,
    });
  } catch (error) {
    console.error("[BOOKING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Permanently delete a booking
export async function DELETE(
  request: Request,
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
      select: {
        id: true,
        clientId: true,
        providerId: true,
        status: true,
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    // Authorization: Only client or provider can delete
    const isClient = booking.clientId === session.user.id;
    const isProvider = booking.providerId === session.user.id;

    if (!isClient && !isProvider) {
      return new NextResponse(
        "Unauthorized - You don't have permission to delete this booking",
        {
          status: 403,
        },
      );
    }

    // Additional business rule: Only cancelled or completed bookings can be deleted
    if (!["CANCELLED", "COMPLETED"].includes(booking.status)) {
      return new NextResponse(
        "Cannot delete active booking. Please cancel it first.",
        { status: 400 },
      );
    }

    // Delete the booking and all related data (cascading delete handled by Prisma schema)
    await prisma.booking.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
