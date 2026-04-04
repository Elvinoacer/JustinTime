import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const monthStr = searchParams.get("month"); // YYYY-MM
    const serviceId = searchParams.get("serviceId");

    if (!providerId || !monthStr) {
      return NextResponse.json(
        { error: "Missing providerId or month" },
        { status: 400 },
      );
    }

    if (!MONTH_PATTERN.test(monthStr)) {
      return NextResponse.json(
        { error: "Invalid month format. Use YYYY-MM" },
        { status: 400 },
      );
    }

    const [year, month] = monthStr.split("-").map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);

    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    if (serviceId) {
      const service = await prisma.service.findFirst({
        where: {
          id: serviceId,
          providerId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!service) {
        return NextResponse.json(
          { error: "Invalid serviceId for provider" },
          { status: 400 },
        );
      }
    }

    // 1. Get Weekly Availability
    const weeklyAvailability = await prisma.availability.findMany({
      where: {
        providerId,
        isActive: true,
        ...(serviceId ? { OR: [{ serviceId }, { serviceId: null }] } : {}),
      },
    });

    // Map day of week to all matching slots (0 = Sunday)
    const weeklyMap = new Map<number, typeof weeklyAvailability>();
    weeklyAvailability.forEach((slot) => {
      const existing = weeklyMap.get(slot.dayOfWeek) || [];
      weeklyMap.set(slot.dayOfWeek, [...existing, slot]);
    });

    // 2. Get Date Exceptions for the month
    const exceptions = await prisma.availabilityException.findMany({
      where: {
        providerId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const exceptionMap = new Map();
    exceptions.forEach((ex) => {
      exceptionMap.set(format(ex.date, "yyyy-MM-dd"), ex);
    });

    // 3. Calculate disabled dates and reasons
    const disabledDates: string[] = [];
    const reasons: Record<string, string> = {};
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

    daysInMonth.forEach((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayOfWeek = date.getDay();
      const exception = exceptionMap.get(dateStr);
      const weeklySlots = weeklyMap.get(dayOfWeek) || [];

      // Check exception first
      if (exception) {
        if (!exception.isAvailable) {
          disabledDates.push(dateStr);
          reasons[dateStr] = exception.reason || "Unavailable";
        }
        // If exception says available, it overrides weekly schedule (unless we want to handle partial availability here)
      } else {
        // Check weekly schedule
        if (weeklySlots.length === 0) {
          disabledDates.push(dateStr);
          // reasons[dateStr] = "Not scheduled"; // Optional: don't clutter UI with "Not scheduled"
        }
      }
    });

    const weeklyScheduleByDay = Object.fromEntries(
      Array.from(weeklyMap.entries()).map(([day, slots]) => [
        day,
        slots.map((slot) => ({
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          serviceId: slot.serviceId,
        })),
      ]),
    );

    return NextResponse.json({
      disabledDates,
      reasons,
      weeklySchedule: weeklyAvailability,
      weeklyScheduleByDay,
    });
  } catch (error) {
    console.error("[AVAILABILITY_MONTH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
