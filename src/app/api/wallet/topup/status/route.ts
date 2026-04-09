import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDarajaPayment } from "@/lib/daraja";
import { DarajaWebhookPayload } from "@/lib/daraja-webhook";
import { POST as handleWalletWebhook } from "@/app/api/wallet/webhook/route";
import {
  getWalletSchemaOutOfSyncMessage,
  isWalletSchemaOutOfSyncError,
} from "@/lib/wallet/errors";

function isTerminalTopUpStatus(status: string): boolean {
  return ["SETTLED", "FAILED", "CANCELLED", "REVERSED"].includes(status);
}

function buildSyntheticWebhookRequest(
  requestUrl: string,
  payload: DarajaWebhookPayload,
): Request {
  const origin = new URL(requestUrl).origin;
  const webhookUrl = new URL("/api/wallet/webhook", origin);
  const callbackToken = (process.env.DARAJA_CALLBACK_TOKEN || "").trim();
  const internalSecret = (
    process.env.DARAJA_RECONCILE_CRON_SECRET || ""
  ).trim();

  if (callbackToken) {
    webhookUrl.searchParams.set("token", callbackToken);
  }

  const headers = new Headers({
    "content-type": "application/json",
  });

  if (callbackToken) {
    headers.set("x-daraja-callback-token", callbackToken);
  }

  if (internalSecret) {
    headers.set("x-daraja-internal-process", "1");
    headers.set("x-daraja-internal-secret", internalSecret);
  }

  return new Request(webhookUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const apiRef = String(
      searchParams.get("apiRef") || searchParams.get("api_ref") || "",
    ).trim();
    const topUpId = String(searchParams.get("topUpId") || "").trim();
    const trackingId = String(
      searchParams.get("tracking_id") ||
        searchParams.get("trackingId") ||
        searchParams.get("invoice_id") ||
        searchParams.get("invoiceId") ||
        "",
    ).trim();
    const checkoutId = String(
      searchParams.get("checkout_id") ||
        searchParams.get("checkoutId") ||
        searchParams.get("sessionId") ||
        "",
    ).trim();

    if (!apiRef && !topUpId) {
      return NextResponse.json(
        { error: "Provide either apiRef or topUpId" },
        { status: 400 },
      );
    }

    const loadTopUp = async () =>
      prisma.walletTopUp.findFirst({
        where: {
          userId: session.user.id,
          ...(topUpId ? { id: topUpId } : { apiRef }),
        },
        include: {
          ledgerEntries: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

    let topUp = await loadTopUp();

    if (!topUp) {
      return NextResponse.json({ error: "Top-up not found" }, { status: 404 });
    }

    const verificationCheckoutRequestId =
      checkoutId ||
      topUp.gatewaySessionId ||
      trackingId ||
      topUp.gatewayInvoiceId;
    const merchantRequestId =
      trackingId || topUp.gatewayInvoiceId || topUp.gatewaySessionId || null;

    if (!isTerminalTopUpStatus(topUp.status) && verificationCheckoutRequestId) {
      try {
        const providerSnapshot = await verifyDarajaPayment({
          checkoutRequestId: verificationCheckoutRequestId,
          expectedApiRef: topUp.apiRef,
          expectedAmount: Number(topUp.amountExpected),
          expectedCurrency: topUp.currency || "KES",
          requireAmountMatch: false,
          requireCurrencyMatch: false,
        });

        const canonicalProviderState = providerSnapshot.providerState;
        const shouldForwardSettled = canonicalProviderState === "SETTLED";
        const shouldForwardTerminal = ["FAILED", "CANCELLED", "REVERSED"].includes(
          canonicalProviderState,
        );

        if (shouldForwardSettled || shouldForwardTerminal) {
          const syntheticPayload: DarajaWebhookPayload = {
            CheckoutRequestID: verificationCheckoutRequestId,
            MerchantRequestID:
              merchantRequestId || verificationCheckoutRequestId,
            ResultCode:
              canonicalProviderState === "SETTLED"
                ? 0
                : canonicalProviderState === "CANCELLED"
                  ? 1032
                  : 1,
            ResultDesc: providerSnapshot.providerState || "PROCESSING",
            api_ref: topUp.apiRef,
            Amount:
              providerSnapshot.amount ?? Number(topUp.amountExpected || 0),
            id: merchantRequestId || verificationCheckoutRequestId,
            provider: "REDIRECT_STATUS_RECOVERY",
          };

          await handleWalletWebhook(
            buildSyntheticWebhookRequest(req.url, syntheticPayload),
          );

          const refreshedTopUp = await loadTopUp();
          if (refreshedTopUp) {
            topUp = refreshedTopUp;
          }
        }
      } catch (error) {
        console.warn(
          "[WALLET_TOPUP_STATUS_GET] Redirect reconciliation attempt failed",
          error,
        );
      }
    }

    const latestLedger = topUp.ledgerEntries[0] || null;
    const isTerminal = isTerminalTopUpStatus(topUp.status);

    return NextResponse.json({
      topUpId: topUp.id,
      apiRef: topUp.apiRef,
      status: topUp.status,
      currency: topUp.currency,
      amountExpected: topUp.amountExpected,
      amountReceived: topUp.amountReceived,
      gateway: topUp.gateway,
      gatewaySessionId: topUp.gatewaySessionId,
      gatewayInvoiceId: topUp.gatewayInvoiceId,
      checkoutUrl: topUp.checkoutUrl,
      initiatedAt: topUp.initiatedAt,
      confirmedAt: topUp.confirmedAt,
      failedAt: topUp.failedAt,
      cancelledAt: topUp.cancelledAt,
      reversedAt: topUp.reversedAt,
      failureReason: topUp.failureReason,
      isTerminal,
      transaction: latestLedger
        ? {
            id: latestLedger.id,
            amount: latestLedger.amount,
            type: latestLedger.type,
            status: latestLedger.status,
            direction: latestLedger.direction,
            category: latestLedger.category,
            providerRef: latestLedger.providerRef,
            gatewayReference: latestLedger.gatewayReference,
            gatewaySessionId: latestLedger.gatewaySessionId,
            createdAt: latestLedger.createdAt,
            settledAt: latestLedger.settledAt,
            failedAt: latestLedger.failedAt,
            cancelledAt: latestLedger.cancelledAt,
            reversedAt: latestLedger.reversedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("[WALLET_TOPUP_STATUS_GET]", error);

    if (isWalletSchemaOutOfSyncError(error)) {
      return NextResponse.json(
        {
          error: getWalletSchemaOutOfSyncMessage(),
          code: "WALLET_SCHEMA_OUT_OF_SYNC",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Unable to fetch top-up status right now" },
      { status: 500 },
    );
  }
}
