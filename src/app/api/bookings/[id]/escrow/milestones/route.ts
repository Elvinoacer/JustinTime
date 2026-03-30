import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import {
  extractEscrowMilestones,
  upsertEscrowMilestones,
  type EscrowMilestoneState,
} from "@/lib/escrow/milestones";

const configureMilestonesSchema = z.object({
  milestones: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(80),
        amount: z.number().positive(),
      }),
    )
    .min(1),
});

const releaseMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
});

function withinMoneyTolerance(a: number, b: number) {
  return Math.abs(a - b) < 0.01;
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
      select: {
        id: true,
        clientId: true,
        providerId: true,
        totalAmount: true,
        status: true,
        notes: true,
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            transactionId: true,
          },
        },
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    const isParticipant =
      booking.clientId === session.user.id ||
      booking.providerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isParticipant && !isAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { escrow } = extractEscrowMilestones(booking.notes);

    return NextResponse.json({
      bookingId: booking.id,
      bookingStatus: booking.status,
      totalAmount: Number(booking.totalAmount),
      payment: booking.payment,
      escrow,
    });
  } catch (error) {
    console.error("[BOOKING_ESCROW_MILESTONES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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
    const validated = configureMilestonesSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        totalAmount: true,
        status: true,
        notes: true,
        payment: {
          select: { id: true, status: true },
        },
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isClient = booking.clientId === session.user.id;

    if (!isAdmin && !isClient) {
      return new NextResponse(
        "Only the client or admin can configure milestones",
        {
          status: 403,
        },
      );
    }

    if (["CANCELLED", "DISPUTED"].includes(booking.status)) {
      return new NextResponse(
        "Cannot configure milestones for this booking state",
        {
          status: 409,
        },
      );
    }

    const total = validated.milestones.reduce((sum, m) => sum + m.amount, 0);
    const bookingTotal = Number(booking.totalAmount);
    if (!withinMoneyTolerance(total, bookingTotal)) {
      return NextResponse.json(
        {
          error:
            "Milestone sum must equal booking total amount for escrow consistency",
          milestoneTotal: total,
          bookingTotal,
        },
        { status: 400 },
      );
    }

    const { plainNotes } = extractEscrowMilestones(booking.notes);
    const escrowState: EscrowMilestoneState = {
      version: 1,
      currency: "KES",
      totalAmount: bookingTotal,
      releasedAmount: 0,
      milestones: validated.milestones.map((milestone, index) => ({
        id: `m${index + 1}`,
        title: milestone.title,
        amount: milestone.amount,
        status: "HELD",
      })),
      updatedAt: new Date().toISOString(),
    };

    const notesWithEscrow = upsertEscrowMilestones(plainNotes, escrowState);

    const result = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { notes: notesWithEscrow },
      });

      if (!booking.payment) {
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: booking.totalAmount,
            method: "WALLET",
            status: "PENDING",
            transactionId: `escrow_hold_${booking.id}`,
          },
        });
      }

      return updatedBooking;
    });

    return NextResponse.json({
      bookingId: result.id,
      escrow: escrowState,
      message: "Milestone escrow configured",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error("[BOOKING_ESCROW_MILESTONES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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
    const validated = releaseMilestoneSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        totalAmount: true,
        status: true,
        notes: true,
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isClient = booking.clientId === session.user.id;

    if (!isAdmin && !isClient) {
      return new NextResponse(
        "Only the client or admin can release milestones",
        {
          status: 403,
        },
      );
    }

    if (["CANCELLED", "DISPUTED"].includes(booking.status)) {
      return new NextResponse(
        "Cannot release milestones for this booking state",
        {
          status: 409,
        },
      );
    }

    const { plainNotes, escrow } = extractEscrowMilestones(booking.notes);
    if (!escrow) {
      return new NextResponse("No escrow milestone plan configured", {
        status: 400,
      });
    }

    const target = escrow.milestones.find(
      (m) => m.id === validated.milestoneId,
    );
    if (!target) {
      return new NextResponse("Milestone not found", { status: 404 });
    }

    if (target.status === "RELEASED") {
      return new NextResponse("Milestone already released", { status: 409 });
    }

    target.status = "RELEASED";
    target.releasedAt = new Date().toISOString();
    escrow.releasedAmount = escrow.milestones
      .filter((m) => m.status === "RELEASED")
      .reduce((sum, m) => sum + m.amount, 0);
    escrow.updatedAt = new Date().toISOString();

    const notesWithEscrow = upsertEscrowMilestones(plainNotes, escrow);
    const isFullyReleased = withinMoneyTolerance(
      escrow.releasedAmount,
      escrow.totalAmount,
    );

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { notes: notesWithEscrow },
      });

      await tx.payment.upsert({
        where: { bookingId: booking.id },
        update: {
          status: isFullyReleased ? "COMPLETED" : "PENDING",
          transactionId: isFullyReleased
            ? `escrow_release_${booking.id}_all`
            : `escrow_partial_${booking.id}_${escrow.milestones.filter((m) => m.status === "RELEASED").length}`,
        },
        create: {
          bookingId: booking.id,
          amount: booking.totalAmount,
          method: "WALLET",
          status: isFullyReleased ? "COMPLETED" : "PENDING",
          transactionId: isFullyReleased
            ? `escrow_release_${booking.id}_all`
            : `escrow_partial_${booking.id}_1`,
        },
      });
    });

    return NextResponse.json({
      bookingId: booking.id,
      escrow,
      isFullyReleased,
      message: isFullyReleased
        ? "All milestones released and escrow settled"
        : "Milestone released",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error("[BOOKING_ESCROW_MILESTONES_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
