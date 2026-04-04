import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { checkAvailability, getAvailableSlots } from "@/lib/utils/availability";

// POST - Check if a specific slot is available
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { providerId, date, startTime, endTime, serviceId } = body;

    if (!providerId || !date || !startTime || !endTime) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return new NextResponse("Invalid date format", { status: 400 });
    }

    // Check availability
    const result = await checkAvailability(
      providerId,
      bookingDate,
      startTime,
      endTime,
      serviceId,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CHECK_AVAILABILITY]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// GET - Get available slots for a date range
export async function GET(request: Request) {
  try {
    // Public read endpoint used by booking flow to render slot options.

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const date = searchParams.get("date");
    const duration = parseInt(searchParams.get("duration") || "60");
    const serviceId = searchParams.get("serviceId") || undefined;

    if (!providerId || !date) {
      return new NextResponse("Provider ID and date required", {
        status: 400,
      });
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return new NextResponse("Invalid date format", { status: 400 });
    }

    const slots = await getAvailableSlots(
      providerId,
      bookingDate,
      duration,
      serviceId,
    );

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("[GET_AVAILABLE_SLOTS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
