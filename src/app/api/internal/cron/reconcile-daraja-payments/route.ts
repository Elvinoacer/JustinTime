import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { verifyDarajaPayment } from "@/lib/daraja";
import { DarajaWebhookPayload } from "@/lib/daraja-webhook";
import { POST as handleWalletWebhook } from "@/app/api/wallet/webhook/route";
import { POST as handleOnboardingWebhook } from "@/app/api/onboarding-fee/webhook/route";
import { POST as handleSubscriptionWebhook } from "@/app/api/subscription/webhook/route";

const MAX_BATCH = 100;

function hasSecretAccess(request: Request): boolean {
  const expectedSecret = process.env.DARAJA_RECONCILE_CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  if (headerSecret && headerSecret === expectedSecret) {
    return true;
  }

  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === expectedSecret;
  }

  return false;
}

function mapResultCode(state: string): number {
  if (state === "SETTLED") {
    return 0;
  }

  if (state === "CANCELLED") {
    return 1032;
  }

  return 1;
}

function extractApiRefFromProviderRef(
  providerRef: string | null,
): string | null {
  const value = String(providerRef || "").trim();
  if (!value) {
    return null;
  }

  const index = value.lastIndexOf(":");
  if (index === -1 || index === value.length - 1) {
    return null;
  }

  return value.slice(index + 1).trim() || null;
}

