import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    if (providerId !== session.user.id && session.user.role !== "ADMIN") {
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
    if (session.user.role !== "PROVIDER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden - Provider access required", { status: 403 });
    }

    const body = await request.json();
    const { slots } = body; // Array of {dayOfWeek, startTime, endTime, serviceId?}

    if (!Array.isArray(slots) || slots.length === 0) {
      return new NextResponse("Invalid slots data", { status: 400 });
    }

    // Validate each slot
    for (const slot of slots) {
      if (
        slot.dayOfWeek < 0 ||
        slot.dayOfWeek > 6 ||
        !slot.startTime ||
        !slot.endTime
      ) {
        return new NextResponse("Invalid slot data", { status: 400 });
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        return new NextResponse("Invalid time format. Use HH:MM", {
          status: 400,
        });
      }

      // Ensure startTime < endTime
      if (slot.startTime >= slot.endTime) {
        return new NextResponse("Start time must be before end time", {
          status: 400,
        });
      }
    }

    // Create availability slots
    const created = await prisma.$transaction(
      slots.map((slot) =>
        prisma.availability.create({
          data: {
            providerId: session.user!.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            serviceId: slot.serviceId || null,
          },
        })
      )
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

    const body = await request.json();
    const { id, dayOfWeek, startTime, endTime, isActive } = body;

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

    // Update
    const updated = await prisma.availability.update({
      where: { id },
      data: {
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(isActive !== undefined && { isActive }),
      },
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
