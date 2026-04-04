"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { Prisma, TransactionType } from "@/generated/prisma/client";
import {
  LEADS_PACKAGES,
  PAYMENT_AMOUNTS,
  PROMOTION_PLANS,
} from "@/lib/constants/pricing";
import { validatePromoCode } from "@/lib/promo";

// --- Types ---
export interface PurchaseCreditsResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

export interface PromotionResult {
  success: boolean;
  promotedUntil?: Date;
  error?: string;
}

type LockedWallet = {
  id: string;
  balance: Prisma.Decimal;
  creditBalance: number;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

async function lockWalletForUpdate(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<LockedWallet | null> {
  const rows = await tx.$queryRaw<LockedWallet[]>`
    SELECT id, balance, "creditBalance"
    FROM "Wallet"
    WHERE "userId" = ${userId}
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

async function resolveSystemAdminId(
  tx: Prisma.TransactionClient,
): Promise<string | null> {
  const systemActor = await tx.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  return systemActor?.id ?? null;
}

async function resolvePromoDiscount(
  tx: Prisma.TransactionClient,
  userId: string,
  baseAmount: number,
  promoCode?: string,
) {
  const normalizedPromoCode = promoCode?.trim().toUpperCase();

  if (!normalizedPromoCode) {
    return {
      appliedPromoCode: null as string | null,
      discountAmount: 0,
    };
  }

  const promoResult = await validatePromoCode(
    normalizedPromoCode,
    userId,
    baseAmount,
  );

  if (!promoResult.isValid) {
    throw new Error(promoResult.error || "Invalid promo code");
  }

  if (promoResult.promoCodeId) {
    await tx.promoCode.update({
      where: { id: promoResult.promoCodeId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }

  return {
    appliedPromoCode: normalizedPromoCode,
    discountAmount: promoResult.discountAmount,
  };
}

// --- Actions ---

/**
 * Purchase Lead Gen Credits
 * In a real app, this would integrate with M-Pesa/Payment Gateway.
 * Here we simulate it by deducting from "Wallet Balance" or assuming direct payment.
 * For now, let's assume it charges the USER'S MAIN WALLET BALANCE (which they might have topped up via M-Pesa).
 */
export async function purchaseCredits(
  packageId: string,
  promoCode?: string,
): Promise<PurchaseCreditsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const pack = LEADS_PACKAGES.find((p) => p.id === packageId);
  if (!pack) {
    return { success: false, error: "Invalid package" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await lockWalletForUpdate(tx, session.user.id);

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const promo = await resolvePromoDiscount(
        tx,
        session.user.id,
        pack.price,
        promoCode,
      );
      const finalPrice = Math.max(0, pack.price - promo.discountAmount);

      if (Number(wallet.balance) < finalPrice) {
        throw new Error("Insufficient wallet balance. Please top up first.");
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: finalPrice,
          },
          creditBalance: {
            increment: pack.credits,
          },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: finalPrice,
          type: TransactionType.CREDIT_PURCHASE,
          description:
            `Purchased ${pack.credits} lead credits (${pack.id})` +
            (promo.appliedPromoCode
              ? ` with promo ${promo.appliedPromoCode}`
              : ""),
        },
      });

      return {
        newCreditBalance: wallet.creditBalance + pack.credits,
      };
    });

    revalidatePath("/wallet");
    revalidatePath("/dashboard/wallet");
    revalidatePath("/dashboard");
    return { success: true, newBalance: result.newCreditBalance };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error, "Purchase failed") };
  }
}

/**
 * Pay Onboarding Fee
 */
export async function payOnboardingFee(): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const wallet = await lockWalletForUpdate(tx, session.user.id);

      if (!wallet) {
        throw new Error("Wallet setup required.");
      }

      if (Number(wallet.balance) < PAYMENT_AMOUNTS.ONBOARDING_FEE) {
        throw new Error(
          `Insufficient funds. Fee is KES ${PAYMENT_AMOUNTS.ONBOARDING_FEE}`,
        );
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: PAYMENT_AMOUNTS.ONBOARDING_FEE } },
      });

      await tx.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          hasPaidOnboardingFee: true,
        },
        update: {
          hasPaidOnboardingFee: true,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
          type: TransactionType.ONBOARDING_FEE,
          description: "Paid Provider Onboarding Fee",
        },
      });

      const systemAdminId = await resolveSystemAdminId(tx);
      if (systemAdminId) {
        await tx.adminLog.create({
          data: {
            adminId: systemAdminId,
            action: "ONBOARDING_FEE_PAID_ACCESS_GRANTED",
            targetId: session.user.id,
            details: {
              source: "wallet",
              amount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
              actorUserId: session.user.id,
            },
          },
        });
      }
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to pay onboarding fee"),
    };
  }
}

/**
 * Promote a Service
 */
export async function promoteService(
  serviceId: string,
  plan: "STANDARD" | "PREMIUM",
  promoCode?: string,
): Promise<PromotionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const planDetails = PROMOTION_PLANS[plan];
  if (!planDetails) {
    return { success: false, error: "Invalid plan" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({
        where: { id: serviceId },
      });
      if (!service || service.providerId !== session.user.id) {
        throw new Error("Service not found or unauthorized");
      }

      const wallet = await lockWalletForUpdate(tx, session.user.id);
      if (!wallet) throw new Error("Wallet not found");

      const promo = await resolvePromoDiscount(
        tx,
        session.user.id,
        planDetails.price,
        promoCode,
      );
      const finalPrice = Math.max(0, planDetails.price - promo.discountAmount);

      if (Number(wallet.balance) < finalPrice) {
        throw new Error(`Insufficient funds. Cost: KES ${finalPrice}`);
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: finalPrice } },
      });

      let start = new Date();
      if (service.promotedUntil && service.promotedUntil > new Date()) {
        start = service.promotedUntil;
      }

      const newEnd = new Date(start);
      newEnd.setDate(newEnd.getDate() + planDetails.days);

      const updatedService = await tx.service.update({
        where: { id: serviceId },
        data: {
          promotedUntil: newEnd,
          promotionPlan: plan,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: finalPrice,
          type: TransactionType.PROMOTION_PAYMENT,
          description:
            `Promoted service '${service.title}' (${plan} Plan)` +
            (promo.appliedPromoCode
              ? ` with promo ${promo.appliedPromoCode}`
              : ""),
        },
      });

      return updatedService;
    });

    revalidatePath("/services");
    revalidatePath(`/services/${serviceId}`);
    return { success: true, promotedUntil: result.promotedUntil || undefined };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to promote service"),
    };
  }
}