function buildSyntheticWebhookRequest(
  requestUrl: string,
  webhookPath: string,
  payload: DarajaWebhookPayload,
): NextRequest {
  const origin = new URL(requestUrl).origin;
  const callbackToken = String(process.env.DARAJA_CALLBACK_TOKEN || "").trim();
  const internalSecret = String(
    process.env.DARAJA_RECONCILE_CRON_SECRET || "",
  ).trim();

  const webhookUrl = new URL(webhookPath, origin);
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

  return new NextRequest(webhookUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

async function reconcileWalletTopups(requestUrl: string, staleBefore: Date) {
  const staleTopUps = await prisma.walletTopUp.findMany({
    where: {
      status: {
        in: ["PENDING", "PROCESSING"],
      },
      initiatedAt: {
        lte: staleBefore,
      },
      gatewaySessionId: {
        not: null,
      },
    },
    orderBy: {
      initiatedAt: "asc",
    },
    take: MAX_BATCH,
  });

  let forwarded = 0;
  let errors = 0;

  for (const topUp of staleTopUps) {
    const checkoutRequestId = String(topUp.gatewaySessionId || "").trim();
    if (!checkoutRequestId) {
      continue;
    }

    try {
      const snapshot = await verifyDarajaPayment({
        checkoutRequestId,
        expectedApiRef: topUp.apiRef,
        expectedAmount: Number(topUp.amountExpected),
        expectedCurrency: topUp.currency || "KES",
        requireAmountMatch: false,
        requireCurrencyMatch: false,
      });

      const providerState = snapshot.providerState;
      const shouldForwardSettled = providerState === "SETTLED";
      const shouldForwardTerminal = [
        "FAILED",
        "CANCELLED",
        "REVERSED",
      ].includes(providerState);

      if (!shouldForwardSettled && !shouldForwardTerminal) {
        continue;
      }

      const payload: DarajaWebhookPayload = {
        CheckoutRequestID: checkoutRequestId,
        MerchantRequestID:
          String(
            topUp.gatewayInvoiceId || topUp.gatewaySessionId || "",
          ).trim() || checkoutRequestId,
        ResultCode: mapResultCode(providerState),
        ResultDesc: providerState,
        api_ref: topUp.apiRef,
        Amount: snapshot.amount ?? Number(topUp.amountExpected),
        id:
          String(
            topUp.gatewayInvoiceId || topUp.gatewaySessionId || "",
          ).trim() || checkoutRequestId,
        provider: "STALE_PENDING_RECONCILIATION",
      };

      await handleWalletWebhook(
        buildSyntheticWebhookRequest(
          requestUrl,
          "/api/wallet/webhook",
          payload,
        ),
      );
      forwarded += 1;
    } catch (error) {
      errors += 1;
      console.warn(
        "[DARAJA_RECONCILE_CRON] wallet top-up reconciliation failed",
        {
          topUpId: topUp.id,
          apiRef: topUp.apiRef,
          error,
        },
      );
    }
  }

  return {
    scanned: staleTopUps.length,
    forwarded,
    errors,
  };
}

async function reconcileOnboardingPayments(
  requestUrl: string,
  staleBefore: Date,
) {
  const stalePayments = await prisma.transaction.findMany({
    where: {
      type: "ONBOARDING_FEE",
      status: {
        in: ["PENDING", "PROCESSING"],
      },
      createdAt: {
        lte: staleBefore,
      },
      gatewaySessionId: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: MAX_BATCH,
  });

  let forwarded = 0;
  let errors = 0;

  for (const entry of stalePayments) {
    const checkoutRequestId = String(entry.gatewaySessionId || "").trim();
    if (!checkoutRequestId) {
      continue;
    }

    const apiRef = extractApiRefFromProviderRef(entry.providerRef);
    const merchantRequestId =
      String(entry.gatewayReference || "").trim() || null;

    try {
      const snapshot = await verifyDarajaPayment({
        checkoutRequestId,
        expectedApiRef: apiRef,
        expectedAmount: Number(entry.amount),
        expectedCurrency: entry.currency || "KES",
        requireApiRefMatch: false,
        requireAmountMatch: false,
        requireCurrencyMatch: false,
      });

      const providerState = snapshot.providerState;
      const shouldForwardSettled = providerState === "SETTLED";
      const shouldForwardTerminal = [
        "FAILED",
        "CANCELLED",
        "REVERSED",
      ].includes(providerState);

      if (!shouldForwardSettled && !shouldForwardTerminal) {
        continue;
      }

      const payload: DarajaWebhookPayload = {
        CheckoutRequestID: checkoutRequestId,
        MerchantRequestID: merchantRequestId || checkoutRequestId,
        ResultCode: mapResultCode(providerState),
        ResultDesc: providerState,
        api_ref: apiRef,
        Amount: snapshot.amount ?? Number(entry.amount),
        id: merchantRequestId || checkoutRequestId,
        provider: "STALE_PENDING_RECONCILIATION",
      };

      await handleOnboardingWebhook(
        buildSyntheticWebhookRequest(
          requestUrl,
          "/api/onboarding-fee/webhook",
          payload,
        ),
      );
      forwarded += 1;
    } catch (error) {
      errors += 1;
      console.warn(
        "[DARAJA_RECONCILE_CRON] onboarding payment reconciliation failed",
        {
          transactionId: entry.id,
          providerRef: entry.providerRef,
          error,
        },
      );
    }
  }

  return {
    scanned: stalePayments.length,
    forwarded,
    errors,
  };
}

async function reconcileSubscriptionPayments(
  requestUrl: string,
  staleBefore: Date,
) {
  const stalePayments = await prisma.transaction.findMany({
    where: {
      type: "PAYMENT",
      category: "SUBSCRIPTION",
      status: {
        in: ["PENDING", "PROCESSING"],
      },
      createdAt: {
        lte: staleBefore,
      },
      gatewaySessionId: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: MAX_BATCH,
  });

  let forwarded = 0;
  let errors = 0;

  for (const entry of stalePayments) {
    const checkoutRequestId = String(entry.gatewaySessionId || "").trim();
    if (!checkoutRequestId) {
      continue;
    }

    const apiRef = extractApiRefFromProviderRef(entry.providerRef);
    const merchantRequestId =
      String(entry.gatewayReference || "").trim() || null;

    try {
      const snapshot = await verifyDarajaPayment({
        checkoutRequestId,
        expectedApiRef: apiRef,
        expectedAmount: Number(entry.amount),
        expectedCurrency: entry.currency || "KES",
        requireApiRefMatch: false,
        requireAmountMatch: false,
        requireCurrencyMatch: false,
      });

      const providerState = snapshot.providerState;
      const shouldForwardSettled = providerState === "SETTLED";
      const shouldForwardTerminal = [
        "FAILED",
        "CANCELLED",
        "REVERSED",
      ].includes(providerState);

      if (!shouldForwardSettled && !shouldForwardTerminal) {
        continue;
      }

      const payload: DarajaWebhookPayload = {
        CheckoutRequestID: checkoutRequestId,
        MerchantRequestID: merchantRequestId || checkoutRequestId,
        ResultCode: mapResultCode(providerState),
        ResultDesc: providerState,
        api_ref: apiRef,
        Amount: snapshot.amount ?? Number(entry.amount),
        id: merchantRequestId || checkoutRequestId,
        provider: "STALE_PENDING_RECONCILIATION",
      };

      await handleSubscriptionWebhook(
        buildSyntheticWebhookRequest(
          requestUrl,
          "/api/subscription/webhook",
          payload,
        ),
      );
      forwarded += 1;
    } catch (error) {
      errors += 1;
      console.warn(
        "[DARAJA_RECONCILE_CRON] subscription payment reconciliation failed",
        {
          transactionId: entry.id,
          providerRef: entry.providerRef,
          error,
        },
      );
    }
  }

  return {
    scanned: stalePayments.length,
    forwarded,
    errors,
  };
}

async function runReconciliation(request: Request) {
  const secretAuthorized = hasSecretAccess(request);
  if (!secretAuthorized) {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const url = new URL(request.url);
  const requestedMinutes = Number(url.searchParams.get("staleMinutes") || "5");
  const staleMinutes =
    Number.isFinite(requestedMinutes) && requestedMinutes >= 2
      ? Math.min(requestedMinutes, 240)
      : 5;
  const staleBefore = new Date(Date.now() - staleMinutes * 60 * 1000);

  const [wallet, onboarding, subscription] = await Promise.all([
    reconcileWalletTopups(request.url, staleBefore),
    reconcileOnboardingPayments(request.url, staleBefore),
    reconcileSubscriptionPayments(request.url, staleBefore),
  ]);

  return NextResponse.json({
    success: true,
    staleMinutes,
    staleBefore,
    results: {
      wallet,
      onboarding,
      subscription,
    },
    summary: {
      scanned: wallet.scanned + onboarding.scanned + subscription.scanned,
      forwarded:
        wallet.forwarded + onboarding.forwarded + subscription.forwarded,
      errors: wallet.errors + onboarding.errors + subscription.errors,
    },
  });
}

export async function GET(request: Request) {
  try {
    return await runReconciliation(request);
  } catch (error) {
    console.error("[DARAJA_RECONCILE_CRON_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await runReconciliation(request);
  } catch (error) {
    console.error("[DARAJA_RECONCILE_CRON_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
