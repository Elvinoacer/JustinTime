import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNegotiationNotification } from "@/lib/utils/notifications";
import { sendNegotiationResponseEmail } from "@/lib/email";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const negotiation = await prisma.bookingNegotiation.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            service: { select: { title: true, price: true } },
            client: { select: { name: true, email: true } },
            provider: { select: { name: true, email: true } },
          },
        },
        initiator: { select: { name: true, email: true } },
        receiver: { select: { name: true, email: true } },
        parent: true,
        counterOffers: {
          include: {
            initiator: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!negotiation) {
      return new NextResponse("Negotiation not found", { status: 404 });
    }

    // Check permission
    if (
      negotiation.initiatorId !== session.user.id &&
      negotiation.receiverId !== session.user.id
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.json(negotiation);
  } catch (error) {
    console.error("[NEGOTIATION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Respond to negotiation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { action, counterPrice, counterLocation, message } = body;

    if (!action || !["accept", "reject", "counter"].includes(action)) {
      return new NextResponse("Invalid action", { status: 400 });
    }

    const { id } = await params;

    // Get negotiation
    const negotiation = await prisma.bookingNegotiation.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            service: { select: { title: true, price: true } },
            client: { select: { name: true, email: true } },
            provider: { select: { name: true, email: true } },
          },
        },
        initiator: { select: { name: true, email: true } },
        receiver: { select: { name: true, email: true } },
      },
    });

    if (!negotiation) {
      return new NextResponse("Negotiation not found", { status: 404 });
    }

    // Only receiver can respond
    if (negotiation.receiverId !== session.user.id) {
      return new NextResponse("Forbidden - Only receiver can respond", {
        status: 403,
      });
    }

    const responderName =
      negotiation.booking.clientId === session.user.id
        ? negotiation.booking.client.name
        : negotiation.booking.provider.name;
    const otherPartyEmail =
      negotiation.initiatorId === negotiation.booking.clientId
        ? negotiation.booking.client.email
        : negotiation.booking.provider.email;
    const otherPartyName =
      negotiation.initiatorId === negotiation.booking.clientId
        ? negotiation.booking.client.name
        : negotiation.booking.provider.name;

    if (action === "accept") {
      // Update negotiation status
      await prisma.bookingNegotiation.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });

      // Update booking with agreed terms
      await prisma.booking.update({
        where: { id: negotiation.bookingId },
        data: {
          ...(negotiation.proposedPrice && {
            totalAmount: negotiation.proposedPrice,
          }),
          ...(negotiation.proposedLocation && {
            location: negotiation.proposedLocation,
          }),
        },
      });

      // Create notification
      await createNegotiationNotification(
        negotiation.id,
        negotiation.initiatorId,
        responderName!,
        "ACCEPTED",
        negotiation.booking.service!.title
      );

     // Send email
      try {
        await sendNegotiationResponseEmail(
          otherPartyEmail!,
          otherPartyName!,
          responderName!,
          negotiation.booking.service!.title,
          "ACCEPTED"
        );
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      return NextResponse.json({ status: "accepted" });
    } else if (action === "reject") {
      // Update negotiation status
      await prisma.bookingNegotiation.update({
        where: { id },
        data: { status: "REJECTED" },
      });

      // Create notification
      await createNegotiationNotification(
        negotiation.id,
        negotiation.initiatorId,
        responderName!,
        "REJECTED",
        negotiation.booking.service!.title
      );

      // Send email
      try {
        await sendNegotiationResponseEmail(
          otherPartyEmail!,
          otherPartyName!,
          responderName!,
          negotiation.booking.service!.title,
          "REJECTED"
        );
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      return NextResponse.json({ status: "rejected" });
    } else if (action === "counter") {
      // Update original negotiation
      await prisma.bookingNegotiation.update({
        where: { id },
        data: { status: "COUNTERED" },
      });

      // Create counter offer
      const counterOffer = await prisma.bookingNegotiation.create({
        data: {
          bookingId: negotiation.bookingId,
          initiatorId: session.user.id,
          receiverId: negotiation.initiatorId,
          proposedPrice: counterPrice ? parseFloat(counterPrice) : null,
          proposedLocation: counterLocation,
          message,
          status: "PENDING",
          parentId: id,
        },
      });

      // Create notification
      await createNegotiationNotification(
        counterOffer.id,
        negotiation.initiatorId,
        responderName!,
        "COUNTERED",
        negotiation.booking.service!.title,
        counterPrice ? parseFloat(counterPrice) : undefined,
        counterLocation
      );

      // Send email
      try {
        await sendNegotiationResponseEmail(
          otherPartyEmail!,
          otherPartyName!,
          responderName!,
          negotiation.booking.service!.title,
          "COUNTERED",
          counterPrice ? parseFloat(counterPrice) : undefined,
          counterLocation,
          message
        );
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      return NextResponse.json(counterOffer, { status: 201 });
    }
  } catch (error) {
    console.error("[NEGOTIATION_RESPOND]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
