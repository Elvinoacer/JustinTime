import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAvailability } from "@/lib/utils/availability";
import { createBookingNotifications } from "@/lib/utils/notifications";
import {
  sendBookingConfirmationEmail,
  sendProviderBookingNotificationEmail,
} from "@/lib/email";
import {
  sendComprehensiveNotification,
  emailTemplates,
} from "@/lib/notifications/adminNotifications";
import { calculateBookingBreakdown } from "@/lib/financials";
import { createInvoiceForBooking } from "@/app/actions/invoice";
import { validatePromoCode } from "@/lib/promo";
import { getDynamicPrice } from "@/lib/pricing-engine";
import { VALIDATION } from "@/lib/constants/validation";
import { Prisma } from "@/generated/prisma/client";
import { SERVICE_LOCATION_TYPES } from "@/lib/services/config";
import {
  BOOKING_LIFECYCLE_EVENT_TYPES,
  recordBookingLifecycleEvent,
} from "@/lib/bookings/lifecycleTimeline";

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
          invoice: {
            select: { id: true },
          },
          insuranceClaim: {
            select: {
              id: true,
              status: true,
              amount: true,
              approvedAmount: true,
              adminNotes: true,
              createdAt: true,
            },
          },
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
    let {
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
      promoCode,
    } = body;

    // Sanitize inputs
    location = location?.trim();
    notes = notes?.trim();
    clientPhone = clientPhone?.trim();
    clientAddress = clientAddress?.trim();
    promoCode = promoCode?.trim()?.toUpperCase();

    // Validate required fields
    if (!professionalId || !serviceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate lengths
    if (notes && notes.length > VALIDATION.MAX_NOTES_LENGTH) {
      return NextResponse.json(
        {
          error: `Notes cannot exceed ${VALIDATION.MAX_NOTES_LENGTH} characters`,
        },
        { status: 400 },
      );
    }
    if (location && location.length > VALIDATION.MAX_LOCATION_LENGTH) {
      return NextResponse.json(
        {
          error: `Location cannot exceed ${VALIDATION.MAX_LOCATION_LENGTH} characters`,
        },
        { status: 400 },
      );
    }
    if (clientPhone && clientPhone.length > VALIDATION.MAX_PHONE_LENGTH) {
      return NextResponse.json(
        {
          error: `Phone cannot exceed ${VALIDATION.MAX_PHONE_LENGTH} characters`,
        },
        { status: 400 },
      );
    }
    if (clientAddress && clientAddress.length > VALIDATION.MAX_ADDRESS_LENGTH) {
      return NextResponse.json(
        {
          error: `Address cannot exceed ${VALIDATION.MAX_ADDRESS_LENGTH} characters`,
        },
        { status: 400 },
      );
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
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (service.providerId !== professionalId) {
      return NextResponse.json(
        { error: "Service does not belong to this provider" },
        { status: 400 },
      );
    }

    if (professionalId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot book your own service" },
        { status: 400 },
      );
    }

    const hasValidDefaultDuration =
      typeof service.defaultDuration === "number" &&
      Number.isFinite(service.defaultDuration) &&
      service.defaultDuration >= 15;
    const hasValidLocationType =
      typeof service.locationType === "string" &&
      SERVICE_LOCATION_TYPES.includes(
        service.locationType as (typeof SERVICE_LOCATION_TYPES)[number],
      );

    if (!hasValidDefaultDuration || !hasValidLocationType) {
      return NextResponse.json(
        {
          error:
            "This service is missing required booking configuration. Please ask the provider to update the service settings.",
          code: "SERVICE_CONFIGURATION_INCOMPLETE",
          missingFields: [
            !hasValidDefaultDuration ? "defaultDuration" : null,
            !hasValidLocationType ? "locationType" : null,
          ].filter(Boolean),
        },
        { status: 422 },
      );
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
          .padStart(
            2,
            "0",
          )}:${(totalMinutes % 60).toString().padStart(2, "0")}`;
      }
      bookingSlots.push({
        date: new Date(date),
        startTime,
        endTime: finalEndTime,
      });
    } else {
      return NextResponse.json(
        { error: "Missing date/time or slots" },
        { status: 400 },
      );
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
          serviceId,
        );

        if (!availabilityCheck.available) {
          return NextResponse.json(
            {
              error: "Time slot not available",
              code: "BOOKING_SLOT_CONFLICT",
              reason: availabilityCheck.reason,
              slot: slot,
            },
            { status: 409 },
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

    // Calculate total amount and tax breakdown
    // If price is per session/hour, multiply by number of slots?
    // Assuming price is per slot for now based on previous logic
    // Calculate total amount and tax breakdown
    const baseAmount = Number(service.price) * bookingSlots.length;

    let discountAmount = 0;
    let validPromoCodeId = undefined;

    if (promoCode) {
      const promoValidation = await validatePromoCode(
        promoCode,
        session.user.id,
        baseAmount,
      );
      if (!promoValidation.isValid) {
        return NextResponse.json(
          { error: promoValidation.error || "Invalid promo code" },
          { status: 400 },
        );
      }
      discountAmount = promoValidation.discountAmount;
      validPromoCodeId = promoValidation.promoCodeId;
    }

    // Prepare slot references for pricing and booking
    const firstSlot = bookingSlots[0];
    const lastSlot = bookingSlots[bookingSlots.length - 1];

    // Calculate dynamic pricing (surge pricing)
    const pricingResult = await getDynamicPrice(serviceId, firstSlot.date);
    const basePrice = Number(service.price) * bookingSlots.length;
    const finalPrice = basePrice * pricingResult.multiplier;

    const { exciseDuty, trustFee, totalAmount, netAmount } =
      calculateBookingBreakdown(finalPrice, discountAmount);

    // Create booking and slots

    const booking = await prisma.$transaction(
      async (tx) => {
        for (const slot of bookingSlots) {
          const existingConflict = await tx.bookingSlot.findFirst({
            where: {
              date: slot.date,
              booking: {
                providerId: professionalId,
                status: {
                  in: [
                    "PENDING",
                    "CONFIRMED",
                    "IN_PROGRESS",
                    "AWAITING_CLIENT_CONFIRMATION",
                  ],
                },
              },
              startTime: { lt: slot.endTime },
              endTime: { gt: slot.startTime },
            },
            select: { id: true },
          });

          if (existingConflict) {
            throw new Error("BOOKING_SLOT_CONFLICT");
          }
        }

        const newBooking = await tx.booking.create({
          data: {
            clientId: session.user.id,
            providerId: professionalId,
            serviceId,
            date: firstSlot.date,
            startTime: firstSlot.startTime,
            endTime: lastSlot.endTime,
            totalAmount: totalAmount,
            exciseDutyAmount: exciseDuty,
            insuranceFee: trustFee,
            netAmount: netAmount,
            totalTaxAmount: exciseDuty,
            discountAmount: discountAmount > 0 ? discountAmount : undefined,
            promoCodeId: validPromoCodeId,
            location: bookingLocation,
            notes,
            clientPhone,
            clientAddress,
            basePrice: basePrice,
            surgeMultiplier: pricingResult.multiplier,
            finalPrice: finalPrice,
            surgeReason: pricingResult.reason,
            status: "PENDING",
            slots: {
              create: bookingSlots.map((slot) => ({
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

        if (validPromoCodeId) {
          await tx.promoCode.update({
            where: { id: validPromoCodeId },
            data: { usageCount: { increment: 1 } },
          });
        }

        return newBooking;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await recordBookingLifecycleEvent({
      bookingId: booking.id,
      eventType: BOOKING_LIFECYCLE_EVENT_TYPES.BOOKING_CREATED,
      actorUserId: session.user.id,
      actorName: booking.client.name || "Client",
      actorRole: "CLIENT",
      reason: "Booking request submitted.",
      metadata: {
        serviceId,
        providerId: professionalId,
        slotCount: bookingSlots.length,
        hasPromoCode: Boolean(validPromoCodeId),
      },
      idempotencyKey: `booking:${booking.id}:created`,
    });

    // Create notifications for both parties
    await createBookingNotifications(
      booking.id,
      session.user.id,
      professionalId,
      "CREATED",
      service.title,
    );

    // Send notifications and emails
    try {
      // Validate required fields before attempting to send emails
      const providerName = service.provider.name || "Professional";
      const providerEmail = service.provider.email;
      const clientName = booking.client.name || "Client";
      const clientEmail = booking.client.email;

      // Log warning if critical data is missing
      if (!service.provider.name) {
        console.warn(
          `[BOOKING ${booking.id}] Provider name is missing for user ${professionalId}`,
        );
      }
      if (!service.provider.email) {
        console.error(
          `[BOOKING ${booking.id}] Provider email is missing for user ${professionalId} - cannot send provider notification`,
        );
      }
      if (!booking.client.name) {
        console.warn(
          `[BOOKING ${booking.id}] Client name is missing for user ${session.user.id}`,
        );
      }
      if (!booking.client.email) {
        console.error(
          `[BOOKING ${booking.id}] Client email is missing for user ${session.user.id} - cannot send client confirmation`,
        );
      }

      // 1. Send comprehensive notification to provider (Push + Email + DB)
      if (providerEmail) {
        try {
          const bookingTemplate = emailTemplates.newBooking(
            providerName,
            clientName,
            service.title,
            firstSlot.date,
            firstSlot.startTime,
            firstSlot.endTime,
            bookingLocation,
            totalAmount,
            notes || "",
            booking.id,
          );

          await sendComprehensiveNotification({
            userId: professionalId,
            title: `New Booking: ${service.title}`,
            message: `${clientName} has booked your service for ${firstSlot.date.toLocaleDateString()}`,
            type: "BOOKING_CREATED",
            emailSubject: bookingTemplate.subject,
            emailHtml: bookingTemplate.html,
          });

          console.log(
            `[BOOKING ${booking.id}] Provider notification sent successfully to ${providerEmail}`,
          );
        } catch (providerNotifError) {
          console.error(
            `[BOOKING ${booking.id}] Failed to send provider notification:`,
            {
              error:
                providerNotifError instanceof Error
                  ? providerNotifError.message
                  : String(providerNotifError),
              providerId: professionalId,
              providerEmail,
              providerName,
            },
          );
        }
      }

      // 2. Send email confirmation to client
      if (clientEmail && providerEmail) {
        try {
          await sendBookingConfirmationEmail(
            clientEmail,
            clientName,
            providerName,
            providerEmail,
            service.title,
            firstSlot.date,
            firstSlot.startTime,
            firstSlot.endTime,
            bookingLocation,
            totalAmount,
            booking.id,
          );

          console.log(
            `[BOOKING ${booking.id}] Client confirmation sent successfully to ${clientEmail}`,
          );
        } catch (clientEmailError) {
          console.error(
            `[BOOKING ${booking.id}] Failed to send client confirmation:`,
            {
              error:
                clientEmailError instanceof Error
                  ? clientEmailError.message
                  : String(clientEmailError),
              clientEmail,
              clientName,
              providerEmail,
              providerName,
            },
          );
        }
      }
    } catch (emailError) {
      console.error(
        `[BOOKING ${booking.id}] Unexpected error in notification block:`,
        emailError,
      );
      // Don't fail the booking if notifications fail
    }

    // Generate eTIMS Invoice
    try {
      await createInvoiceForBooking(booking.id);
    } catch (invoiceError) {
      console.error("Failed to auto-generate invoice:", invoiceError);
      // We don't fail the request, but we should log it.
      // In a real system, we'd have a retry queue.
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_SLOT_CONFLICT") {
      return NextResponse.json(
        {
          error: "One or more selected time slots are no longer available.",
          code: "BOOKING_SLOT_CONFLICT",
        },
        { status: 409 },
      );
    }

    console.error("[BOOKINGS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
