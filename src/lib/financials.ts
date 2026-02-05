
/**
 * Finance Bill 2025 Excise Duty Rate for Digital Services.
 * Currently set to 20% (0.20) as per requirements.
 */
export const EXCISE_DUTY_RATE = 0.20;

/**
 * Trust Fee (Happiness Pledge) Rate.
 * Fixed fee of KES 50 or Percentage.
 * Requirement: "small Trust Fee". Let's use 2.5% capped or fixed.
 * Decision: 2% of Base Amount.
 */
export const TRUST_FEE_RATE = 0.02;

export interface FinancialBreakdown {
  baseAmount: number;
  discountAmount: number;
  exciseDuty: number;
  trustFee: number;
  netAmount: number; 
  totalAmount: number;
  rates: {
    excise: number;
    trust: number;
  }
}

/**
 * Calculates the breakdown of a transaction amount.
 * Now includes Trust Fee (Insurance) and Promo Discounts.
 * 
 * @param baseAmount The base price of the service
 * @param discountAmount Optional discount amount to deduct from base
 * @returns Object containing base, tax components, and total
 */
export function calculateBookingBreakdown(baseAmount: number, discountAmount: number = 0): FinancialBreakdown {
  const base = Number(baseAmount);
  const discount = Number(discountAmount);
  
  if (isNaN(base) || base < 0) {
    return {
      baseAmount: 0,
      discountAmount: 0,
      exciseDuty: 0,
      trustFee: 0,
      netAmount: 0,
      totalAmount: 0,
      rates: { excise: EXCISE_DUTY_RATE, trust: TRUST_FEE_RATE }
    };
  }

  // Discount applies to base
  const discountedBase = Math.max(0, base - discount);

  // Excise Duty is on the Transaction Amount (Discounted Base)
  const exciseDuty = Math.round((discountedBase * EXCISE_DUTY_RATE) * 100) / 100;
  
  // Trust Fee is on the Service Value (Original Base) - Risk doesn't change
  const trustFee = Math.round((base * TRUST_FEE_RATE) * 100) / 100;
  
  const totalAmount = Math.round((discountedBase + exciseDuty + trustFee) * 100) / 100;

  return {
    baseAmount: base,
    discountAmount: discount,
    exciseDuty,
    trustFee,
    netAmount: discountedBase, 
    totalAmount,
    rates: {
        excise: EXCISE_DUTY_RATE,
        trust: TRUST_FEE_RATE
    }
  };
}

/**
 * Formats a currency amount to KES format
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount);
}
