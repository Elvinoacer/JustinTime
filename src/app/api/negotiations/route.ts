import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNegotiationNotification } from "@/lib/utils/notifications";
import { sendNegotiationRequestEmail } from "@/lib/email";

// POST - Create new negotiation
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { bookingId, proposedPrice, proposedLocation, message } = body;

    if (!bookingId) {
      return new NextResponse("Booking ID required", { status: 400 });
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        service: { select: { title: true, price: true } },
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    // Only client or provider can negotiate
    if (
      booking.clientId !== session.user.id &&
      booking.providerId !== session.user.id
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Determine receiver
    const isClient = booking.clientId === session.user.id;
    const receiverId = isClient ? booking.providerId : booking.clientId;
    const receiver = isClient ? booking.provider : booking.client;
    const initiatorName = isClient ? booking.client.name : booking.provider.name;

    // Create negotiation
    const negotiation = await prisma.bookingNegotiation.create({
      data: {
        bookingId,
        initiatorId: session.user.id,
        receiverId,
        proposedPrice: proposedPrice ? parseFloat(proposedPrice) : null,
        proposedLocation,
        message,
        status: "PENDING",
      },
    });

    // Create notification
    await createNegotiationNotification(
      negotiation.id,
      receiverId,
      initiatorName!,
      "REQUEST",
      booking.service!.title,
      proposedPrice ? parseFloat(proposedPrice) : undefined,
      proposedLocation
    );

    // Send email
    try {
      await sendNegotiationRequestEmail(
        receiver!.email!,
        receiver!.name!,
        initiatorName!,
        booking.service!.title,
        parseFloat(booking.service!.price.toString()),
        proposedPrice ? parseFloat(proposedPrice) : undefined,
        proposedLocation,
        message,
        negotiation.id
      );
    } catch (emailError) {
      console.error("Error sending negotiation email:", emailError);
    }

    return NextResponse.json(negotiation, { status: 201 });
  } catch (error) {
    console.error("[NEGOTIATIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// GET - List negotiations
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Get negotiations where user is either initiator or receiver
    const where: any = {
      OR: [{ initiatorId: session.user.id }, { receiverId: session.user.id }],
    };

    if (status) {
      where.status = status;
    }

    const negotiations = await prisma.bookingNegotiation.findMany({
      where,
      include: {
        booking: {
          include: {
            service: { select: { title: true, price: true } },
            client: { select: { name: true } },
            provider: { select: { name: true } },
          },
        },
        initiator: { select: { name: true } },
        receiver: { select: { name: true } },
        counterOffers: {
          include: {
            initiator: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(negotiations);
  } catch (error) {
    console.error("[NEGOTIATIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
