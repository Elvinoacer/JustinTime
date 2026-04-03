import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasAnyRole, hasRole } from "@/lib/auth/roles";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

type AvailabilitySegment = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  serviceId: string | null;
  isActive: boolean;
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isOvernightRange(startTime: string, endTime: string): boolean {
  return timeToMinutes(startTime) > timeToMinutes(endTime);
}

function hasTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return aStart < bEnd && bStart < aEnd;
}

function conflictsByService(
  serviceA: string | null | undefined,
  serviceB: string | null | undefined,
): boolean {
  if (!serviceA || !serviceB) return true;
  return serviceA === serviceB;
}

function normalizeDayOfWeek(value: unknown): number | null {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 0 || day > 6) return null;
  return day;
}

function normalizeSlotInput(slot: {
  dayOfWeek: unknown;
  startTime: unknown;
  endTime: unknown;
  serviceId?: unknown;
  isActive?: unknown;
}): { segments?: AvailabilitySegment[]; error?: string } {
  const dayOfWeek = normalizeDayOfWeek(slot.dayOfWeek);
  const startTime = typeof slot.startTime === "string" ? slot.startTime : "";
  const endTime = typeof slot.endTime === "string" ? slot.endTime : "";
  const serviceId = typeof slot.serviceId === "string" ? slot.serviceId : null;
  const isActive = typeof slot.isActive === "boolean" ? slot.isActive : true;

  if (dayOfWeek === null || !startTime || !endTime) {
    return { error: "Invalid slot data" };
  }

  if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
    return { error: "Invalid time format. Use HH:MM" };
  }

  if (startTime === endTime) {
    return { error: "Start and end time cannot be the same" };
  }

  if (!isOvernightRange(startTime, endTime)) {
    return {
      segments: [
        {
          dayOfWeek,
          startTime,
          endTime,
          serviceId,
          isActive,
        },
      ],
    };
  }

  const nextDay = (dayOfWeek + 1) % 7;
  return {
    // Store overnight ranges as two same-provider segments spanning midnight.
    segments: [
      {
        dayOfWeek,
        startTime,
        endTime: "23:59",
        serviceId,
        isActive,
      },
      {
        dayOfWeek: nextDay,
        startTime: "00:00",
        endTime,
        serviceId,
        isActive,
      },
    ],
  };
}

