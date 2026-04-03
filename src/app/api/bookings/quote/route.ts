import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDynamicPrice } from "@/lib/pricing-engine";

type IncomingSlot = {
  date: string;
  startTime: string;
  endTime?: string;
};

function toBookingSlots(
  slots: IncomingSlot[] | undefined,
  fallbackDate: string | undefined,
  fallbackStartTime: string | undefined,
  fallbackEndTime: string | undefined,
  defaultDuration: number,
): { date: Date; startTime: string; endTime: string }[] {
  const calculateEndTime = (startTimeValue: string) => {
    const [hours, minutes] = startTimeValue.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return startTimeValue;
    }

    const minutesInDay = 24 * 60;
    const totalMinutes =
      (((hours * 60 + minutes + defaultDuration) % minutesInDay) +
        minutesInDay) %
      minutesInDay;

    return `${Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, "0")}:${(totalMinutes % 60).toString().padStart(2, "0")}`;
  };

  const normalized: { date: Date; startTime: string; endTime: string }[] = [];

  if (Array.isArray(slots) && slots.length > 0) {
    for (const slot of slots) {
      const slotDate = new Date(slot.date);
      if (Number.isNaN(slotDate.getTime()) || !slot.startTime) {
        continue;
      }

      normalized.push({
        date: slotDate,
        startTime: slot.startTime,
        endTime: slot.endTime || calculateEndTime(slot.startTime),
      });
    }
  } else if (fallbackDate && fallbackStartTime) {
    const slotDate = new Date(fallbackDate);
    if (!Number.isNaN(slotDate.getTime())) {
      let computedEndTime = fallbackEndTime;

      if (!computedEndTime) {
        computedEndTime = calculateEndTime(fallbackStartTime);
      }

      normalized.push({
        date: slotDate,
        startTime: fallbackStartTime,
        endTime: computedEndTime,
      });
    }
  }

  normalized.sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  return normalized;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { professionalId, serviceId, date, startTime, endTime, slots } = body;

    if (!professionalId || !serviceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        providerId: true,
        price: true,
        defaultDuration: true,
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

    const slotDuration =
      typeof service.defaultDuration === "number" && service.defaultDuration > 0
        ? service.defaultDuration
        : 60;

    const bookingSlots = toBookingSlots(
      slots,
      date,
      startTime,
      endTime,
      slotDuration,
    );

    if (bookingSlots.length === 0) {
      return NextResponse.json(
        { error: "Missing date/time or slots" },
        { status: 400 },
      );
    }

    const firstSlot = bookingSlots[0];
    const slotCount = bookingSlots.length;

    const pricingResult = await getDynamicPrice(serviceId, firstSlot.date);
    const basePrice = Number(service.price) * slotCount;
    const finalPrice = Number(
      (basePrice * pricingResult.multiplier).toFixed(2),
    );
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const quote = await prisma.pricingQuote.create({
      data: {
        userId: session.user.id,
        serviceId,
        slotDate: firstSlot.date,
        slotCount,
        basePrice,
        multiplier: pricingResult.multiplier,
        finalPrice,
        reason: pricingResult.reason,
        breakdown: pricingResult.breakdown,
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        quote: {
          id: quote.id,
          expiresAt: quote.expiresAt,
          slotCount: quote.slotCount,
          basePrice: Number(quote.basePrice),
          multiplier: quote.multiplier,
          finalPrice: Number(quote.finalPrice),
          reason: quote.reason,
          breakdown: quote.breakdown,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[BOOKING_QUOTE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
