import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { hasRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import {
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

function normalizeReturnPath(path?: string): string | null {
  if (!path || typeof path !== "string") {
    return null;
  }

  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}

export async function POST(req: Request) {
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
    const requestedReturnUrl = normalizeReturnPath(body?.returnUrl);

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

    // Generate API reference (alphanumeric + hyphens only)
    const apiRef = generateApiRef("TOPUP", session.user.id);

    const baseUrl = getBaseUrl();
    const defaultReturnPath = hasRole(session.user, "PROVIDER")
      ? "/dashboard/wallet/topup-complete"
      : "/client/wallet/topup-complete";
    const returnPath = requestedReturnUrl || defaultReturnPath;
    const callbackToken = process.env.DARAJA_CALLBACK_TOKEN;
    const callbackUrl = callbackToken
      ? `${baseUrl}/api/wallet/webhook?token=${encodeURIComponent(callbackToken)}`
      : `${baseUrl}/api/wallet/webhook`;

    console.log("Initiating wallet topup:", {
      apiRef,
      callbackUrl,
      amount,
    });

    const response = await initiateDarajaStkPush({
      amount,
      phoneNumber: payer.phone,
      apiRef,
      callbackUrl,
      accountReference: apiRef,
      description: "Wallet top-up",
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
        const completionUrl =
          existingTopUp.checkoutUrl ||
          `${baseUrl}${returnPath}?apiRef=${encodeURIComponent(apiRef)}&topUpId=${encodeURIComponent(existingTopUp.id)}&checkoutId=${encodeURIComponent(response.CheckoutRequestID)}`;

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
          rawInitiationPayload: response as unknown as Prisma.InputJsonValue,
        },
      });

      const completionUrl = `${baseUrl}${returnPath}?apiRef=${encodeURIComponent(apiRef)}&topUpId=${encodeURIComponent(createdTopUp.id)}&checkoutId=${encodeURIComponent(response.CheckoutRequestID)}`;

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
          checkoutUrl: completionUrl,
          checkoutRequestId: response.CheckoutRequestID,
          merchantRequestId: response.MerchantRequestID,
          source: "wallet_topup_initiate",
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
            checkoutUrl: completionUrl,
            checkoutRequestId: response.CheckoutRequestID,
            merchantRequestId: response.MerchantRequestID,
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
