import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  buildDarajaCallbackUrl,
  generateDarajaAccountReference,
  getBaseUrl,
  initiateDarajaStkPush,
} from "@/lib/daraja";
import { SUBSCRIPTION_PRICES } from "@/lib/constants/pricing";
import { ensureSubscriptionPaymentIntent } from "@/lib/payments/payment-intents";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, phoneNumber } = (await req.json()) as {
      plan?: string;
      phoneNumber?: unknown;
    };

    // Validate plan
    if (!plan || !["PRO", "BUSINESS"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid subscription plan" },
        { status: 400 },
      );
    }

    // Get amount for the plan
    const amount =
      SUBSCRIPTION_PRICES[plan as keyof typeof SUBSCRIPTION_PRICES];

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        phone: true,
        name: true,
        email: true,
      },
    });

    const requestedPhone =
      typeof phoneNumber === "string" ? phoneNumber.trim() : "";
    const stkPhoneNumber = requestedPhone || user?.phone || "";

    if (!stkPhoneNumber) {
      return NextResponse.json(
        {
          error: "Provide a phone number to receive the M-Pesa STK Push prompt.",
        },
        { status: 400 },
      );
    }

    const normalizedUserId = session.user.id.replace(/[^a-zA-Z0-9]/g, "");
    const apiRef = `SUB-${plan}-${normalizedUserId}-${Date.now().toString(36)}`;
    const accountReference = generateDarajaAccountReference("SUB", apiRef);
    const callbackUrl = buildDarajaCallbackUrl(
      getBaseUrl(),
      "/api/subscription/webhook",
    );

    const checkoutSession = await initiateDarajaStkPush({
      amount,
      phoneNumber: stkPhoneNumber,
      apiRef,
      callbackUrl,
      accountReference,
      description: `Subscription ${plan}`,
    });

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

      const pendingProviderRef = `DARAJA:SUBSCRIPTION:PENDING:${apiRef}`;

      const pendingTx = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: "PAYMENT",
          status: "PENDING",
          direction: "DEBIT",
          category: "SUBSCRIPTION",
          currency: "KES",
          gateway: "DARAJA",
          gatewayReference: apiRef,
          gatewaySessionId: checkoutSession.CheckoutRequestID,
          providerRef: pendingProviderRef,
          sourceType: "SUBSCRIPTION",
          sourceId: plan,
          createdByType: "USER",
          description: `Subscription payment pending (${plan}) [Ref:${apiRef}]`,
        },
      });

      await ensureSubscriptionPaymentIntent(tx, {
        userId: session.user.id,
        walletId: wallet.id,
        apiRef,
        amountExpected: amount,
        currency: "KES",
        sourceId: pendingTx.id,
        gatewaySessionId: checkoutSession.CheckoutRequestID,
        gatewayInvoiceId: checkoutSession.MerchantRequestID,
        providerRef: pendingProviderRef,
        initiationPayload: checkoutSession as unknown as Prisma.InputJsonValue,
        metadata: {
          apiRef,
          accountReference,
          plan,
          source: "subscription_initiate",
          checkoutRequestId: checkoutSession.CheckoutRequestID,
          merchantRequestId: checkoutSession.MerchantRequestID,
        },
      });
    });

    const completionUrl = `/dashboard/premium/complete?apiRef=${encodeURIComponent(apiRef)}&checkoutId=${encodeURIComponent(checkoutSession.CheckoutRequestID)}`;

    return NextResponse.json({
      checkoutUrl: completionUrl,
      sessionId: checkoutSession.CheckoutRequestID,
      amount,
      plan,
      apiRef,
      provider: "DARAJA",
    });
  } catch (error: unknown) {
    console.error("Error initiating subscription:", error);
    const message = error instanceof Error ? error.message : "";
    if (/A valid Kenyan phone number is required/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "The phone number is invalid. Use format 07XXXXXXXX or 2547XXXXXXXX.",
        },
        { status: 400 },
      );
    }
    if (/Daraja.+not configured/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Subscription payments are temporarily unavailable. Please try again shortly.",
        },
        { status: 503 },
      );
    }
    if (/ECONN|ENOTFOUND|ETIMEDOUT|Network Error/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "M-Pesa gateway is currently unreachable. Please retry in a moment.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: message || "Failed to initiate subscription checkout." },
      { status: 500 },
    );
  }
}
