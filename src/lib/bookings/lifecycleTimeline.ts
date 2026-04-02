import { Prisma } from "@/generated/prisma/client";

export const BOOKING_LIFECYCLE_EVENT_TYPES = {
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_STATUS_CHANGED: "BOOKING_STATUS_CHANGED",
  WORK_STARTED: "WORK_STARTED",
  PROVIDER_MARKED_COMPLETE: "PROVIDER_MARKED_COMPLETE",
  CLIENT_CONFIRMED_COMPLETE: "CLIENT_CONFIRMED_COMPLETE",
  PAYMENT_CREATED: "PAYMENT_CREATED",
  PAYMENT_STATUS_CHANGED: "PAYMENT_STATUS_CHANGED",
  DISPUTE_OPENED: "DISPUTE_OPENED",
} as const;

export type BookingLifecycleEventType =
  (typeof BOOKING_LIFECYCLE_EVENT_TYPES)[keyof typeof BOOKING_LIFECYCLE_EVENT_TYPES];

export type RecordBookingLifecycleEventInput = {
  bookingId: string;
  eventType: BookingLifecycleEventType;
  paymentId?: string | null;
  fromState?: string | null;
  toState?: string | null;
  reason?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  metadata?: Prisma.InputJsonValue;
  idempotencyKey?: string | null;
};

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function recordBookingLifecycleEvent(
  input: RecordBookingLifecycleEventInput,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? (await import("@/lib/prisma")).default;

  try {
    return await client.bookingLifecycleEvent.create({
      data: {
        bookingId: input.bookingId,
        eventType: input.eventType,
        paymentId: normalizeOptional(input.paymentId),
        fromState: normalizeOptional(input.fromState),
        toState: normalizeOptional(input.toState),
        reason: normalizeOptional(input.reason),
        actorUserId: normalizeOptional(input.actorUserId),
        actorName: normalizeOptional(input.actorName),
        actorRole: normalizeOptional(input.actorRole),
        idempotencyKey: normalizeOptional(input.idempotencyKey),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
    });
  } catch (error) {
    const isDuplicateIdempotencyKey =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      normalizeOptional(input.idempotencyKey);

    if (isDuplicateIdempotencyKey) {
      return null;
    }

    throw error;
  }
}
