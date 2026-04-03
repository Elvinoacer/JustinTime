import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasAnyRole } from "@/lib/auth/roles";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function normalizeExceptionPayload(input: {
  date?: unknown;
  isAvailable?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  reason?: unknown;
}) {
  const date = input.date ? new Date(String(input.date)) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return { error: "Invalid date format" };
  }

  const isAvailable = Boolean(input.isAvailable);
  const startTime =
    input.startTime === undefined || input.startTime === null
      ? null
      : String(input.startTime);
  const endTime =
    input.endTime === undefined || input.endTime === null
      ? null
      : String(input.endTime);
  const reason =
    input.reason === undefined || input.reason === null
      ? null
      : String(input.reason).trim() || null;

  if (isAvailable) {
    if (!startTime || !endTime) {
      return {
        error: "Start and end time required for available exceptions",
      };
    }

    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
      return { error: "Invalid time format. Use HH:MM" };
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      return { error: "Start time must be before end time" };
    }
  }

  return {
    value: {
      date,
      isAvailable,
      startTime: isAvailable ? startTime : null,
      endTime: isAvailable ? endTime : null,
      reason,
    },
  };
}

// POST - Create availability exception
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Only providers can create exceptions
    if (!hasAnyRole(session.user, ["PROVIDER", "ADMIN"])) {
      return new NextResponse("Forbidden - Provider access required", {
        status: 403,
      });
    }

    const body = await request.json();
    const normalized = normalizeExceptionPayload(body);
    if (normalized.error || !normalized.value) {
      return new NextResponse(normalized.error || "Invalid exception payload", {
        status: 400,
      });
    }

    const { date, isAvailable, startTime, endTime, reason } = normalized.value;
    const { start: dayStart, end: dayEnd } = getDayRange(date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dayStart < today) {
      return new NextResponse("Cannot create exception for a past date", {
        status: 400,
      });
    }

    const duplicate = await prisma.availabilityException.findFirst({
      where: {
        providerId: session.user.id,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      return new NextResponse("An exception for this date already exists", {
        status: 400,
      });
    }

    if (isAvailable && startTime && endTime) {
      const weeklySlots = await prisma.availability.findMany({
        where: {
          providerId: session.user.id,
          dayOfWeek: date.getDay(),
          isActive: true,
        },
        select: { startTime: true, endTime: true },
      });

      const overlapsWeeklyWindow =
        weeklySlots.length === 0 ||
        weeklySlots.some(
          (slot) =>
            timeToMinutes(startTime) < timeToMinutes(slot.endTime) &&
            timeToMinutes(slot.startTime) < timeToMinutes(endTime),
        );

      if (!overlapsWeeklyWindow) {
        return new NextResponse(
          "Exception availability must overlap your weekly schedule",
          { status: 400 },
        );
      }
    }

    const exception = await prisma.availabilityException.create({
      data: {
        providerId: session.user.id,
        date,
        isAvailable,
        startTime,
        endTime,
        reason,
      },
    });

    return NextResponse.json(exception);
  } catch (error) {
    console.error("[AVAILABILITY_EXCEPTION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PATCH - Update availability exception
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasAnyRole(session.user, ["PROVIDER", "ADMIN"])) {
      return new NextResponse("Forbidden - Provider access required", {
        status: 403,
      });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new NextResponse("Exception ID required", { status: 400 });
    }

    const existing = await prisma.availabilityException.findUnique({
      where: { id },
    });

    if (!existing) {
      return new NextResponse("Exception not found", { status: 404 });
    }

    if (existing.providerId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const normalized = normalizeExceptionPayload({
      date: body.date ?? existing.date,
      isAvailable: body.isAvailable ?? existing.isAvailable,
      startTime: body.startTime ?? existing.startTime,
      endTime: body.endTime ?? existing.endTime,
      reason: body.reason ?? existing.reason,
    });

    if (normalized.error || !normalized.value) {
      return new NextResponse(normalized.error || "Invalid exception payload", {
        status: 400,
      });
    }

    const { date, isAvailable, startTime, endTime, reason } = normalized.value;
    const { start: dayStart, end: dayEnd } = getDayRange(date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dayStart < today) {
      return new NextResponse("Cannot create exception for a past date", {
        status: 400,
      });
    }

    const duplicate = await prisma.availabilityException.findFirst({
      where: {
        providerId: session.user.id,
        id: { not: id },
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      return new NextResponse("An exception for this date already exists", {
        status: 400,
      });
    }

    if (isAvailable && startTime && endTime) {
      const weeklySlots = await prisma.availability.findMany({
        where: {
          providerId: session.user.id,
          dayOfWeek: date.getDay(),
          isActive: true,
        },
        select: { startTime: true, endTime: true },
      });

      const overlapsWeeklyWindow =
        weeklySlots.length === 0 ||
        weeklySlots.some(
          (slot) =>
            timeToMinutes(startTime) < timeToMinutes(slot.endTime) &&
            timeToMinutes(slot.startTime) < timeToMinutes(endTime),
        );

      if (!overlapsWeeklyWindow) {
        return new NextResponse(
          "Exception availability must overlap your weekly schedule",
          { status: 400 },
        );
      }
    }

    const updated = await prisma.availabilityException.update({
      where: { id },
      data: {
        date,
        isAvailable,
        startTime,
        endTime,
        reason,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[AVAILABILITY_EXCEPTION_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Remove availability exception
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Exception ID required", { status: 400 });
    }

    // Check ownership
    const existing = await prisma.availabilityException.findUnique({
      where: { id },
    });

    if (!existing) {
      return new NextResponse("Exception not found", { status: 404 });
    }

    if (existing.providerId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.availabilityException.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AVAILABILITY_EXCEPTION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
