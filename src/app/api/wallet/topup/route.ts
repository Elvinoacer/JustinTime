import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { hasRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import {
  buildDarajaCallbackUrl,
  generateDarajaAccountReference,
  getBaseUrl,
  generateApiRef,
  initiateDarajaStkPush,
  PAYMENT_AMOUNTS,
} from "@/lib/daraja";
import {
  getWalletSchemaOutOfSyncMessage,
  isWalletSchemaOutOfSyncError,
} from "@/lib/wallet/errors";
import { ensureWalletTopUpPaymentIntent } from "@/lib/payments/payment-intents";
import {
  buildPaymentVerificationPath,
  normalizeInternalReturnPath,
} from "@/lib/payments/verification";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";
import { trackStkPhoneEvent } from "@/lib/payments/stk-analytics";

export async function POST(req: Request) {
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
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    }

    const amount = Number(body?.amount);
    const requestedReturnUrl = normalizeInternalReturnPath(body?.returnUrl);
    const hasPhoneOverride = Object.prototype.hasOwnProperty.call(
      body,
      "phoneNumber",
    );
    const requestedPhoneRaw =
      hasPhoneOverride && typeof body.phoneNumber === "string"
        ? body.phoneNumber
        : null;

    if (hasPhoneOverride && requestedPhoneRaw == null) {
      return NextResponse.json(
        { error: "Phone number must be provided as text." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount < PAYMENT_AMOUNTS.MIN_TOPUP) {
      return NextResponse.json(
        {
          error: `Invalid amount. Minimum top-up is KES ${PAYMENT_AMOUNTS.MIN_TOPUP}.`,
        },
        { status: 400 },
      );
    }

    const payer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        phone: true,
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

    const profilePhone = normalizeKenyanPhone(String(payer.phone || ""));
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

    // Generate API reference (alphanumeric + hyphens only)
    const apiRef = generateApiRef("TOPUP", session.user.id);
    const accountReference = generateDarajaAccountReference("WT", apiRef);
    analyticsContext.apiRef = apiRef;

    const baseUrl = getBaseUrl();
    const defaultReturnPath = hasRole(session.user, "PROVIDER")
      ? "/dashboard/wallet"
      : "/client/wallet";
    const returnPath = requestedReturnUrl || defaultReturnPath;
    const callbackUrl = buildDarajaCallbackUrl(baseUrl, "/api/wallet/webhook");

    console.log("Initiating wallet topup:", {
      apiRef,
      callbackUrl,
      amount,
    });

    const response = await initiateDarajaStkPush({
      amount,
      phoneNumber: phoneNumberToUse,
      apiRef,
      callbackUrl,
      accountReference,
      description: "Wallet top-up",
    });

    trackStkPhoneEvent({
      flow: "wallet_topup",
      outcome: "initiated",
      ...analyticsContext,
    });

    console.log("Daraja topup STK response:", response);

    const topUp = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: session.user.id },
        update: {
          currency: "KES",
        },
        create: {
          userId: session.user.id,
          balance: 0,
          pendingBalance: 0,
          currency: "KES",
        },
      });

      const existingTopUp = await tx.walletTopUp.findUnique({
        where: { apiRef },
      });

      if (existingTopUp) {
        const verificationPath = buildPaymentVerificationPath({
          kind: "wallet_topup",
          apiRef,
          topUpId: existingTopUp.id,
          checkoutId: response.CheckoutRequestID,
          trackingId: response.MerchantRequestID,
          returnTo: returnPath,
        });
        const completionUrl =
          existingTopUp.checkoutUrl || `${baseUrl}${verificationPath}`;

        if (!existingTopUp.checkoutUrl) {
          await tx.walletTopUp.update({
            where: { id: existingTopUp.id },
            data: {
              checkoutUrl: completionUrl,
              gatewaySessionId:
                existingTopUp.gatewaySessionId || response.CheckoutRequestID,
              gatewayInvoiceId:
                existingTopUp.gatewayInvoiceId || response.MerchantRequestID,
            },
          });
        }

        return {
          ...existingTopUp,
          checkoutUrl: completionUrl,
        };
      }

      const createdTopUp = await tx.walletTopUp.create({
        data: {
          userId: session.user.id,
          walletId: wallet.id,
          amountExpected: amount,
          currency: "KES",
          status: "PENDING",
          gateway: "DARAJA",
          apiRef,
          gatewaySessionId: response.CheckoutRequestID,
          gatewayInvoiceId: response.MerchantRequestID,
          checkoutUrl: null,
          initiatedAt: new Date(),
          rawInitiationPayload: {
            providerResponse: response,
            initiatedPhoneNumber: phoneNumberToUse,
            overrideUsed: hasPhoneOverride,
          } as Prisma.InputJsonValue,
        },
      });

      const verificationPath = buildPaymentVerificationPath({
        kind: "wallet_topup",
        apiRef,
        topUpId: createdTopUp.id,
        checkoutId: response.CheckoutRequestID,
        trackingId: response.MerchantRequestID,
        returnTo: returnPath,
      });
      const completionUrl = `${baseUrl}${verificationPath}`;

      await tx.walletTopUp.update({
        where: { id: createdTopUp.id },
        data: {
          checkoutUrl: completionUrl,
        },
      });

      await ensureWalletTopUpPaymentIntent(tx, {
        userId: session.user.id,
        walletId: wallet.id,
        topUpId: createdTopUp.id,
        apiRef,
        amountExpected: amount,
        currency: "KES",
        gatewaySessionId: response.CheckoutRequestID,
        gatewayInvoiceId: response.MerchantRequestID,
        providerRef: `DARAJA:WALLET:TOPUP:${apiRef}`,
        initiationPayload: response as unknown as Prisma.InputJsonValue,
        metadata: {
          apiRef,
          accountReference,
          checkoutUrl: completionUrl,
          checkoutRequestId: response.CheckoutRequestID,
          merchantRequestId: response.MerchantRequestID,
          source: "wallet_topup_initiate",
          initiatedPhoneNumber: phoneNumberToUse,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          topUpId: createdTopUp.id,
          amount,
          type: "DEPOSIT",
          status: "PENDING",
          direction: "CREDIT",
          category: "TOPUP",
          currency: "KES",
          gateway: "DARAJA",
          gatewayReference: apiRef,
          gatewaySessionId: response.CheckoutRequestID,
          providerRef: `DARAJA:WALLET:TOPUP:${apiRef}`,
          sourceType: "WALLET_TOPUP",
          sourceId: createdTopUp.id,
          createdByType: "USER",
          description: `Wallet Top-up initiated [Ref:${apiRef}]`,
          metadata: {
            apiRef,
            accountReference,
            checkoutUrl: completionUrl,
            checkoutRequestId: response.CheckoutRequestID,
            merchantRequestId: response.MerchantRequestID,
            initiatedPhoneNumber: phoneNumberToUse,
          },
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { increment: amount },
        },
      });

      return {
        ...createdTopUp,
        checkoutUrl: completionUrl,
      };
    });

    return NextResponse.json({
      checkoutUrl: topUp.checkoutUrl,
      sessionId: response.CheckoutRequestID,
      apiRef: apiRef,
      topUpId: topUp.id,
      status: topUp.status,
      provider: "DARAJA",
    });
  } catch (error: unknown) {
    console.error("[WALLET_TOPUP_INITIATE]", error);

    trackStkPhoneEvent({
      flow: "wallet_topup",
      outcome: "failed",
      ...analyticsContext,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (isWalletSchemaOutOfSyncError(error)) {
      return NextResponse.json(
        {
          error: getWalletSchemaOutOfSyncMessage(),
          code: "WALLET_SCHEMA_OUT_OF_SYNC",
        },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "";

    if (/Daraja.+not configured/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Wallet payments are temporarily unavailable. Please try again shortly.",
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
      { error: "Failed to initiate wallet top-up. Please try again." },
      { status: 500 },
    );
  }
}