async function validateSegmentConflicts(
  providerId: string,
  segments: AvailabilitySegment[],
  excludedId?: string,
) {
  const days = Array.from(
    new Set(segments.map((segment) => segment.dayOfWeek)),
  );

  const existing = await prisma.availability.findMany({
    where: {
      providerId,
      ...(excludedId ? { id: { not: excludedId } } : {}),
      dayOfWeek: { in: days },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  for (const segment of segments) {
    const conflictingExisting = existing.find(
      (slot) =>
        slot.dayOfWeek === segment.dayOfWeek &&
        conflictsByService(slot.serviceId, segment.serviceId) &&
        hasTimeOverlap(
          slot.startTime,
          slot.endTime,
          segment.startTime,
          segment.endTime,
        ),
    );

    if (conflictingExisting) {
      return {
        ok: false,
        message: `Slot overlaps with existing availability (${conflictingExisting.startTime}-${conflictingExisting.endTime}) on ${conflictingExisting.dayOfWeek}`,
      };
    }
  }

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const left = segments[i];
      const right = segments[j];
      if (
        left.dayOfWeek === right.dayOfWeek &&
        conflictsByService(left.serviceId, right.serviceId) &&
        hasTimeOverlap(
          left.startTime,
          left.endTime,
          right.startTime,
          right.endTime,
        )
      ) {
        return {
          ok: false,
          message: "Provided slots overlap with each other",
        };
      }
    }
  }

  return { ok: true as const };
}

// GET - Fetch provider's availability schedule
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId") || session.user.id;

    //Only allow users to view their own availability unless they're admin
    if (providerId !== session.user.id && !hasRole(session.user, "ADMIN")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const [weeklyAvailability, exceptions] = await Promise.all([
      prisma.availability.findMany({
        where: { providerId },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.availabilityException.findMany({
        where: {
          providerId,
          date: { gte: new Date() }, // Only future exceptions
        },
        orderBy: { date: "asc" },
      }),
    ]);

    return NextResponse.json({
      weeklyAvailability,
      exceptions,
    });
  } catch (error) {
    console.error("[AVAILABILITY_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Create availability slots
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Only providers can create availability
    if (!hasAnyRole(session.user, ["PROVIDER", "ADMIN"])) {
      return new NextResponse("Forbidden - Provider access required", {
        status: 403,
      });
    }

    const body = await request.json();
    const { slots } = body; // Array of {dayOfWeek, startTime, endTime, serviceId?}

    if (!Array.isArray(slots) || slots.length === 0) {
      return new NextResponse("Invalid slots data", { status: 400 });
    }

    const normalizedSegments: AvailabilitySegment[] = [];

    // Validate and normalize each slot
    for (const slot of slots) {
      const normalized = normalizeSlotInput(slot);
      if (normalized.error || !normalized.segments) {
        return new NextResponse(normalized.error || "Invalid slot data", {
          status: 400,
        });
      }

      normalizedSegments.push(...normalized.segments);
    }

    const conflictValidation = await validateSegmentConflicts(
      session.user.id,
      normalizedSegments,
    );

    if (!conflictValidation.ok) {
      return new NextResponse(conflictValidation.message, { status: 400 });
    }

    // Create availability slots
    const created = await prisma.$transaction(
      normalizedSegments.map((slot) =>
        prisma.availability.create({
          data: {
            providerId: session.user!.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            serviceId: slot.serviceId || null,
          },
        }),
      ),
    );

    return NextResponse.json({ success: true, created });
  } catch (error) {
    console.error("[AVAILABILITY_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PATCH - Update availability slots
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
    const { id, dayOfWeek, startTime, endTime, isActive, serviceId } = body;

    if (!id) {
      return new NextResponse("Availability ID required", { status: 400 });
    }

    // Check ownership
    const existing = await prisma.availability.findUnique({
      where: { id },
    });

    if (!existing) {
      return new NextResponse("Availability not found", { status: 404 });
    }

    if (existing.providerId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const proposedDayOfWeek =
      dayOfWeek !== undefined
        ? normalizeDayOfWeek(dayOfWeek)
        : existing.dayOfWeek;
    if (proposedDayOfWeek === null) {
      return new NextResponse("Invalid slot data", { status: 400 });
    }

    const proposedStartTime =
      startTime !== undefined ? String(startTime) : existing.startTime;
    const proposedEndTime =
      endTime !== undefined ? String(endTime) : existing.endTime;
    const proposedServiceId =
      serviceId !== undefined ? serviceId || null : existing.serviceId;
    const proposedIsActive =
      typeof isActive === "boolean" ? isActive : existing.isActive;

    const normalized = normalizeSlotInput({
      dayOfWeek: proposedDayOfWeek,
      startTime: proposedStartTime,
      endTime: proposedEndTime,
      serviceId: proposedServiceId,
      isActive: proposedIsActive,
    });

    if (normalized.error || !normalized.segments) {
      return new NextResponse(normalized.error || "Invalid slot data", {
        status: 400,
      });
    }

    const conflictValidation = await validateSegmentConflicts(
      session.user.id,
      normalized.segments,
      id,
    );

    if (!conflictValidation.ok) {
      return new NextResponse(conflictValidation.message, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const [firstSegment, secondSegment] = normalized.segments;

      const updatedPrimary = await tx.availability.update({
        where: { id },
        data: {
          dayOfWeek: firstSegment.dayOfWeek,
          startTime: firstSegment.startTime,
          endTime: firstSegment.endTime,
          serviceId: firstSegment.serviceId,
          isActive: firstSegment.isActive,
        },
      });

      if (secondSegment) {
        await tx.availability.create({
          data: {
            providerId: existing.providerId,
            dayOfWeek: secondSegment.dayOfWeek,
            startTime: secondSegment.startTime,
            endTime: secondSegment.endTime,
            serviceId: secondSegment.serviceId,
            isActive: secondSegment.isActive,
          },
        });
      }

      return updatedPrimary;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[AVAILABILITY_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Remove availability slot
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Availability ID required", { status: 400 });
    }

    // Check ownership
    const existing = await prisma.availability.findUnique({
      where: { id },
    });

    if (!existing) {
      return new NextResponse("Availability not found", { status: 404 });
    }

    if (existing.providerId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.availability.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AVAILABILITY_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
