import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  getBaseUrl,
  generateApiRef,
  initiateDarajaStkPush,
  PAYMENT_AMOUNTS,
} from "@/lib/daraja";
import { ensureOnboardingFeePaymentIntent } from "@/lib/payments/payment-intents";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user already paid
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (
      profile?.hasPaidOnboardingFee ||
      profile?.onboardingFeeWaived ||
      profile?.verificationStatus === "VERIFIED"
    ) {
      return NextResponse.json(
        {
          error: "Verification access is already active for this account",
          alreadyActivated: true,
        },
        { status: 400 },
      );
    }

    // Generate API reference (alphanumeric + hyphens only)
    const apiRef = generateApiRef("ONBOARD", session.user.id);

    const payer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        phone: true,
        name: true,
        email: true,
      },
    });

    if (!payer?.phone) {
      return NextResponse.json(
        {
          error:
            "A valid phone number is required to initiate M-Pesa STK Push.",
        },
        { status: 400 },
      );
    }

    const baseUrl = getBaseUrl();
    const callbackToken = process.env.DARAJA_CALLBACK_TOKEN;
    const callbackUrl = callbackToken
      ? `${baseUrl}/api/onboarding-fee/webhook?token=${encodeURIComponent(callbackToken)}`
      : `${baseUrl}/api/onboarding-fee/webhook`;
    const completionUrl = `${baseUrl}/dashboard/onboarding-complete?apiRef=${encodeURIComponent(apiRef)}`;

    console.log("Initiating onboarding fee payment:", {
      apiRef,
      callbackUrl,
      amount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
    });

    const response = await initiateDarajaStkPush({
      amount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
      phoneNumber: payer.phone,
      apiRef,
      callbackUrl,
      accountReference: apiRef,
      description: "Provider onboarding fee",
    });

    console.log("Daraja STK push response:", response);

    await prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId: session.user.id },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: session.user.id,
            balance: 0,
            pendingBalance: 0,
            currency: "KES",
          },
        });
      }

      const pendingProviderRef = `DARAJA:ONBOARDING:PENDING:${apiRef}`;
      const existingPending = await tx.transaction.findFirst({
        where: {
          walletId: wallet.id,
          type: "ONBOARDING_FEE",
          providerRef: pendingProviderRef,
        },
      });

      let pendingTransactionId = existingPending?.id || null;

      if (!existingPending) {
        const createdPending = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
            type: "ONBOARDING_FEE",
            status: "PENDING",
            direction: "DEBIT",
            category: "ONBOARDING_FEE",
            currency: "KES",
            gateway: "DARAJA",
            gatewayReference: apiRef,
            gatewaySessionId: response.CheckoutRequestID,
            providerRef: pendingProviderRef,
            sourceType: "ONBOARDING_FEE",
            sourceId: session.user.id,
            createdByType: "USER",
            description: `Onboarding Fee Payment Pending [Ref:${apiRef}]`,
          },
        });

        pendingTransactionId = createdPending.id;
      }

      await ensureOnboardingFeePaymentIntent(tx, {
        userId: session.user.id,
        walletId: wallet.id,
        apiRef,
        amountExpected: PAYMENT_AMOUNTS.ONBOARDING_FEE,
        currency: "KES",
        sourceId: pendingTransactionId || session.user.id,
        gatewaySessionId: response.CheckoutRequestID,
        gatewayInvoiceId: response.MerchantRequestID,
        providerRef: pendingProviderRef,
        initiationPayload: response as unknown as Prisma.InputJsonValue,
        metadata: {
          apiRef,
          source: "onboarding_fee_initiate",
          checkoutRequestId: response.CheckoutRequestID,
          merchantRequestId: response.MerchantRequestID,
        },
      });
    });

    return NextResponse.json({
      checkoutUrl: completionUrl,
      sessionId: response.CheckoutRequestID,
      apiRef: apiRef,
      amount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
      provider: "DARAJA",
    });
  } catch (error: unknown) {
    console.error("[ONBOARDING_FEE_INITIATE]", error);
    const message =
      error instanceof Error ? error.message : "Failed to initiate payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
