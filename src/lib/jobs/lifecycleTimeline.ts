import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

export const JOB_LIFECYCLE_EVENT_TYPES = {
  JOB_CREATED: "JOB_CREATED",
  JOB_UPDATED: "JOB_UPDATED",
  JOB_STATUS_CHANGED: "JOB_STATUS_CHANGED",
  PROPOSAL_SUBMITTED: "PROPOSAL_SUBMITTED",
  PROPOSAL_STATUS_CHANGED: "PROPOSAL_STATUS_CHANGED",
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_STATUS_CHANGED: "BOOKING_STATUS_CHANGED",
  PAYMENT_CREATED: "PAYMENT_CREATED",
  PAYMENT_STATUS_CHANGED: "PAYMENT_STATUS_CHANGED",
  REVIEW_SUBMITTED: "REVIEW_SUBMITTED",
  SLA_EXECUTION_STALLED: "SLA_EXECUTION_STALLED",
  SLA_COMPLETION_DELAYED: "SLA_COMPLETION_DELAYED",
} as const;

export type JobLifecycleEventType =
  (typeof JOB_LIFECYCLE_EVENT_TYPES)[keyof typeof JOB_LIFECYCLE_EVENT_TYPES];

export type RecordJobLifecycleEventInput = {
  jobId: string;
  eventType: JobLifecycleEventType;
  proposalId?: string | null;
  bookingId?: string | null;
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

export async function recordJobLifecycleEvent(
  input: RecordJobLifecycleEventInput,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;

  try {
    return await client.jobTimelineEvent.create({
      data: {
        jobId: input.jobId,
        eventType: input.eventType,
        proposalId: normalizeOptional(input.proposalId),
        bookingId: normalizeOptional(input.bookingId),
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
