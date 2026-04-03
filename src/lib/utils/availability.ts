import prisma from "@/lib/prisma";

const ACTIVE_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "AWAITING_CLIENT_CONFIRMATION",
] as const;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function hasOverlap(
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

function isWithinWindow(
  startTime: string,
  endTime: string,
  windowStart: string,
  windowEnd: string,
): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const windowStartMinutes = timeToMinutes(windowStart);
  const windowEndMinutes = timeToMinutes(windowEnd);

  return start >= windowStartMinutes && end <= windowEndMinutes;
}

function getDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Check if a provider is available at a specific date and time
 */
export async function checkAvailability(
  providerId: string,
  date: Date,
  startTime: string,
  endTime: string,
  serviceId?: string,
): Promise<{ available: boolean; reason?: string }> {
  try {
    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = date.getDay();

    const { start: dayStart, end: dayEnd } = getDayRange(date);

    // Check all matching provider availability slots for this day.
    const weeklyAvailabilities = await prisma.availability.findMany({
      where: {
        providerId,
        dayOfWeek,
        isActive: true,
        ...(serviceId ? { OR: [{ serviceId }, { serviceId: null }] } : {}),
      },
      orderBy: { startTime: "asc" },
    });

    if (weeklyAvailabilities.length === 0) {
      return { available: false, reason: "Provider not available on this day" };
    }

    // Requested window must fit within at least one active slot.
    const matchesAnySlot = weeklyAvailabilities.some((slot) =>
      isWithinWindow(startTime, endTime, slot.startTime, slot.endTime),
    );

    if (!matchesAnySlot) {
      const formattedWindows = weeklyAvailabilities
        .map((slot) => `${slot.startTime}-${slot.endTime}`)
        .join(", ");

      return {
        available: false,
        reason: `Provider is available during: ${formattedWindows}`,
      };
    }

    // Check for date-specific exceptions
    const dateException = await prisma.availabilityException.findFirst({
      where: {
        providerId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (dateException) {
      if (!dateException.isAvailable) {
        return {
          available: false,
          reason: dateException.reason || "Provider not available on this date",
        };
      }

      // If there's a special availability, check custom times
      if (dateException.startTime && dateException.endTime) {
        if (
          !isWithinWindow(
            startTime,
            endTime,
            dateException.startTime,
            dateException.endTime,
          )
        ) {
          return {
            available: false,
            reason: `Provider available only between ${dateException.startTime} and ${dateException.endTime} on this date`,
          };
        }
      }
    }

    // Check for booking conflicts
    const hasConflict = await hasBookingConflict(
      providerId,
      date,
      startTime,
      endTime,
    );
    if (hasConflict) {
      return { available: false, reason: "Time slot already booked" };
    }

    return { available: true };
  } catch (error) {
    console.error("[CHECK_AVAILABILITY]", error);
    throw error;
  }
}

/**
 * Check if there's a booking conflict at the requested time
 */
export async function hasBookingConflict(
  providerId: string,
  date: Date,
  startTime: string,
  endTime: string,
): Promise<boolean> {
  const { start: dayStart, end: dayEnd } = getDayRange(date);

  // Check conflicts in BookingSlot table
  const conflictingSlots = await prisma.bookingSlot.findMany({
    where: {
      booking: {
        providerId,
        status: {
          in: [...ACTIVE_BOOKING_STATUSES],
        },
      },
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  for (const slot of conflictingSlots) {
    if (hasOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
      return true;
    }
  }

  // Also check legacy single-slot bookings (for backward compatibility)
  const legacyBookings = await prisma.booking.findMany({
    where: {
      providerId,
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        in: [...ACTIVE_BOOKING_STATUSES],
      },
      // Only check bookings that don't have slots (if we want to be strict, but checking all is safer)
    },
  });

  for (const booking of legacyBookings) {
    if (!booking.startTime || !booking.endTime) continue;

    if (hasOverlap(startTime, endTime, booking.startTime, booking.endTime)) {
      return true;
    }
  }

  return false;
}

/**
 * Get available time slots for a provider on a specific date
 */
export async function getAvailableSlots(
  providerId: string,
  date: Date,
  serviceDuration: number = 60, // in minutes
  serviceId?: string,
): Promise<string[]> {
  try {
    const dayOfWeek = date.getDay();
    const { start: dayStart, end: dayEnd } = getDayRange(date);

    // Get all provider availability slots for this day
    const weeklyAvailabilities = await prisma.availability.findMany({
      where: {
        providerId,
        dayOfWeek,
        isActive: true,
        ...(serviceId ? { OR: [{ serviceId }, { serviceId: null }] } : {}),
      },
      orderBy: { startTime: "asc" },
    });

    if (weeklyAvailabilities.length === 0) {
      return [];
    }

    // Check for date exceptions
    const dateException = await prisma.availabilityException.findFirst({
      where: {
        providerId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let availabilityWindows = weeklyAvailabilities.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));

    if (dateException) {
      if (!dateException.isAvailable) {
        return [];
      }

      if (dateException.startTime && dateException.endTime) {
        availabilityWindows = [
          {
            startTime: dateException.startTime,
            endTime: dateException.endTime,
          },
        ];
      }
    }

    // Get existing bookings (legacy)
    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: {
          in: [...ACTIVE_BOOKING_STATUSES],
        },
      },
    });

    // Get existing booking slots
    const existingSlots = await prisma.bookingSlot.findMany({
      where: {
        booking: {
          providerId,
          status: {
            in: [...ACTIVE_BOOKING_STATUSES],
          },
        },
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    const blockedRanges: Array<{ start: string; end: string }> = [
      ...existingSlots.map((slot) => ({
        start: slot.startTime,
        end: slot.endTime,
      })),
      ...existingBookings
        .filter((booking) => booking.startTime && booking.endTime)
        .map((booking) => ({
          start: booking.startTime as string,
          end: booking.endTime as string,
        })),
    ];

    // Generate time slots
    const slots: string[] = [];
    for (const window of availabilityWindows) {
      const windowStartMinutes = timeToMinutes(window.startTime);
      const windowEndMinutes = timeToMinutes(window.endTime);

      let currentMinutes = windowStartMinutes;

      while (currentMinutes + serviceDuration <= windowEndMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        const timeSlot = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;

        const slotEndMinutes = currentMinutes + serviceDuration;
        const endHours = Math.floor(slotEndMinutes / 60);
        const endMinutes = slotEndMinutes % 60;
        const endTimeSlot = `${endHours.toString().padStart(2, "0")}:${endMinutes
          .toString()
          .padStart(2, "0")}`;

        const conflicts = blockedRanges.some((range) =>
          hasOverlap(timeSlot, endTimeSlot, range.start, range.end),
        );

        if (!conflicts) {
          slots.push(timeSlot);
        }

        currentMinutes += 15;
      }
    }

    return Array.from(new Set(slots)).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error("[GET_AVAILABLE_SLOTS]", error);
    return [];
  }
}

/**
 * Check if time is within provider's weekly schedule
 */
export async function isWithinSchedule(
  providerId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  serviceId?: string,
): Promise<boolean> {
  const availabilities = await prisma.availability.findMany({
    where: {
      providerId,
      dayOfWeek,
      isActive: true,
      ...(serviceId ? { OR: [{ serviceId }, { serviceId: null }] } : {}),
    },
  });

  if (availabilities.length === 0) return false;

  return availabilities.some((availability) =>
    isWithinWindow(
      startTime,
      endTime,
      availability.startTime,
      availability.endTime,
    ),
  );
}

/**
 * Get next available slot for a provider
 */
export async function getNextAvailableSlot(
  providerId: string,
  fromDate: Date,
  serviceDuration: number = 60,
  serviceId?: string,
): Promise<{ date: Date; startTime: string; endTime: string } | null> {
  const maxDaysToCheck = 30;

  for (let i = 0; i < maxDaysToCheck; i++) {
    const checkDate = new Date(fromDate);
    checkDate.setDate(fromDate.getDate() + i);

    const slots = await getAvailableSlots(
      providerId,
      checkDate,
      serviceDuration,
      serviceId,
    );

    if (slots.length > 0) {
      const startTime = slots[0];
      const [hours, minutes] = startTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + serviceDuration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;

      return {
        date: checkDate,
        startTime,
        endTime,
      };
    }
  }

  return null;
}
