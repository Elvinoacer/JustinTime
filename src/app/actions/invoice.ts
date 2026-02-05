"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { createETIMSInvoice, retryETIMSSubmission } from "@/lib/etims/etims-service";
import { calculateBookingTax, TaxBreakdown, formatTaxAmount } from "@/lib/etims/tax-calculator";
import { revalidatePath } from "next/cache";

/**
 * Create invoice for a completed booking
 */
export async function createInvoiceForBooking(bookingId: string) {
  try {
    const result = await createETIMSInvoice(bookingId);
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath('/dashboard/invoices');
    return result.invoice;
  } catch (error) {
    console.error("[createInvoiceForBooking]", error);
    throw error;
  }
}

/**
 * Get invoice for a booking
 */
export async function getInvoice(bookingId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { bookingId },
    include: {
      submissions: {
        orderBy: { submittedAt: 'desc' },
        take: 5
      }
    }
  });
  return invoice;
}

/**
 * Get user's invoice history
 */
export async function getInvoiceHistory(page: number = 1, limit: number = 20) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        booking: {
          OR: [
            { providerId: session.user.id },
            { clientId: session.user.id }
          ]
        }
      },
      include: {
        booking: {
          include: {
            service: { select: { title: true } },
            client: { select: { name: true } },
            provider: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.invoice.count({
      where: {
        booking: {
          OR: [
            { providerId: session.user.id },
            { clientId: session.user.id }
          ]
        }
      }
    })
  ]);

  return {
    success: true,
    invoices,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page
  };
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const stats = await prisma.invoice.aggregate({
    where: {
      booking: {
        OR: [
          { providerId: session.user.id },
          { clientId: session.user.id }
        ]
      }
    },
    _count: true,
    _sum: {
      totalAmount: true,
      vatAmount: true,
      exciseDuty: true
    }
  });

  const statusCounts = await prisma.invoice.groupBy({
    by: ['status'],
    where: {
      booking: {
        OR: [
          { providerId: session.user.id },
          { clientId: session.user.id }
        ]
      }
    },
    _count: true
  });

  return {
    success: true,
    totalInvoices: stats._count,
    totalAmount: Number(stats._sum.totalAmount || 0),
    totalVAT: Number(stats._sum.vatAmount || 0),
    totalExcise: Number(stats._sum.exciseDuty || 0),
    byStatus: Object.fromEntries(
      statusCounts.map(s => [s.status, s._count])
    )
  };
}

/**
 * Retry failed eTIMS submission
 */
export async function retryInvoiceSubmission(invoiceId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const success = await retryETIMSSubmission(invoiceId);
    revalidatePath('/dashboard/invoices');
    return { success };
  } catch (error) {
    console.error("[retryInvoiceSubmission]", error);
    return { success: false, error: "Retry failed" };
  }
}

/**
 * Calculate tax preview for an amount
 */
export async function calculateTaxPreview(amount: number, isVATRegistered: boolean = false) {
  const breakdown = calculateBookingTax(amount, isVATRegistered, false);
  return {
    ...breakdown,
    formatted: {
      subtotal: formatTaxAmount(breakdown.subtotal),
      vatAmount: formatTaxAmount(breakdown.vatAmount),
      exciseDuty: formatTaxAmount(breakdown.exciseDuty),
      totalAmount: formatTaxAmount(breakdown.totalAmount)
    }
  };
}
