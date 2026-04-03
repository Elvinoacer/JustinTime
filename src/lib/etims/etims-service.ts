/**
 * Enhanced eTIMS Service for KRA Integration
 * Handles invoice submission, QR generation, and audit logging
 */

import prisma from "@/lib/prisma";
import {
  TaxBreakdown,
  calculateBookingTax,
  validateKRAPin,
} from "./tax-calculator";

export interface EtimsInvoiceData {
  cuNumber: string; // Control Unit Number
  qrUrl: string; // QR Code URL
  signature: string; // Digital signature
  submissionId?: string; // Audit log ID
}

export interface ETIMSRequest {
  invoiceNumber: string;
  sellerPin: string;
  buyerPin?: string;
  buyerName: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
    vatAmount: number;
  }[];
  taxBreakdown: TaxBreakdown;
  transactionDate: Date;
}

export interface ETIMSResponse {
  success: boolean;
  cuNumber?: string;
  signature?: string;
  qrData?: string;
  errorCode?: string;
  errorMessage?: string;
}

// Mock KRA Control Unit Serial
const MOCK_CU_SERIAL = "JITCUV001";
const PLATFORM_KRA_PIN = "P051234567Z"; // JustInTime Systems Ltd PIN

function getDeterministicSuffix(seed: string): string {
  const hash = Array.from(seed).reduce(
    (acc, char) => (acc * 31 + char.charCodeAt(0)) % 10000,
    0,
  );
  return hash.toString().padStart(4, "0");
}

function shouldMockSubmissionFail(): boolean {
  const mode = (process.env.ETIMS_MOCK_MODE || "success").toLowerCase();
  return mode === "fail";
}

/**
 * Submit invoice to eTIMS (Mock implementation)
 * In production, this would call the KRA eTIMS API
 */
export async function submitToETIMS(
  request: ETIMSRequest,
): Promise<ETIMSResponse> {
  // Simulate stable network delay in mock mode.
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Validate seller PIN format
  if (request.sellerPin && !validateKRAPin(request.sellerPin)) {
    return {
      success: false,
      errorCode: "INVALID_PIN",
      errorMessage: "Invalid KRA PIN format",
    };
  }

  if (shouldMockSubmissionFail()) {
    return {
      success: false,
      errorCode: "ETIMS_UNAVAILABLE",
      errorMessage: "KRA eTIMS service temporarily unavailable",
    };
  }

  // Generate Control Unit Number
  const transactionDate = new Date(request.transactionDate);
  const dateStr = transactionDate
    .toISOString()
    .replace(/[-:T.]/g, "")
    .substring(0, 14);
  const deterministicSuffix = getDeterministicSuffix(
    `${request.invoiceNumber}|${request.sellerPin}|${dateStr}`,
  );
  const cuNumber = `${MOCK_CU_SERIAL}-${dateStr}-${deterministicSuffix}`;

  // Generate digital signature
  const signatureData = `${request.invoiceNumber}|${request.sellerPin}|${request.taxBreakdown.totalAmount}|${transactionDate.toISOString()}`;
  const signature = `KRASIG-${Buffer.from(signatureData).toString("base64").substring(0, 32)}`;

  // Generate QR data
  const qrData = JSON.stringify({
    cu: MOCK_CU_SERIAL,
    no: cuNumber,
    dt: transactionDate.toISOString().split("T")[0],
    pin: request.sellerPin || PLATFORM_KRA_PIN,
    amt: request.taxBreakdown.totalAmount,
    vat: request.taxBreakdown.vatAmount,
    sig: signature.substring(0, 20),
  });

  return {
    success: true,
    cuNumber,
    signature,
    qrData,
  };
}

/**
 * Generate QR Code URL from eTIMS data
 */
export function generateQRCodeUrl(qrData: string): string {
  const encoded = encodeURIComponent(qrData);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
}

/**
 * Create full eTIMS invoice for a booking
 */
