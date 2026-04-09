import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { verifyDarajaPayment } from "@/lib/daraja";
import prisma from "@/lib/prisma";
import { DarajaWebhookPayload } from "@/lib/daraja-webhook";
import { POST as handleOnboardingWebhook } from "@/app/api/onboarding-fee/webhook/route";

const TERMINAL_STATES = new Set(["SETTLED", "FAILED", "CANCELLED", "REVERSED"]);

type CanonicalPaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "CANCELLED"
  | "REVERSED";

function normalizeParam(value: string | null): string | null {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : null;
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

function toCanonicalPaymentStatus(
  value: string | null | undefined,
): CanonicalPaymentStatus | null {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (
    normalized === "PENDING" ||
    normalized === "PROCESSING" ||
    normalized === "SETTLED" ||
    normalized === "FAILED" ||
    normalized === "CANCELLED" ||
    normalized === "REVERSED"
  ) {
    return normalized;
  }

  return null;
}

function buildSyntheticWebhookRequest(
  requestUrl: string,
  payload: DarajaWebhookPayload,
): Request {
  const origin = new URL(requestUrl).origin;
  const webhookUrl = new URL("/api/onboarding-fee/webhook", origin);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const apiRef = normalizeParam(
      searchParams.get("apiRef") || searchParams.get("api_ref"),
    );
    const checkoutRequestId = normalizeParam(
      searchParams.get("checkoutId") ||
        searchParams.get("checkout_id") ||
        searchParams.get("sessionId"),
    );

    let profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        hasPaidOnboardingFee: true,
        onboardingFeeWaived: true,
        verificationStatus: true,
      },
    });

    const hasPaidOnboardingFee = Boolean(profile?.hasPaidOnboardingFee);
    const onboardingFeeWaived = Boolean(profile?.onboardingFeeWaived);
    let isSettled = hasPaidOnboardingFee || onboardingFeeWaived;

    let pendingPayment: {
      status: string;
      apiRef: string | null;
      checkoutRequestId: string | null;
      merchantRequestId: string | null;
      failureReason: string | null;
    } | null = null;

    if (!isSettled) {
      const pendingCandidates = await prisma.transaction.findMany({
        where: {
          type: "ONBOARDING_FEE",
          status: {
            in: ["PENDING", "PROCESSING"],
          },
          wallet: {
            userId: session.user.id,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      const pending =
        pendingCandidates.find((entry) => {
          const entryApiRef = extractApiRefFromProviderRef(entry.providerRef);
          if (apiRef && entryApiRef !== apiRef) {
            return false;
          }

          if (
            checkoutRequestId &&
            entry.gatewaySessionId !== checkoutRequestId
          ) {
            return false;
          }

          return true;
        }) ||
        pendingCandidates[0] ||
        null;

      if (pending) {
        const resolvedApiRef =
          apiRef || extractApiRefFromProviderRef(pending.providerRef);
        const resolvedCheckoutRequestId =
          checkoutRequestId || normalizeParam(pending.gatewaySessionId);
        const resolvedMerchantRequestId = normalizeParam(
          pending.gatewayReference,
        );

        pendingPayment = {
          status: pending.status,
          apiRef: resolvedApiRef,
          checkoutRequestId: resolvedCheckoutRequestId,
          merchantRequestId: resolvedMerchantRequestId,
          failureReason: pending.failureReason,
        };

        if (resolvedCheckoutRequestId) {
          try {
            const snapshot = await verifyDarajaPayment({
              checkoutRequestId: resolvedCheckoutRequestId,
              expectedApiRef: resolvedApiRef,
              expectedAmount: Number(pending.amount),
              expectedCurrency: pending.currency || "KES",
              requireApiRefMatch: false,
              requireAmountMatch: false,
              requireCurrencyMatch: false,
            });

            const providerState = snapshot.providerState;
            const shouldForwardSettled = providerState === "SETTLED";
            const shouldForwardTerminal = TERMINAL_STATES.has(providerState);

            if (shouldForwardSettled || shouldForwardTerminal) {
              const syntheticPayload: DarajaWebhookPayload = {
                CheckoutRequestID: resolvedCheckoutRequestId,
                MerchantRequestID:
                  resolvedMerchantRequestId || resolvedCheckoutRequestId,
                ResultCode: mapResultCode(providerState),
                ResultDesc: snapshot.providerState || "PROCESSING",
                api_ref: resolvedApiRef,
                Amount: snapshot.amount ?? Number(pending.amount),
                id: resolvedMerchantRequestId || resolvedCheckoutRequestId,
                provider: "STATUS_RECOVERY_RECONCILIATION",
              };

              await handleOnboardingWebhook(
                buildSyntheticWebhookRequest(req.url, syntheticPayload),
              );

              profile = await prisma.profile.findUnique({
                where: { userId: session.user.id },
                select: {
                  hasPaidOnboardingFee: true,
                  onboardingFeeWaived: true,
                  verificationStatus: true,
                },
              });

              isSettled =
                Boolean(profile?.hasPaidOnboardingFee) ||
                Boolean(profile?.onboardingFeeWaived);
            }
          } catch (error) {
            console.warn(
              "[ONBOARDING_FEE_STATUS] reconciliation attempt failed",
              error,
            );
          }
        }
      }
    }

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        type: "ONBOARDING_FEE",
        wallet: {
          userId: session.user.id,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        status: true,
        providerRef: true,
        gatewaySessionId: true,
        gatewayReference: true,
        failureReason: true,
        amount: true,
        currency: true,
      },
    });

    const matchedTransaction =
      recentTransactions.find((entry) => {
        const entryApiRef = extractApiRefFromProviderRef(entry.providerRef);
        if (apiRef && entryApiRef !== apiRef) {
          return false;
        }

        if (
          checkoutRequestId &&
          normalizeParam(entry.gatewaySessionId) !== checkoutRequestId
        ) {
          return false;
        }

        return true;
      }) ||
      recentTransactions[0] ||
      null;

    const resolvedApiRef =
      apiRef ||
      extractApiRefFromProviderRef(matchedTransaction?.providerRef || null) ||
      pendingPayment?.apiRef ||
      null;
    const resolvedCheckoutRequestId =
      checkoutRequestId ||
      normalizeParam(matchedTransaction?.gatewaySessionId || null) ||
      pendingPayment?.checkoutRequestId ||
      null;
    const resolvedMerchantRequestId =
      normalizeParam(matchedTransaction?.gatewayReference || null) ||
      pendingPayment?.merchantRequestId ||
      null;

    const statusFromTransaction = toCanonicalPaymentStatus(
      matchedTransaction?.status,
    );
    const pendingStatus = toCanonicalPaymentStatus(pendingPayment?.status);

    const paymentStatus: CanonicalPaymentStatus = isSettled
      ? "SETTLED"
      : statusFromTransaction || pendingStatus || "PENDING";
    const isTerminal = TERMINAL_STATES.has(paymentStatus);

    const canonicalPendingPayment = !isTerminal
      ? {
          status: paymentStatus,
          apiRef: resolvedApiRef,
          checkoutRequestId: resolvedCheckoutRequestId,
          merchantRequestId: resolvedMerchantRequestId,
          failureReason:
            matchedTransaction?.failureReason ||
            pendingPayment?.failureReason ||
            null,
        }
      : null;

    const failureReason =
      matchedTransaction?.failureReason ||
      pendingPayment?.failureReason ||
      null;

    return NextResponse.json({
      hasPaidOnboardingFee: Boolean(profile?.hasPaidOnboardingFee),
      onboardingFeeWaived: Boolean(profile?.onboardingFeeWaived),
      verificationStatus: profile?.verificationStatus || "PENDING",
      isSettled,
      pendingPayment: canonicalPendingPayment,
      paymentStatus,
      isTerminal,
      apiRef: resolvedApiRef,
      checkoutRequestId: resolvedCheckoutRequestId,
      merchantRequestId: resolvedMerchantRequestId,
      failureReason,
      amountExpected: matchedTransaction?.amount || null,
      amountReceived:
        paymentStatus === "SETTLED" ? matchedTransaction?.amount || null : null,
      currency: matchedTransaction?.currency || "KES",
    });
  } catch (error) {
    console.error("[ONBOARDING_FEE_STATUS]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
