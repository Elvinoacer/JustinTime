"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { calculateRefund } from "@/lib/cancellation";
import {
  BOOKING_LIFECYCLE_EVENT_TYPES,
  recordBookingLifecycleEvent,
} from "@/lib/bookings/lifecycleTimeline";
import {
  JOB_LIFECYCLE_EVENT_TYPES,
  recordJobLifecycleEvent,
} from "@/lib/jobs/lifecycleTimeline";
import { revalidatePath } from "next/cache";

export async function getRefundPreview(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });

  if (!booking) throw new Error("Booking not found");

  if (booking.status === "CANCELLED") {
    return { alreadyCancelled: true };
  }

  // Default policy is FLEXIBLE if not set (though we added default in schema, legacy data might need fallback)
  const policy = booking.service?.cancellationPolicy || "FLEXIBLE";

  // Fetch slots separately since we didn't include them above
  const slots = await prisma.bookingSlot.findMany({
    where: { bookingId: booking.id },
    orderBy: { date: "asc" },
  });

  if (slots.length === 0) {
    // Fallback logic if needed, or throw
    // For 'simulate' purposes without slots, maybe use just now + 24h?
    // But let's assume valid booking has slots.
  }

  // Use the first slot's start time as the booking start time
  const firstSlot = slots[0];
  const bookingDate = new Date(firstSlot.date); // This usually has time 00:00:00
  const [hours, minutes] = firstSlot.startTime.split(":").map(Number);
  bookingDate.setHours(hours, minutes);

  const result = calculateRefund(
    Number(booking.totalAmount),
    bookingDate,
    policy,
  );

  return {
    ...result,
    currency: "KES", // Or dynamic
    policyDescription: booking.service?.cancellationPolicy,
  };
}

export async function cancelBooking(bookingId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const normalizedReason = reason.trim();
  if (normalizedReason.length < 5) {
    throw new Error("Please provide a clear cancellation reason");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      payment: true,
      client: {
        select: {
          name: true,
          wallet: {
            select: { id: true },
          },
        },
      },
      slots: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!booking) throw new Error("Booking not found");

  if (
    booking.clientId !== session.user.id &&
    booking.providerId !== session.user.id
  ) {
    throw new Error("Unauthorized");
  }

  if (["CANCELLED", "COMPLETED", "DISPUTED"].includes(booking.status)) {
    throw new Error("This booking can no longer be cancelled");
  }

  const firstSlot = booking.slots[0];
  let bookingDate = new Date(booking.date);
  if (firstSlot) {
    bookingDate = new Date(firstSlot.date);
    const [hours, minutes] = firstSlot.startTime.split(":").map(Number);
    bookingDate.setHours(hours, minutes);
  }

  const policy = booking.service?.cancellationPolicy || "FLEXIBLE";
  const calculation = calculateRefund(
    Number(booking.totalAmount),
    bookingDate,
    policy,
  );

  const hasRefundablePayment = Boolean(
    booking.payment &&
    ["PENDING", "COMPLETED"].includes(booking.payment.status),
  );

  const effectiveRefundAmount = hasRefundablePayment
    ? calculation.refundAmount
    : 0;
  const effectivePenaltyAmount =
    Number(booking.totalAmount) - effectiveRefundAmount;

  const actorRole =
    booking.providerId === session.user.id ? "PROVIDER" : "CLIENT";
  const actorName =
    session.user.name?.trim() ||
    (actorRole === "PROVIDER" ? "Provider" : "Client");

  await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: session.user.id,
        cancellationReason: normalizedReason,
        refundAmount: effectiveRefundAmount,
        penaltyAmount: effectivePenaltyAmount,
      },
    });

    await recordBookingLifecycleEvent(
      {
        bookingId: booking.id,
        eventType: BOOKING_LIFECYCLE_EVENT_TYPES.BOOKING_STATUS_CHANGED,
        fromState: booking.status,
        toState: "CANCELLED",
        reason: normalizedReason,
        actorUserId: session.user.id,
        actorName,
        actorRole,
        metadata: {
          refundAmount: effectiveRefundAmount,
          penaltyAmount: effectivePenaltyAmount,
          policyUsed: policy,
        },
        idempotencyKey: `booking:${booking.id}:status:${booking.status}:CANCELLED:${updatedBooking.updatedAt.toISOString()}`,
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
          toState: "CANCELLED",
          reason: normalizedReason,
          actorUserId: session.user.id,
          actorName,
          actorRole,
          metadata: {
            refundAmount: effectiveRefundAmount,
            penaltyAmount: effectivePenaltyAmount,
            policyUsed: policy,
          },
          idempotencyKey: `booking:${booking.id}:job-status:${booking.status}:CANCELLED:${updatedBooking.updatedAt.toISOString()}`,
        },
        tx,
      );
    }

    if (booking.payment && hasRefundablePayment) {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: {
          status: "REFUNDED",
        },
      });

      await recordBookingLifecycleEvent(
        {
          bookingId: booking.id,
          paymentId: booking.payment.id,
          eventType: BOOKING_LIFECYCLE_EVENT_TYPES.PAYMENT_STATUS_CHANGED,
          fromState: booking.payment.status,
          toState: "REFUNDED",
          reason: `Refund processed during cancellation. ${normalizedReason}`,
          actorUserId: session.user.id,
          actorName,
          actorRole,
          metadata: {
            method: booking.payment.method,
            transactionId: booking.payment.transactionId,
            refundAmount: effectiveRefundAmount,
          },
          idempotencyKey: `booking:${booking.id}:payment:${booking.payment.id}:status:${booking.payment.status}:REFUNDED:${updatedBooking.updatedAt.toISOString()}`,
        },
        tx,
      );

      if (booking.jobId) {
        await recordJobLifecycleEvent(
          {
            jobId: booking.jobId,
            bookingId: booking.id,
            paymentId: booking.payment.id,
            eventType: JOB_LIFECYCLE_EVENT_TYPES.PAYMENT_STATUS_CHANGED,
            fromState: booking.payment.status,
            toState: "REFUNDED",
            reason: `Refund processed during cancellation. ${normalizedReason}`,
            actorUserId: session.user.id,
            actorName,
            actorRole,
            metadata: {
              method: booking.payment.method,
              transactionId: booking.payment.transactionId,
              refundAmount: effectiveRefundAmount,
            },
            idempotencyKey: `payment:${booking.payment.id}:status:${booking.payment.status}:REFUNDED:${updatedBooking.updatedAt.toISOString()}`,
          },
          tx,
        );
      }
    }

    if (effectiveRefundAmount > 0) {
      const wallet = booking.client.wallet
        ? booking.client.wallet
        : await tx.wallet.create({
            data: {
              userId: booking.clientId,
              balance: 0,
            },
            select: { id: true },
          });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: effectiveRefundAmount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: effectiveRefundAmount,
          type: "REFUND",
          description: `Booking cancellation refund (${booking.id}): ${normalizedReason}`,
        },
      });
    }
  });

  revalidatePath("/client/bookings");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/client/bookings/${bookingId}`);

  return {
    success: true,
    refundAmount: effectiveRefundAmount,
    penaltyAmount: effectivePenaltyAmount,
    policyUsed: policy,
    paymentAdjusted: hasRefundablePayment,
  };
}