export async function createETIMSInvoice(
  bookingId: string,
  options?: {
    sellerPin?: string;
    buyerPin?: string;
    buyerName?: string;
  },
): Promise<{ invoice: any; etimsData: EtimsInvoiceData }> {
  // Fetch booking details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      provider: {
        include: {
          taxSettings: true,
        },
      },
      client: true,
      service: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  if (booking.status !== "COMPLETED") {
    throw new Error(
      `Cannot generate invoice for booking ${bookingId} because status is ${booking.status}. Booking must be COMPLETED.`,
    );
  }

  // Check for existing invoice
  const existingInvoice = await prisma.invoice.findUnique({
    where: { bookingId },
  });

  if (existingInvoice) {
    return {
      invoice: existingInvoice,
      etimsData: {
        cuNumber: existingInvoice.etimsCuNumber || "",
        qrUrl: existingInvoice.etimsQrUrl || "",
        signature: existingInvoice.etimsSignature || "",
      },
    };
  }

  // Calculate tax breakdown
  const baseAmount = Number(booking.finalPrice ?? booking.totalAmount);
  const isProviderVATRegistered =
    booking.provider.taxSettings?.vatRegistered || false;
  const taxBreakdown = calculateBookingTax(
    baseAmount,
    isProviderVATRegistered,
    false,
  );

  // Generate invoice number
  const count = await prisma.invoice.count();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, "0")}`;

  // Prepare eTIMS request
  const etimsRequest: ETIMSRequest = {
    invoiceNumber,
    sellerPin:
      options?.sellerPin ||
      booking.provider.taxSettings?.kraPin ||
      PLATFORM_KRA_PIN,
    buyerPin: options?.buyerPin,
    buyerName: options?.buyerName || booking.client.name || "Walk-in Customer",
    items: [
      {
        description: booking.service?.title || "Service",
        quantity: 1,
        unitPrice: taxBreakdown.subtotal,
        taxableAmount: taxBreakdown.subtotal,
        vatAmount: taxBreakdown.vatAmount,
      },
    ],
    taxBreakdown,
    transactionDate: booking.date,
  };

  let invoice;
  try {
    invoice = await prisma.invoice.create({
      data: {
        bookingId,
        number: invoiceNumber,
        subtotal: taxBreakdown.subtotal,
        vatAmount: taxBreakdown.vatAmount,
        exciseDuty: taxBreakdown.exciseDuty,
        withholdingTax: taxBreakdown.withholdingTax,
        totalAmount: taxBreakdown.totalAmount,
        status: "GENERATED",
        sellerPin: etimsRequest.sellerPin,
        buyerPin: options?.buyerPin,
        buyerName: etimsRequest.buyerName,
      },
    });
  } catch {
    const concurrentInvoice = await prisma.invoice.findUnique({
      where: { bookingId },
    });
    if (concurrentInvoice) {
      return {
        invoice: concurrentInvoice,
        etimsData: {
          cuNumber: concurrentInvoice.etimsCuNumber || "",
          qrUrl: concurrentInvoice.etimsQrUrl || "",
          signature: concurrentInvoice.etimsSignature || "",
        },
      };
    }
    throw new Error(`Unable to create invoice for booking ${bookingId}`);
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "SUBMITTED" },
  });

  let etimsResponse: ETIMSResponse;
  try {
    etimsResponse = await submitToETIMS(etimsRequest);
  } catch (error) {
    etimsResponse = {
      success: false,
      errorCode: "ETIMS_SUBMISSION_ERROR",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown eTIMS submission error",
    };
  }

  const submission = await prisma.eTIMSSubmission.create({
    data: {
      invoiceId: invoice.id,
      submissionType: "INITIAL",
      requestPayload: etimsRequest as any,
      responsePayload: etimsResponse as any,
      success: etimsResponse.success,
      errorMessage: etimsResponse.errorMessage,
    },
  });

  const qrUrl = etimsResponse.qrData
    ? generateQRCodeUrl(etimsResponse.qrData)
    : "";

  invoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      etimsCuNumber: etimsResponse.cuNumber || null,
      etimsQrUrl: qrUrl || null,
      etimsSignature: etimsResponse.signature || null,
      status: etimsResponse.success ? "CONFIRMED" : "FAILED",
    },
  });

  return {
    invoice,
    etimsData: {
      cuNumber: etimsResponse.cuNumber || "",
      qrUrl,
      signature: etimsResponse.signature || "",
      submissionId: submission.id,
    },
  };
}

/**
 * Retry failed eTIMS submission
 */
export async function retryETIMSSubmission(
  invoiceId: string,
): Promise<boolean> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      booking: {
        include: {
          service: true,
          provider: { include: { taxSettings: true } },
          client: true,
        },
      },
    },
  });

  if (!invoice || invoice.status !== "FAILED") {
    return false;
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "SUBMITTED" },
  });

  // Prepare retry request
  const taxBreakdown: TaxBreakdown = {
    subtotal: Number(invoice.subtotal),
    vatAmount: Number(invoice.vatAmount),
    exciseDuty: Number(invoice.exciseDuty),
    withholdingTax: Number(invoice.withholdingTax),
    totalAmount: Number(invoice.totalAmount),
    currency: "KES",
    ratesApplied: { vat: 0.16, excise: 0.025, withholding: 0.05 },
  };

  const request: ETIMSRequest = {
    invoiceNumber: invoice.number,
    sellerPin: invoice.sellerPin || PLATFORM_KRA_PIN,
    buyerPin: invoice.buyerPin || undefined,
    buyerName: invoice.buyerName || "Customer",
    items: [
      {
        description: invoice.booking.service?.title || "Service",
        quantity: 1,
        unitPrice: taxBreakdown.subtotal,
        taxableAmount: taxBreakdown.subtotal,
        vatAmount: taxBreakdown.vatAmount,
      },
    ],
    taxBreakdown,
    transactionDate: invoice.createdAt,
  };

  let response: ETIMSResponse;
  try {
    response = await submitToETIMS(request);
  } catch (error) {
    response = {
      success: false,
      errorCode: "ETIMS_SUBMISSION_ERROR",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown eTIMS submission error",
    };
  }

  // Log retry attempt
  await prisma.eTIMSSubmission.create({
    data: {
      invoiceId,
      submissionType: "RETRY",
      requestPayload: request as any,
      responsePayload: response as any,
      success: response.success,
      errorMessage: response.errorMessage,
    },
  });

  if (response.success) {
    const qrUrl = response.qrData ? generateQRCodeUrl(response.qrData) : "";

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "CONFIRMED",
        etimsCuNumber: response.cuNumber,
        etimsQrUrl: qrUrl,
        etimsSignature: response.signature,
      },
    });
  } else {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "FAILED" },
    });
  }

  return response.success;
}

// Re-export for backward compatibility
export { generateEtimsData } from "./legacy-etims";
