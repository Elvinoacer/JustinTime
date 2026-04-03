"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// --- Report User ---
export async function reportUser(data: {
  reportedId: string;
  reason:
    | "HARASSMENT"
    | "SCAM"
    | "INAPPROPRIATE_CONTENT"
    | "SAFETY_CONCERN"
    | "SPAM"
    | "OTHER";
  details?: string;
  messageId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Prevent self-reporting
  if (data.reportedId === session.user.id) {
    return { success: false, error: "Cannot report yourself" };
  }

  try {
    // Check for duplicate active report
    const existingReport = await prisma.messageReport.findFirst({
      where: {
        reporterId: session.user.id,
        reportedId: data.reportedId,
        status: "PENDING",
      },
    });

    if (existingReport) {
      return {
        success: false,
        error: "You already have a pending report for this user",
      };
    }

    const report = await prisma.messageReport.create({
      data: {
        reporterId: session.user.id,
        reportedId: data.reportedId,
        reason: data.reason,
        details: data.details,
        messageId: data.messageId,
      },
    });

    return { success: true, reportId: report.id };
  } catch (error) {
    console.error("Failed to create report:", error);
    return { success: false, error: "Failed to submit report" };
  }
}

// --- Block User ---
export async function blockUser(blockedId: string, reason?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (blockedId === session.user.id) {
    return { success: false, error: "Cannot block yourself" };
  }

  try {
    await prisma.blockedUser.upsert({
      where: {
        userId_blockedId: {
          userId: session.user.id,
          blockedId: blockedId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        blockedId: blockedId,
        reason: reason,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to block user:", error);
    return { success: false, error: "Failed to block user" };
  }
}

// --- Unblock User ---
export async function unblockUser(blockedId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.blockedUser.delete({
      where: {
        userId_blockedId: {
          userId: session.user.id,
          blockedId: blockedId,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to unblock user:", error);
    return { success: false, error: "Failed to unblock user" };
  }
}

// --- Check if user is blocked ---
export async function isUserBlocked(targetId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  try {
    const blocked = await prisma.blockedUser.findUnique({
      where: {
        userId_blockedId: {
          userId: session.user.id,
          blockedId: targetId,
        },
      },
    });

    return !!blocked;
  } catch (error) {
    console.error("Failed to check block status:", error);
    return false;
  }
}

// --- Get blocked users list ---
export async function getBlockedUsers() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  try {
    const blockedUsers = await prisma.blockedUser.findMany({
      where: { userId: session.user.id },
      include: {
        blocked: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return blockedUsers;
  } catch (error) {
    console.error("Failed to get blocked users:", error);
    return [];
  }
}

type ProviderFinancialExportOptions = {
  dateFrom?: string;
  dateTo?: string;
  format?: "json" | "csv";
  providerId?: string;
};

export async function exportProviderFinancialReport(
  options: ProviderFinancialExportOptions = {},
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const requestedProviderId = options.providerId?.trim();
  const canExportForOtherProvider = session.user.role === "ADMIN";
  const providerId =
    requestedProviderId && canExportForOtherProvider
      ? requestedProviderId
      : session.user.id;

  if (session.user.role === "CLIENT" && providerId === session.user.id) {
    return {
      success: false,
      error: "Only providers and admins can export financial reports",
    };
  }

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (options.dateFrom) {
    createdAt.gte = new Date(options.dateFrom);
  }
  if (options.dateTo) {
    createdAt.lte = new Date(options.dateTo);
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      booking: {
        providerId,
      },
      ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      booking: {
        select: {
          id: true,
          status: true,
          date: true,
          client: {
            select: {
              name: true,
            },
          },
          service: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  const summary = invoices.reduce(
    (acc, invoice) => {
      acc.totalInvoices += 1;
      acc.totalAmount += Number(invoice.totalAmount);
      acc.totalVAT += Number(invoice.vatAmount);
      acc.totalExcise += Number(invoice.exciseDuty);
      acc.totalWithholding += Number(invoice.withholdingTax);
      if (invoice.status === "FAILED") {
        acc.failedInvoices += 1;
      }
      return acc;
    },
    {
      totalInvoices: 0,
      failedInvoices: 0,
      totalAmount: 0,
      totalVAT: 0,
      totalExcise: 0,
      totalWithholding: 0,
    },
  );

  const rows = invoices.map((invoice) => ({
    invoiceNumber: invoice.number,
    bookingId: invoice.bookingId,
    bookingDate: invoice.booking.date,
    issuedAt: invoice.createdAt,
    clientName: invoice.booking.client?.name || "Unknown Client",
    serviceTitle: invoice.booking.service?.title || "Service",
    bookingStatus: invoice.booking.status,
    invoiceStatus: invoice.status,
    subtotal: Number(invoice.subtotal),
    vatAmount: Number(invoice.vatAmount),
    exciseDuty: Number(invoice.exciseDuty),
    withholdingTax: Number(invoice.withholdingTax),
    totalAmount: Number(invoice.totalAmount),
  }));

  if (options.format === "csv") {
    const header = [
      "Invoice Number",
      "Booking ID",
      "Booking Date",
      "Issued At",
      "Client",
      "Service",
      "Booking Status",
      "Invoice Status",
      "Subtotal",
      "VAT",
      "Excise Duty",
      "Withholding Tax",
      "Total",
    ];

    const csvRows = rows.map((row) => [
      row.invoiceNumber,
      row.bookingId,
      new Date(row.bookingDate).toISOString(),
      new Date(row.issuedAt).toISOString(),
      row.clientName,
      row.serviceTitle,
      row.bookingStatus,
      row.invoiceStatus,
      row.subtotal.toFixed(2),
      row.vatAmount.toFixed(2),
      row.exciseDuty.toFixed(2),
      row.withholdingTax.toFixed(2),
      row.totalAmount.toFixed(2),
    ]);

    const csv = [header, ...csvRows]
      .map((line) =>
        line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    return {
      success: true,
      providerId,
      summary,
      csv,
      fileName: `provider-financial-report-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  return {
    success: true,
    providerId,
    summary,
    rows,
  };
}
