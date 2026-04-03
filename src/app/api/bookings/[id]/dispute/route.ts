import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { sendNotificationToUser } from "@/lib/notifications/dispatcher";
import {
  BOOKING_LIFECYCLE_EVENT_TYPES,
  recordBookingLifecycleEvent,
} from "@/lib/bookings/lifecycleTimeline";
import {
  JOB_LIFECYCLE_EVENT_TYPES,
  recordJobLifecycleEvent,
} from "@/lib/jobs/lifecycleTimeline";

const createDisputeSchema = z.object({
  reason: z.string().trim().min(20, "Reason must be at least 20 characters"),
  category: z.string().trim().max(64).optional(),
  requestedResolution: z.string().trim().max(500).optional(),
  evidenceUrls: z.array(z.string().url()).max(10).optional(),
});

const POST_COMPLETION_DISPUTE_WINDOW_DAYS = 14;

export async function POST(
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
    const validated = createDisputeSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        jobId: true,
        date: true,
        totalAmount: true,
        clientId: true,
        providerId: true,
        status: true,
        dispute: {
          select: { id: true },
        },
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    const isClient = booking.clientId === session.user.id;
    const isProvider = booking.providerId === session.user.id;

    if (!isClient && !isProvider) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (booking.dispute) {
      return NextResponse.json(
        {
          message: "Dispute already exists for this booking",
          disputeId: booking.dispute.id,
        },
        { status: 409 },
      );
    }

    const disputableStatuses = new Set([
      "CONFIRMED",
      "IN_PROGRESS",
      "AWAITING_CLIENT_CONFIRMATION",
      "COMPLETED",
      "CANCELLED",
      "DISPUTED",
    ]);

    if (!disputableStatuses.has(booking.status)) {
      return new NextResponse("This booking status cannot be disputed", {
        status: 400,
      });
    }

    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      const disputeWindowMs =
        POST_COMPLETION_DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      const bookingTimeMs = new Date(booking.date).getTime();

      if (Date.now() - bookingTimeMs > disputeWindowMs) {
        return new NextResponse(
          `Disputes for ${booking.status.toLowerCase()} bookings must be filed within ${POST_COMPLETION_DISPUTE_WINDOW_DAYS} days`,
          { status: 400 },
        );
      }
    }

    const defendantId = isClient ? booking.providerId : booking.clientId;

    const dispute = await prisma.$transaction(async (tx) => {
      const createdDispute = await tx.dispute.create({
        data: {
          bookingId: booking.id,
          creatorId: session.user.id,
          defendantId,
          reason: validated.reason,
          category: validated.category,
          requestedResolution: validated.requestedResolution,
          evidenceUrls: validated.evidenceUrls || [],
          refundPreview: {
            bookingTotalAmount: Number(booking.totalAmount || 0),
            previewGeneratedAt: new Date().toISOString(),
            source: "DISPUTE_SUBMISSION",
          },
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "DISPUTED" },
      });

      const actorRole = isClient ? "CLIENT" : "PROVIDER";
      const actorName =
        session.user.name?.trim() || (isClient ? "Client" : "Provider");

      await recordBookingLifecycleEvent(
        {
          bookingId: booking.id,
          eventType: BOOKING_LIFECYCLE_EVENT_TYPES.DISPUTE_OPENED,
          fromState: booking.status,
          toState: "DISPUTED",
          reason: validated.reason,
          actorUserId: session.user.id,
          actorName,
          actorRole,
          metadata: {
            disputeId: createdDispute.id,
            defendantId,
            category: validated.category,
            evidenceCount: validated.evidenceUrls?.length || 0,
          },
          idempotencyKey: `booking:${booking.id}:dispute:${createdDispute.id}`,
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
            toState: "DISPUTED",
            reason: validated.reason,
            actorUserId: session.user.id,
            actorName,
            actorRole,
            metadata: {
              disputeId: createdDispute.id,
              defendantId,
              category: validated.category,
              evidenceCount: validated.evidenceUrls?.length || 0,
            },
            idempotencyKey: `booking:${booking.id}:job-dispute:${createdDispute.id}`,
          },
          tx,
        );
      }

      return createdDispute;
    });

    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: "ADMIN" },
          {
            roles: {
              has: "ADMIN",
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (admins.length > 0) {
      const actorName =
        session.user.name?.trim() || (isClient ? "Client" : "Provider");
      const message = `${actorName} opened a dispute for booking ${booking.id}.`;

      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "New booking dispute opened",
          message,
          type: "DISPUTE_OPENED",
          isRead: false,
        })),
      });

      await Promise.all(
        admins.map(async (admin) => {
          try {
            await sendNotificationToUser(admin.id, {
              notification: {
                title: "New booking dispute opened",
                body: message,
              },
              data: {
                type: "DISPUTE_OPENED",
                disputeId: dispute.id,
                bookingId: booking.id,
                url: "/admin/disputes",
              },
            });
          } catch (notificationError) {
            console.error(
              "[BOOKING_DISPUTE_POST] Failed to push admin dispute notification",
              {
                adminId: admin.id,
                error: notificationError,
              },
            );
          }
        }),
      );
    }

    return NextResponse.json(dispute, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error("[BOOKING_DISPUTE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
