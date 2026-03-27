import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * Check if a provider is available at a specific date and time
 */
export async function checkAvailability(
  providerId: string,
  date: Date,
  startTime: string,
  endTime: string,
  serviceId?: string
): Promise<{ available: boolean; reason?: string }> {
  try {
    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = date.getDay();

    // Check if provider has availability for this day of week
    const weeklyAvailability = await prisma.availability.findFirst({
      where: {
        providerId,
        dayOfWeek,
        isActive: true,
        ...(serviceId ? { OR: [{ serviceId }, { serviceId: null }] } : {}),
      },
    });

    if (!weeklyAvailability) {
      return { available: false, reason: "Provider not available on this day" };
    }

    // Check if requested time is within provider's schedule
    if (startTime < weeklyAvailability.startTime || endTime > weeklyAvailability.endTime) {
      return { 
        available: false, 
        reason: `Provider available only between ${weeklyAvailability.startTime} and ${weeklyAvailability.endTime}` 
      };
    }

    // Check for date-specific exceptions
    const dateException = await prisma.availabilityException.findFirst({
      where: {
        providerId,
        date: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
    });

    if (dateException) {
      if (!dateException.isAvailable) {
        return { 
          available: false, 
          reason: dateException.reason || "Provider not available on this date" 
        };
      }

      // If there's a special availability, check custom times
      if (dateException.startTime && dateException.endTime) {
        if (startTime < dateException.startTime || endTime > dateException.endTime) {
          return { 
            available: false, 
            reason: `Provider available only between ${dateException.startTime} and ${dateException.endTime} on this date` 
          };
        }
      }
    }

    // Check for booking conflicts
    const hasConflict = await hasBookingConflict(providerId, date, startTime, endTime);
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
  endTime: string
): Promise<boolean> {
  // Check conflicts in BookingSlot table
  const conflictingSlots = await prisma.bookingSlot.findMany({
    where: {
      booking: {
        providerId,
        status: {
          in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
        },
      },
      date: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    },
  });

  for (const slot of conflictingSlots) {
    const slotStart = slot.startTime;
    const slotEnd = slot.endTime;

    // Check if times overlap
    const hasOverlap = 
      (startTime >= slotStart && startTime < slotEnd) ||
      (endTime > slotStart && endTime <= slotEnd) ||
      (startTime <= slotStart && endTime >= slotEnd);

    if (hasOverlap) {
      return true;
    }
  }

  // Also check legacy single-slot bookings (for backward compatibility)
  const legacyBookings = await prisma.booking.findMany({
    where: {
      providerId,
      date: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      },
      status: {
        in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
      },
      // Only check bookings that don't have slots (if we want to be strict, but checking all is safer)
    },
  });

  for (const booking of legacyBookings) {
    if (!booking.startTime || !booking.endTime) continue;

    const bookingStart = booking.startTime;
    const bookingEnd = booking.endTime;

    const hasOverlap = 
      (startTime >= bookingStart && startTime < bookingEnd) ||
      (endTime > bookingStart && endTime <= bookingEnd) ||
      (startTime <= bookingStart && endTime >= bookingEnd);

    if (hasOverlap) {
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
  serviceId?: string
): Promise<string[]> {
  try {
    const dayOfWeek = date.getDay();

    // Get provider's availability for this day
    const weeklyAvailability = await prisma.availability.findFirst({
      where: {
        providerId,
        dayOfWeek,
        isActive: true,
        ...(serviceId ? { OR: [{ serviceId }, { serviceId: null }] } : {}),
      },
    });

    if (!weeklyAvailability) {
      return [];
    }

    let availableStart = weeklyAvailability.startTime;
    let availableEnd = weeklyAvailability.endTime;

    // Check for date exceptions
    const dateException = await prisma.availabilityException.findFirst({
      where: {
        providerId,
        date: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
    });

    if (dateException) {
      if (!dateException.isAvailable) {
        return [];
      }
      if (dateException.startTime && dateException.endTime) {
        availableStart = dateException.startTime;
        availableEnd = dateException.endTime;
      }
    }

    // Get existing bookings (legacy)
    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId,
        date: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
        status: {
          in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
        },
      },
    });

    // Get existing booking slots
    const existingSlots = await prisma.bookingSlot.findMany({
      where: {
        booking: {
          providerId,
          status: {
            in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
          },
        },
        date: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
    });

    // Generate time slots
    const slots: string[] = [];
    const [startHour, startMinute] = availableStart.split(":").map(Number);
    const [endHour, endMinute] = availableEnd.split(":").map(Number);

    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    while (currentMinutes + serviceDuration <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      const timeSlot = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      
      // Calculate end time for this slot
      const slotEndMinutes = currentMinutes + serviceDuration;
      const endHours = Math.floor(slotEndMinutes / 60);
      const endMins = slotEndMinutes % 60;
      const endTimeSlot = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;

      // Check if this slot conflicts with existing bookings or slots
      let hasConflict = false;

      // Check legacy bookings
      for (const booking of existingBookings) {
        if (!booking.startTime || !booking.endTime) continue;

        const [bookingStartH, bookingStartM] = booking.startTime.split(":").map(Number);
        const [bookingEndH, bookingEndM] = booking.endTime.split(":").map(Number);
        const bookingStartMinutes = bookingStartH * 60 + bookingStartM;
        const bookingEndMinutes = bookingEndH * 60 + bookingEndM;

        if (
          (currentMinutes >= bookingStartMinutes && currentMinutes < bookingEndMinutes) ||
          (slotEndMinutes > bookingStartMinutes && slotEndMinutes <= bookingEndMinutes) ||
          (currentMinutes <= bookingStartMinutes && slotEndMinutes >= bookingEndMinutes)
        ) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        // Check booking slots
        for (const slot of existingSlots) {
          const [slotStartH, slotStartM] = slot.startTime.split(":").map(Number);
          const [slotEndH, slotEndM] = slot.endTime.split(":").map(Number);
          const slotStartMinutes = slotStartH * 60 + slotStartM;
          const slotEndMinutesVal = slotEndH * 60 + slotEndM;

          if (
            (currentMinutes >= slotStartMinutes && currentMinutes < slotEndMinutesVal) ||
            (slotEndMinutes > slotStartMinutes && slotEndMinutes <= slotEndMinutesVal) ||
            (currentMinutes <= slotStartMinutes && slotEndMinutes >= slotEndMinutesVal)
          ) {
            hasConflict = true;
            break;
          }
        }
      }

      if (!hasConflict) {
        slots.push(timeSlot);
      }

      // Move to next slot (15-minute increments)
      currentMinutes += 15;
    }

    return slots;
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
  serviceId?: string
): Promise<boolean> {
  const availability = await prisma.availability.findFirst({
    where: {
      providerId,
      dayOfWeek,
      isActive: true,
      ...(serviceId ? { OR: [{ serviceId }, { serviceId: null }] } : {}),
    },
  });

  if (!availability) return false;

  return startTime >= availability.startTime && endTime <= availability.endTime;
}

/**
 * Get next available slot for a provider
 */
export async function getNextAvailableSlot(
  providerId: string,
  fromDate: Date,
  serviceDuration: number = 60,
  serviceId?: string
): Promise<{ date: Date; startTime: string; endTime: string } | null> {
  const maxDaysToCheck = 30;
  
  for (let i = 0; i < maxDaysToCheck; i++) {
    const checkDate = new Date(fromDate);
    checkDate.setDate(fromDate.getDate() + i);

    const slots = await getAvailableSlots(providerId, checkDate, serviceDuration, serviceId);
    
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
