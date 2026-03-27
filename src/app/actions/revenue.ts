"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { TransactionType } from "@/generated/prisma/client";

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

// --- Constants ---
const ONBOARDING_FEE_AMOUNT = 500; // KES 500
const CREDIT_COST_PER_UNIT = 100; // Example: 1 Credit = 100 KES
const LEADS_PACKAGES = [
  { id: "starter", credits: 5, price: 450, discount: "10%" }, // 450 KES
  { id: "growth", credits: 20, price: 1600, discount: "20%" }, // 1600 KES
  { id: "pro", credits: 50, price: 3500, discount: "30%" }, // 3500 KES
];

const PROMOTION_PLANS = {
  STANDARD: { days: 7, price: 1000 },
  PREMIUM: { days: 30, price: 3000 },
};

// --- Actions ---

/**
 * Purchase Lead Gen Credits
 * In a real app, this would integrate with M-Pesa/Payment Gateway.
 * Here we simulate it by deducting from "Wallet Balance" or assuming direct payment.
 * For now, let's assume it charges the USER'S MAIN WALLET BALANCE (which they might have topped up via M-Pesa).
 */
export async function purchaseCredits(
  packageId: string,
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
      // 1. Get Wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId: session.user.id },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      // 2. Check Balance (Assuming we pay with wallet balance for now)
      // In production, this might trigger an M-Pesa STK Push instead.
      if (Number(wallet.balance) < pack.price) {
        throw new Error("Insufficient wallet balance. Please top up first.");
      }

      // 3. Deduct Cost
      const newBalance = Number(wallet.balance) - pack.price;

      // 4. Add Credits
      const newCreditBalance = (wallet.creditBalance || 0) + pack.credits;

      // 5. Update Wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          creditBalance: newCreditBalance,
        },
      });

      // 6. Record Transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: pack.price,
          type: TransactionType.CREDIT_PURCHASE,
          description: `Purchased ${pack.credits} lead credits (${pack.id})`,
        },
      });

      return { newCreditBalance };
    });

    revalidatePath("/wallet");
    revalidatePath("/dashboard");
    return { success: true, newBalance: result.newCreditBalance };
  } catch (error: any) {
    return { success: false, error: error.message };
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
      // 1. Get User Wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId: session.user.id },
      });

      if (!wallet) {
        // Create wallet if missing?
        throw new Error("Wallet setup required.");
      }

      // 2. Check Balance
      if (Number(wallet.balance) < ONBOARDING_FEE_AMOUNT) {
        throw new Error(
          `Insufficient funds. Fee is KES ${ONBOARDING_FEE_AMOUNT}`,
        );
      }

      // 3. Deduct
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: ONBOARDING_FEE_AMOUNT } },
      });

      // 4. Update Profile
      await tx.profile.update({
        where: { userId: session.user.id },
        data: { hasPaidOnboardingFee: true, verificationStatus: "PENDING" }, // fee paid unlocks verification process
      });

      // 5. Record Transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: ONBOARDING_FEE_AMOUNT,
          type: TransactionType.ONBOARDING_FEE,
          description: "Paid Provider Onboarding Fee",
        },
      });
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Promote a Service
 */
export async function promoteService(
  serviceId: string,
  plan: "STANDARD" | "PREMIUM",
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
      // 1. Check Service ownership
      const service = await tx.service.findUnique({
        where: { id: serviceId },
      });
      if (!service || service.providerId !== session.user.id) {
        throw new Error("Service not found or unauthorized");
      }

      // 2. Get Wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId: session.user.id },
      });
      if (!wallet) throw new Error("Wallet not found");

      // 3. Check Balance
      if (Number(wallet.balance) < planDetails.price) {
        throw new Error(`Insufficient funds. Cost: KES ${planDetails.price}`);
      }

      // 4. Deduct
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: planDetails.price } },
      });

      // 5. Update Service
      // Calculate new end date. If already active, extend it? Or just set from now?
      // Let's simpler: Set from now (or extend if currently promotedUntil > now)
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

      // 6. Record Transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: planDetails.price,
          type: TransactionType.PROMOTION_PAYMENT,
          description: `Promoted service '${service.title}' (${plan} Plan)`,
        },
      });

      return updatedService;
    });

    revalidatePath("/services");
    revalidatePath(`/services/${serviceId}`);
    return { success: true, promotedUntil: result.promotedUntil || undefined };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
