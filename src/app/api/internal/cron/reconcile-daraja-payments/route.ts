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
const MAX_FAILURE_SAMPLES = 20;
const MAX_REASON_LENGTH = 220;
const DEFAULT_AUTO_FAIL_NOT_FOUND_MINUTES = 180;
const NOT_FOUND_PROVIDER_REASON = "the transaction does not exist";

interface ReconciliationFailureSample {
  recordId: string;
  checkoutRequestId: string;
  reason: string;
}

interface ReconciliationResult {
  scanned: number;
  forwarded: number;
  errors: number;
  autoFailed: number;
  failureReasons: Record<string, number>;
  failureSamples: ReconciliationFailureSample[];
}

function normalizeErrorReason(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.replace(/\s+/g, " ").trim();
    return (message || "unknown_error").slice(0, MAX_REASON_LENGTH);
  }

  if (typeof error === "string") {
    const message = error.replace(/\s+/g, " ").trim();
    return (message || "unknown_error").slice(0, MAX_REASON_LENGTH);
  }

  try {
    const message = JSON.stringify(error) || "unknown_error";
    return message.slice(0, MAX_REASON_LENGTH);
  } catch {
    return "unknown_error";
  }
}

function recordFailure(
  reasonCounts: Record<string, number>,
  samples: ReconciliationFailureSample[],
  sample: ReconciliationFailureSample,
) {
  reasonCounts[sample.reason] = (reasonCounts[sample.reason] || 0) + 1;

  if (samples.length < MAX_FAILURE_SAMPLES) {
    samples.push(sample);
  }
}

function mergeFailureReasons(
  target: Record<string, number>,
  source: Record<string, number>,
) {
  for (const [reason, count] of Object.entries(source)) {
    target[reason] = (target[reason] || 0) + count;
  }
}

function getAutoFailNotFoundMinutes(): number {
  const raw = Number(
    String(
      process.env.DARAJA_RECONCILE_NOT_FOUND_AUTO_FAIL_MINUTES ||
        DEFAULT_AUTO_FAIL_NOT_FOUND_MINUTES,
    ).trim(),
  );

  if (!Number.isFinite(raw)) {
    return DEFAULT_AUTO_FAIL_NOT_FOUND_MINUTES;
  }

  return Math.max(0, Math.min(Math.trunc(raw), 10_080));
}

function isExactTransactionNotFoundReason(reason: string): boolean {
  const normalized = reason
    .toLowerCase()
    .trim()
    .replace(/[.!?\s]+$/g, "");

  return normalized === NOT_FOUND_PROVIDER_REASON;
}

function isOlderThanMinutes(timestamp: Date, minutes: number): boolean {
  if (minutes <= 0) {
    return false;
  }

  return Date.now() - timestamp.getTime() >= minutes * 60 * 1000;
}

async function didForwardSuccessfully(response: Response): Promise<boolean> {
  if (!response.ok) {
    return false;
  }

  const text = await response.text().catch(() => "");
  if (!text) {
    return true;
  }

  try {
    const payload = JSON.parse(text) as {
      skipped?: boolean;
      success?: boolean;
    };

    if (payload?.skipped) {
      return false;
    }

    if (typeof payload?.success === "boolean") {
      return payload.success;
    }

    return true;
  } catch {
    return true;
  }
}

