import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Create availability exception
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Only providers can create exceptions
    if (session.user.role !== "PROVIDER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden - Provider access required", {
        status: 403,
      });
    }

    const body = await request.json();
    const { date, isAvailable, startTime, endTime, reason } = body;

    if (!date) {
      return new NextResponse("Date required", { status: 400 });
    }

    const exceptionDate = new Date(date);
    if (isNaN(exceptionDate.getTime())) {
      return new NextResponse("Invalid date format", { status: 400 });
    }

    // If available, validate times
    if (isAvailable && (!startTime || !endTime)) {
      return new NextResponse(
        "Start and end time required for available exceptions",
        { status: 400 }
      );
    }

    const exception = await prisma.availabilityException.create({
      data: {
        providerId: session.user.id,
        date: exceptionDate,
        isAvailable: isAvailable || false,
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
