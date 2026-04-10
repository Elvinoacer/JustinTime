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
import {
  buildPaymentVerificationPath,
  normalizeInternalReturnPath,
} from "@/lib/payments/verification";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";
import { trackStkPhoneEvent } from "@/lib/payments/stk-analytics";

export async function POST(req: NextRequest) {
  let analyticsContext: {
    userId?: string;
    apiRef?: string;
    amount?: number;
    initiatedPhoneNumber?: string;
    profilePhoneNumber?: string;
    overrideProvided?: boolean;
    overrideUsed?: boolean;
  } = {};

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const payload =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : null;
    const plan =
      payload && typeof payload.plan === "string" ? payload.plan : null;
    const requestedReturnValue =
      payload && typeof payload.returnUrl === "string"
        ? payload.returnUrl
        : null;
    const requestedReturnUrl = normalizeInternalReturnPath(
      typeof requestedReturnValue === "string" ? requestedReturnValue : null,
    );
    const hasPhoneOverride = payload
      ? Object.prototype.hasOwnProperty.call(payload, "phoneNumber")
      : false;
    const requestedPhoneRaw =
      payload && typeof payload.phoneNumber === "string"
        ? payload.phoneNumber
        : null;

    if (hasPhoneOverride && requestedPhoneRaw == null) {
      return NextResponse.json(
        { error: "Phone number must be provided as text." },
        { status: 400 },
      );
    }

    // Validate plan
    if (typeof plan !== "string" || !["PRO", "BUSINESS"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid subscription plan" },
        { status: 400 },
      );
    }

    // Get amount for the plan
    const amount =
      SUBSCRIPTION_PRICES[plan as keyof typeof SUBSCRIPTION_PRICES];
    analyticsContext.amount = amount;

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

    const profilePhone = normalizeKenyanPhone(String(user.phone || ""));
    const requestedPhone = requestedPhoneRaw
      ? normalizeKenyanPhone(requestedPhoneRaw)
      : "";

    if (hasPhoneOverride && !isValidKenyanPhone(requestedPhone)) {
      return NextResponse.json(
        {
          error:
            "Enter a valid M-Pesa phone number in format 2547XXXXXXXX or 2541XXXXXXXX.",
        },
        { status: 400 },
      );
    }

    const phoneNumberToUse = requestedPhone || profilePhone;
    const overrideUsed =
      hasPhoneOverride &&
      requestedPhone.length > 0 &&
      requestedPhone !== profilePhone;

    analyticsContext = {
      userId: session.user.id,
      amount,
      initiatedPhoneNumber: phoneNumberToUse,
      profilePhoneNumber: profilePhone,
      overrideProvided: hasPhoneOverride,
      overrideUsed,
    };

    if (!isValidKenyanPhone(phoneNumberToUse)) {
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
    const accountReference = generateDarajaAccountReference("SUB", apiRef);
    analyticsContext.apiRef = apiRef;
    const callbackUrl = buildDarajaCallbackUrl(
      getBaseUrl(),
      "/api/subscription/webhook",
    );

    const checkoutSession = await initiateDarajaStkPush({
      amount,
      phoneNumber: phoneNumberToUse,
      apiRef,
      callbackUrl,
      accountReference,
      description: `Subscription ${plan}`,
    });

    trackStkPhoneEvent({
      flow: "subscription",
      outcome: "initiated",
      ...analyticsContext,
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
          metadata: {
            apiRef,
            plan,
            initiatedPhoneNumber: phoneNumberToUse,
            checkoutRequestId: checkoutSession.CheckoutRequestID,
            merchantRequestId: checkoutSession.MerchantRequestID,
            source: "subscription_initiate",
          },
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
          initiatedPhoneNumber: phoneNumberToUse,
        },
      });
    });

    const completionUrl = buildPaymentVerificationPath({
      kind: "subscription",
      apiRef,
      checkoutId: checkoutSession.CheckoutRequestID,
      trackingId: checkoutSession.MerchantRequestID,
      returnTo: requestedReturnUrl || "/dashboard/premium",
    });

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

    trackStkPhoneEvent({
      flow: "subscription",
      outcome: "failed",
      ...analyticsContext,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
