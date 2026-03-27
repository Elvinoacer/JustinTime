import prisma from "@/lib/prisma";
import { PromoType } from "@/generated/prisma/client";

export interface PromoValidationResult {
  isValid: boolean;
  discountAmount: number;
  promoCodeId?: string;
  error?: string;
}

/**
 * Validates a promo code and calculates the discount amount.
 */
export async function validatePromoCode(
  code: string,
  userId: string,
  orderAmount: number,
): Promise<PromoValidationResult> {
  if (!code) {
    return { isValid: false, discountAmount: 0, error: "Code is required" };
  }

  try {
    const promo = await prisma.promoCode.findUnique({
      where: { code },
    });

    if (!promo) {
      return { isValid: false, discountAmount: 0, error: "Invalid promo code" };
    }

    if (!promo.isActive) {
      return {
        isValid: false,
        discountAmount: 0,
        error: "This promo code is inactive",
      };
    }

    const now = new Date();
    if (promo.startDate > now) {
      return {
        isValid: false,
        discountAmount: 0,
        error: "Promo code is not yet active",
      };
    }

    if (promo.endDate && promo.endDate < now) {
      return {
        isValid: false,
        discountAmount: 0,
        error: "Promo code has expired",
      };
    }

    // specific usage limit (total)
    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
      return {
        isValid: false,
        discountAmount: 0,
        error: "Promo code usage limit reached",
      };
    }

    // per user usage limit
    const userUsageCount = await prisma.booking.count({
      where: {
        clientId: userId,
        promoCodeId: promo.id,
        status: { not: "CANCELLED" }, // Don't count cancelled bookings? Or should we?
        // Usually cancelled bookings should return the coupon usage.
      },
    });

    if (userUsageCount >= promo.perUserLimit) {
      return {
        isValid: false,
        discountAmount: 0,
        error: `You have already used this code ${userUsageCount} time(s)`,
      };
    }

    // Check min order amount
    if (promo.minOrderAmount && orderAmount < Number(promo.minOrderAmount)) {
      return {
        isValid: false,
        discountAmount: 0,
        error: `Minimum order amount is ${promo.minOrderAmount}`,
      };
    }

    // Calculate discount
    let discount = 0;
    if (promo.type === PromoType.PERCENTAGE) {
      discount = (orderAmount * Number(promo.value)) / 100;
      if (
        promo.maxDiscountAmount &&
        discount > Number(promo.maxDiscountAmount)
      ) {
        discount = Number(promo.maxDiscountAmount);
      }
    } else {
      discount = Number(promo.value);
    }

    // Ensure discount doesn't exceed order amount
    if (discount > orderAmount) {
      discount = orderAmount;
    }

    return {
      isValid: true,
      discountAmount: discount,
      promoCodeId: promo.id,
    };
  } catch (error) {
    console.error("Error validating promo code:", error);
    return {
      isValid: false,
      discountAmount: 0,
      error: "Error validating code",
    };
  }
}
