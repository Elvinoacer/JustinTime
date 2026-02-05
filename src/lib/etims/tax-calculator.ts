/**
 * Kenya Tax Calculator for eTIMS Compliance
 * Implements VAT, Excise Duty, and Withholding Tax calculations
 */

// Kenya Tax Rates (as of 2025/2026)
export const TAX_RATES = {
  VAT: 0.16,           // 16% Value Added Tax
  EXCISE_DUTY: 0.025,  // 2.5% Digital Service Excise Duty
  WITHHOLDING: 0.05,   // 5% Withholding Tax (for corporate payments)
  TURNOVER: 0.03       // 3% Turnover Tax (for small businesses under KES 25M)
};

// VAT Registration Threshold
export const VAT_THRESHOLD = 5_000_000; // KES 5 Million annual turnover

export interface TaxOptions {
  applyVAT?: boolean;        // Whether to apply VAT (provider must be VAT registered)
  applyExcise?: boolean;     // Apply digital service excise duty
  applyWithholding?: boolean; // Apply withholding tax (for corporate clients)
  isVATInclusive?: boolean;  // Whether base amount already includes VAT
}

export interface TaxBreakdown {
  subtotal: number;        // Base amount before tax
  vatAmount: number;       // 16% VAT
  exciseDuty: number;      // 2.5% Excise Duty
  withholdingTax: number;  // 5% Withholding Tax
  totalAmount: number;     // Final payable amount
  currency: string;
  ratesApplied: {
    vat: number;
    excise: number;
    withholding: number;
  };
}

/**
 * Calculate full tax breakdown for a service amount
 */
export function calculateTaxBreakdown(
  baseAmount: number,
  options: TaxOptions = {}
): TaxBreakdown {
  const {
    applyVAT = false,
    applyExcise = true,  // Digital services always subject to excise
    applyWithholding = false,
    isVATInclusive = false
  } = options;

  let subtotal = baseAmount;

  // If VAT inclusive, extract the base amount
  if (isVATInclusive && applyVAT) {
    subtotal = baseAmount / (1 + TAX_RATES.VAT);
  }

  // Calculate individual tax components
  const vatAmount = applyVAT ? roundToTwo(subtotal * TAX_RATES.VAT) : 0;
  const exciseDuty = applyExcise ? roundToTwo(subtotal * TAX_RATES.EXCISE_DUTY) : 0;
  const withholdingTax = applyWithholding ? roundToTwo(subtotal * TAX_RATES.WITHHOLDING) : 0;

  // Total = Subtotal + VAT + Excise - Withholding (withholding is deducted)
  // Note: Withholding is typically deducted from payment, but shown on invoice
  const totalAmount = roundToTwo(subtotal + vatAmount + exciseDuty);

  return {
    subtotal: roundToTwo(subtotal),
    vatAmount,
    exciseDuty,
    withholdingTax,
    totalAmount,
    currency: 'KES',
    ratesApplied: {
      vat: applyVAT ? TAX_RATES.VAT : 0,
      excise: applyExcise ? TAX_RATES.EXCISE_DUTY : 0,
      withholding: applyWithholding ? TAX_RATES.WITHHOLDING : 0
    }
  };
}

/**
 * Calculate tax for a completed booking
 */
export function calculateBookingTax(
  bookingAmount: number,
  providerIsVATRegistered: boolean = false,
  clientIsCorporate: boolean = false
): TaxBreakdown {
  return calculateTaxBreakdown(bookingAmount, {
    applyVAT: providerIsVATRegistered,
    applyExcise: true, // Always apply for digital platform services
    applyWithholding: clientIsCorporate
  });
}

/**
 * Format tax amount for display
 */
export function formatTaxAmount(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Generate tax summary text for invoices
 */
export function generateTaxSummary(breakdown: TaxBreakdown): string {
  const lines: string[] = [];
  
  lines.push(`Subtotal: ${formatTaxAmount(breakdown.subtotal)}`);
  
  if (breakdown.vatAmount > 0) {
    lines.push(`VAT (${(breakdown.ratesApplied.vat * 100).toFixed(0)}%): ${formatTaxAmount(breakdown.vatAmount)}`);
  }
  
  if (breakdown.exciseDuty > 0) {
    lines.push(`Excise Duty (${(breakdown.ratesApplied.excise * 100).toFixed(1)}%): ${formatTaxAmount(breakdown.exciseDuty)}`);
  }
  
  if (breakdown.withholdingTax > 0) {
    lines.push(`Withholding Tax (${(breakdown.ratesApplied.withholding * 100).toFixed(0)}%): ${formatTaxAmount(breakdown.withholdingTax)}`);
  }
  
  lines.push(`Total: ${formatTaxAmount(breakdown.totalAmount)}`);
  
  return lines.join('\n');
}

/**
 * Round to 2 decimal places
 */
function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Validate KRA PIN format
 * Format: A000000000B (letter, 9 digits, letter)
 */
export function validateKRAPin(pin: string): boolean {
  const pattern = /^[A-Z]\d{9}[A-Z]$/;
  return pattern.test(pin.toUpperCase());
}

/**
 * Extract tax info from invoice data
 */
export function createTaxInvoiceData(
  invoiceNumber: string,
  sellerPin: string,
  breakdown: TaxBreakdown,
  description: string
) {
  return {
    invoiceNumber,
    sellerPin,
    date: new Date().toISOString(),
    items: [
      {
        description,
        quantity: 1,
        unitPrice: breakdown.subtotal,
        taxableAmount: breakdown.subtotal,
        vatAmount: breakdown.vatAmount,
        totalAmount: breakdown.subtotal + breakdown.vatAmount
      }
    ],
    ...breakdown
  };
}
