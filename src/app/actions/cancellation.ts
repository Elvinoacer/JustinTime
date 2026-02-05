
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { calculateRefund } from "@/lib/cancellation";
import { revalidatePath } from "next/cache";

export async function getRefundPreview(bookingId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { service: true }
    });

    if (!booking) throw new Error("Booking not found");

    if (booking.status === "CANCELLED") {
        return { alreadyCancelled: true };
    }

    // Default policy is FLEXIBLE if not set (though we added default in schema, legacy data might need fallback)
    const policy = booking.service?.cancellationPolicy || "FLEXIBLE";
    
    
    // Fetch slots separately since we didn't include them above
    const slots = await prisma.bookingSlot.findMany({
        where: { bookingId: booking.id },
        orderBy: { date: 'asc' }
    });

    if (slots.length === 0) {
         // Fallback logic if needed, or throw
         // For 'simulate' purposes without slots, maybe use just now + 24h?
         // But let's assume valid booking has slots.
    }
    
    // Use the first slot's start time as the booking start time
    const firstSlot = slots[0];
    const bookingDate = new Date(firstSlot.date); // This usually has time 00:00:00
    const [hours, minutes] = firstSlot.startTime.split(':').map(Number);
    bookingDate.setHours(hours, minutes);

    const result = calculateRefund(Number(booking.totalAmount), bookingDate, policy);

    return {
        ...result,
        currency: "KES", // Or dynamic
        policyDescription: booking.service?.cancellationPolicy
    };
}

export async function cancelBooking(bookingId: string, reason: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { service: true }
    });

    if (!booking) throw new Error("Booking not found");
    // Verify ownership (Client or Provider)
    if (booking.clientId !== session.user.id && booking.providerId !== session.user.id) {
        throw new Error("Unauthorized");
    }

    // Get slots for time calculation
    const slots = await prisma.bookingSlot.findMany({
        where: { bookingId: booking.id },
        orderBy: { date: 'asc' }
    });
    
    const firstSlot = slots[0];
    let bookingDate = new Date();
    if(firstSlot) {
        bookingDate = new Date(firstSlot.date);
        const [hours, minutes] = firstSlot.startTime.split(':').map(Number);
        bookingDate.setHours(hours, minutes);
    }

    const policy = booking.service?.cancellationPolicy || "FLEXIBLE";
    const calculation = calculateRefund(Number(booking.totalAmount), bookingDate, policy);

    // Update Booking
    await prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelledBy: session.user.id,
            cancellationReason: reason,
            refundAmount: calculation.refundAmount,
            penaltyAmount: calculation.penaltyAmount
        }
    });

    // TODO: Trigger partial refund via Payment Gateway or Wallet logic
    
    revalidatePath("/client/bookings");
    revalidatePath(`/client/bookings/${bookingId}`);

    return { success: true, refundAmount: calculation.refundAmount };
}