function hasSecretAccess(request: Request): boolean {
  const expectedSecret = String(
    process.env.DARAJA_RECONCILE_CRON_SECRET || "",
  ).trim();

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

async function reconcileWalletTopups(
  requestUrl: string,
  staleBefore: Date,
  autoFailNotFoundMinutes: number,
): Promise<ReconciliationResult> {
  const staleTopUps = await prisma.walletTopUp.findMany({
    where: {
      gateway: "DARAJA",
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
  let autoFailed = 0;
  const failureReasons: Record<string, number> = {};
  const failureSamples: ReconciliationFailureSample[] = [];

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
      const reason = normalizeErrorReason(error);

      const canAutoFail =
        isExactTransactionNotFoundReason(reason) &&
        isOlderThanMinutes(topUp.initiatedAt, autoFailNotFoundMinutes);

      if (canAutoFail) {
        const autoFailPayload: DarajaWebhookPayload = {
          CheckoutRequestID: checkoutRequestId,
          MerchantRequestID:
            String(
              topUp.gatewayInvoiceId || topUp.gatewaySessionId || "",
            ).trim() || checkoutRequestId,
          ResultCode: 1,
          ResultDesc: "FAILED",
          api_ref: topUp.apiRef,
          Amount: Number(topUp.amountExpected),
          id:
            String(
              topUp.gatewayInvoiceId || topUp.gatewaySessionId || "",
            ).trim() || checkoutRequestId,
          provider: "STALE_PENDING_AUTO_FAIL_NOT_FOUND",
        };

        const autoFailResponse = await handleWalletWebhook(
          buildSyntheticWebhookRequest(
            requestUrl,
            "/api/wallet/webhook",
            autoFailPayload,
          ),
        );

        const autoFailForwarded = await didForwardSuccessfully(
          autoFailResponse,
        );

        if (autoFailForwarded) {
          forwarded += 1;
          autoFailed += 1;
          console.warn(
            "[DARAJA_RECONCILE_CRON] wallet top-up auto-failed after age gate",
            {
              topUpId: topUp.id,
              apiRef: topUp.apiRef,
              checkoutRequestId,
              ageMinutes: Math.floor(
                (Date.now() - topUp.initiatedAt.getTime()) / 60_000,
              ),
              autoFailNotFoundMinutes,
            },
          );
          continue;
        }
      }

      errors += 1;
      recordFailure(failureReasons, failureSamples, {
        recordId: topUp.id,
        checkoutRequestId,
        reason,
      });
      console.warn(
        "[DARAJA_RECONCILE_CRON] wallet top-up reconciliation failed",
        {
          topUpId: topUp.id,
          apiRef: topUp.apiRef,
          reason,
        },
      );
    }
  }

  return {
    scanned: staleTopUps.length,
    forwarded,
    errors,
    autoFailed,
    failureReasons,
    failureSamples,
  };
}

async function reconcileOnboardingPayments(
  requestUrl: string,
  staleBefore: Date,
  autoFailNotFoundMinutes: number,
): Promise<ReconciliationResult> {
  const stalePayments = await prisma.transaction.findMany({
    where: {
      type: "ONBOARDING_FEE",
      gateway: "DARAJA",
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
  let autoFailed = 0;
  const failureReasons: Record<string, number> = {};
  const failureSamples: ReconciliationFailureSample[] = [];

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
      const reason = normalizeErrorReason(error);

      const canAutoFail =
        isExactTransactionNotFoundReason(reason) &&
        isOlderThanMinutes(entry.createdAt, autoFailNotFoundMinutes);

      if (canAutoFail) {
        const autoFailPayload: DarajaWebhookPayload = {
          CheckoutRequestID: checkoutRequestId,
          MerchantRequestID: merchantRequestId || checkoutRequestId,
          ResultCode: 1,
          ResultDesc: "FAILED",
          api_ref: apiRef,
          Amount: Number(entry.amount),
          id: merchantRequestId || checkoutRequestId,
          provider: "STALE_PENDING_AUTO_FAIL_NOT_FOUND",
        };

        const autoFailResponse = await handleOnboardingWebhook(
          buildSyntheticWebhookRequest(
            requestUrl,
            "/api/onboarding-fee/webhook",
            autoFailPayload,
          ),
        );

        const autoFailForwarded = await didForwardSuccessfully(
          autoFailResponse,
        );

        if (autoFailForwarded) {
          forwarded += 1;
          autoFailed += 1;
          console.warn(
            "[DARAJA_RECONCILE_CRON] onboarding payment auto-failed after age gate",
            {
              transactionId: entry.id,
              checkoutRequestId,
              ageMinutes: Math.floor(
                (Date.now() - entry.createdAt.getTime()) / 60_000,
              ),
              autoFailNotFoundMinutes,
            },
          );
          continue;
        }
      }

      errors += 1;
      recordFailure(failureReasons, failureSamples, {
        recordId: entry.id,
        checkoutRequestId,
        reason,
      });
      console.warn(
        "[DARAJA_RECONCILE_CRON] onboarding payment reconciliation failed",
        {
          transactionId: entry.id,
          providerRef: entry.providerRef,
          reason,
        },
      );
    }
  }

  return {
    scanned: stalePayments.length,
    forwarded,
    errors,
    autoFailed,
    failureReasons,
    failureSamples,
  };
}

async function reconcileSubscriptionPayments(
  requestUrl: string,
  staleBefore: Date,
  autoFailNotFoundMinutes: number,
): Promise<ReconciliationResult> {
  const stalePayments = await prisma.transaction.findMany({
    where: {
      type: "PAYMENT",
      category: "SUBSCRIPTION",
      gateway: "DARAJA",
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
  let autoFailed = 0;
  const failureReasons: Record<string, number> = {};
  const failureSamples: ReconciliationFailureSample[] = [];

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
      const reason = normalizeErrorReason(error);

      const canAutoFail =
        isExactTransactionNotFoundReason(reason) &&
        isOlderThanMinutes(entry.createdAt, autoFailNotFoundMinutes);

      if (canAutoFail) {
        const autoFailPayload: DarajaWebhookPayload = {
          CheckoutRequestID: checkoutRequestId,
          MerchantRequestID: merchantRequestId || checkoutRequestId,
          ResultCode: 1,
          ResultDesc: "FAILED",
          api_ref: apiRef,
          Amount: Number(entry.amount),
          id: merchantRequestId || checkoutRequestId,
          provider: "STALE_PENDING_AUTO_FAIL_NOT_FOUND",
        };

        const autoFailResponse = await handleSubscriptionWebhook(
          buildSyntheticWebhookRequest(
            requestUrl,
            "/api/subscription/webhook",
            autoFailPayload,
          ),
        );

        const autoFailForwarded = await didForwardSuccessfully(
          autoFailResponse,
        );

        if (autoFailForwarded) {
          forwarded += 1;
          autoFailed += 1;
          console.warn(
            "[DARAJA_RECONCILE_CRON] subscription payment auto-failed after age gate",
            {
              transactionId: entry.id,
              checkoutRequestId,
              ageMinutes: Math.floor(
                (Date.now() - entry.createdAt.getTime()) / 60_000,
              ),
              autoFailNotFoundMinutes,
            },
          );
          continue;
        }
      }

      errors += 1;
      recordFailure(failureReasons, failureSamples, {
        recordId: entry.id,
        checkoutRequestId,
        reason,
      });
      console.warn(
        "[DARAJA_RECONCILE_CRON] subscription payment reconciliation failed",
        {
          transactionId: entry.id,
          providerRef: entry.providerRef,
          reason,
        },
      );
    }
  }

  return {
    scanned: stalePayments.length,
    forwarded,
    errors,
    autoFailed,
    failureReasons,
    failureSamples,
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
  const requestedMinutes = Number(url.searchParams.get("staleMinutes") || "1");
  const staleMinutes =
    Number.isFinite(requestedMinutes) && requestedMinutes >= 1
      ? Math.min(requestedMinutes, 240)
      : 1;
  const autoFailNotFoundMinutes = getAutoFailNotFoundMinutes();
  const staleBefore = new Date(Date.now() - staleMinutes * 60 * 1000);

  const [wallet, onboarding, subscription] = await Promise.all([
    reconcileWalletTopups(request.url, staleBefore, autoFailNotFoundMinutes),
    reconcileOnboardingPayments(
      request.url,
      staleBefore,
      autoFailNotFoundMinutes,
    ),
    reconcileSubscriptionPayments(
      request.url,
      staleBefore,
      autoFailNotFoundMinutes,
    ),
  ]);

  const failureReasons: Record<string, number> = {};
  mergeFailureReasons(failureReasons, wallet.failureReasons);
  mergeFailureReasons(failureReasons, onboarding.failureReasons);
  mergeFailureReasons(failureReasons, subscription.failureReasons);

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
      autoFailed: wallet.autoFailed + onboarding.autoFailed + subscription.autoFailed,
      failureReasons,
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
