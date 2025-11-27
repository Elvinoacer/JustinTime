import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createBookingNotifications } from "@/lib/utils/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

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
      console.error("[BOOKING_PATCH] Authorization failed - user is neither provider nor client");
      return new NextResponse(
        JSON.stringify({ 
          error: "Unauthorized", 
          message: "You do not have permission to update this booking" 
        }), 
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (isClient && !isProvider && status && status !== "CANCELLED") {
      console.error("[BOOKING_PATCH] Client trying to update to non-CANCELLED status:", status);
      return new NextResponse(
        JSON.stringify({ 
          error: "Forbidden", 
          message: "Clients can only cancel bookings" 
        }), 
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: status || undefined,
        notes: notes || undefined,
      },
    });

    // Send notifications if status changed
    if (status && status !== booking.status) {
      // Notify the OTHER party
      const recipientId = isProvider ? booking.clientId : booking.providerId;
      
      await createBookingNotifications(
        booking.id,
        session.user.id,
        recipientId,
        status, // Status is used as notification type/content hint
        booking.service?.title || "Service"
      );

      // Send email to client when provider updates status
      const recipientEmail = isProvider ? booking.client.email : booking.service?.provider?.email;
      const recipientName = isProvider ? booking.client.name : booking.service?.provider?.name;
      
      if (recipientEmail && recipientName) {
        // Send email notification when provider updates status
        if (isProvider) {
          try {
            const { sendBookingStatusUpdateEmail, sendReviewRequestEmail } = await import("@/lib/email");
            const providerName = session.user.name || "The provider";
            
            await sendBookingStatusUpdateEmail(
              recipientEmail,
              recipientName,
              providerName,
              booking.service?.title || "Service",
              status,
              booking.date,
              booking.id,
              booking.slots
            );
            console.log(`[BOOKING_PATCH] Email sent to ${recipientEmail}`);

            if (status === "COMPLETED") {
              await sendReviewRequestEmail(
                recipientEmail,
                recipientName,
                providerName,
                booking.service?.title || "Service",
                booking.id
              );
              console.log(`[BOOKING_PATCH] Review request email sent to ${recipientEmail}`);
            }
          } catch (emailError) {
            console.error("[BOOKING_PATCH] Error sending email:", emailError);
            // Don't fail the request if email fails
          }
        }
      }
    }

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("[BOOKING_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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
              }
            }
          }
        },
        client: {
          select: {
            name: true,
            email: true,
            image: true,
            phone: true,
          }
        },
        slots: true,
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    if (booking.providerId !== session.user.id && booking.clientId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("[BOOKING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Permanently delete a booking
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
      return new NextResponse("Unauthorized - You don't have permission to delete this booking", {
        status: 403,
      });
    }

    // Additional business rule: Only cancelled or completed bookings can be deleted
    if (!["CANCELLED", "COMPLETED"].includes(booking.status)) {
      return new NextResponse(
        "Cannot delete active booking. Please cancel it first.",
        { status: 400 }
      );
    }

    // Delete the booking and all related data (cascading delete handled by Prisma schema)
    await prisma.booking.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Booking deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
