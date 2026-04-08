import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getBaseUrl, initiateDarajaStkPush } from "@/lib/daraja";
import { SUBSCRIPTION_PRICES } from "@/lib/constants/pricing";
import { ensureSubscriptionPaymentIntent } from "@/lib/payments/payment-intents";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

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

    if (!user?.phone) {
      return NextResponse.json(
        {
          error:
            "A valid phone number is required to initiate M-Pesa STK Push.",
        },
        { status: 400 },
      );
    }

    const normalizedUserId = session.user.id.replace(/[^a-zA-Z0-9]/g, "");
    const apiRef = `SUB-${plan}-${normalizedUserId}-${Date.now().toString(36)}`;
    const callbackToken = process.env.DARAJA_CALLBACK_TOKEN;
    const callbackUrl = callbackToken
      ? `${getBaseUrl()}/api/subscription/webhook?token=${encodeURIComponent(callbackToken)}`
      : `${getBaseUrl()}/api/subscription/webhook`;

    const checkoutSession = await initiateDarajaStkPush({
      amount,
      phoneNumber: user.phone,
      apiRef,
      callbackUrl,
      accountReference: apiRef,
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
  } catch (error) {
    console.error("Error initiating subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
