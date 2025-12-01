import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAvailability } from "@/lib/utils/availability";
import { createBookingNotifications } from "@/lib/utils/notifications";
import {
  sendBookingConfirmationEmail,
  sendProviderBookingNotificationEmail,
} from "@/lib/email";
import { sendComprehensiveNotification, emailTemplates } from "@/lib/notifications/adminNotifications";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    // Get bookings where user is the client
    const where: any = { clientId: session.user.id };
    if (searchParams.get("status")) where.status = searchParams.get("status");

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              category: { select: { name: true } },
            },
          },
          service: {
            select: {
              id: true,
              title: true,
              price: true,
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
          slots: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      items: bookings,
      total,
      page,
      pageSize,
      hasMore: skip + bookings.length < total,
    });
  } catch (error) {
    console.error("[BOOKINGS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Create new booking with availability validation
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const {
      professionalId,
      serviceId,
      date,
      startTime,
      endTime,
      slots, // Array of { date, startTime, endTime }
      location,
      notes,
      clientPhone,
      clientAddress,
    } = body;

    // Validate required fields
    if (!professionalId || !serviceId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get service details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!service) {
      return new NextResponse("Service not found", { status: 404 });
    }

    if (service.providerId !== professionalId) {
      return new NextResponse("Service does not belong to this provider", {
        status: 400,
      });
    }

    // Prepare slots
    let bookingSlots: { date: Date; startTime: string; endTime: string }[] = [];

    if (slots && Array.isArray(slots) && slots.length > 0) {
      bookingSlots = slots.map((slot: any) => ({
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
    } else if (date && startTime) {
      // Backward compatibility for single slot
      let finalEndTime = endTime;
      if (!finalEndTime) {
        const duration = service.defaultDuration || 60;
        const [hours, minutes] = startTime.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        finalEndTime = `${Math.floor(totalMinutes / 60)
          .toString()
          .padStart(2, "0")}:${(totalMinutes % 60).toString().padStart(2, "0")}`;
      }
      bookingSlots.push({
        date: new Date(date),
        startTime,
        endTime: finalEndTime,
      });
    } else {
      return new NextResponse("Missing date/time or slots", { status: 400 });
    }

    // Sort slots by date and time
    bookingSlots.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    // Check availability for all slots
    if (service.requiresAvailability) {
      for (const slot of bookingSlots) {
        const availabilityCheck = await checkAvailability(
          professionalId,
          slot.date,
          slot.startTime,
          slot.endTime,
          serviceId
        );

        if (!availabilityCheck.available) {
          return NextResponse.json(
            {
              error: "Time slot not available",
              reason: availabilityCheck.reason,
              slot: slot,
            },
            { status: 409 }
          );
        }
      }
    }

    // Determine location
    let bookingLocation = location;
    if (!bookingLocation) {
      if (service.locationType === "PROVIDER_LOCATION") {
        bookingLocation = service.location || "Provider's location";
      } else if (service.locationType === "CLIENT_LOCATION") {
        bookingLocation = "Client's location (to be confirmed)";
      } else {
        bookingLocation = "Location to be negotiated";
      }
    }

    // Calculate total amount
    // If price is per session/hour, multiply by number of slots?
    // Assuming price is per slot for now based on previous logic
    const totalAmount = Number(service.price) * bookingSlots.length;

    // Create booking and slots
    const firstSlot = bookingSlots[0];
    const lastSlot = bookingSlots[bookingSlots.length - 1];

    const booking = await prisma.booking.create({
      data: {
        clientId: session.user.id,
        providerId: professionalId,
        serviceId,
        date: firstSlot.date, // Primary date (start)
        startTime: firstSlot.startTime,
        endTime: lastSlot.endTime, // End time of last slot? Or just keep it as is?
        // Let's use first slot's start and last slot's end if on same day, or just first slot's info
        // Actually, for multi-day, date/startTime/endTime on Booking might be misleading.
        // But we need them for sorting/filtering. Let's use the first slot.
        totalAmount: totalAmount,
        location: bookingLocation,
        notes,
        clientPhone,
        clientAddress,
        status: "PENDING",
        slots: {
          create: bookingSlots.map(slot => ({
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        },
      },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
        slots: true,
      },
    });

    // Create notifications for both parties
    await createBookingNotifications(
      booking.id,
      session.user.id,
      professionalId,
      "CREATED",
      service.title
    );

    // Send notifications and emails
    try {
      // 1. Send comprehensive notification to provider (Push + Email + DB)
      const bookingTemplate = emailTemplates.newBooking(
        service.provider.name!,
        booking.client.name!,
        service.title,
        firstSlot.date,
        firstSlot.startTime,
        firstSlot.endTime,
        bookingLocation,
        totalAmount,
        notes || '',
        booking.id
      );

      await sendComprehensiveNotification({
        userId: professionalId,
        title: `New Booking: ${service.title}`,
        message: `${booking.client.name} has booked your service for ${firstSlot.date.toLocaleDateString()}`,
        type: 'BOOKING_CREATED',
        emailSubject: bookingTemplate.subject,
        emailHtml: bookingTemplate.html
      });

      // 2. Send email confirm ation to client
      await sendBookingConfirmationEmail(
        booking.client.email!,
        booking.client.name!,
        service.provider.name!,
        service.provider.email!,
        service.title,
        firstSlot.date,
        firstSlot.startTime,
        firstSlot.endTime,
        bookingLocation,
        totalAmount,
        booking.id
      );
    } catch (emailError) {
      console.error("Error sending booking notifications:", emailError);
      // Don't fail the booking if notifications fail
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("[BOOKINGS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
