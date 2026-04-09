import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { verifyDarajaPayment } from "@/lib/daraja";
import prisma from "@/lib/prisma";
import { DarajaWebhookPayload } from "@/lib/daraja-webhook";
import { POST as handleOnboardingWebhook } from "@/app/api/onboarding-fee/webhook/route";

const TERMINAL_STATES = new Set(["SETTLED", "FAILED", "CANCELLED", "REVERSED"]);

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
              requireApiRefMatch: Boolean(resolvedApiRef),
              requireAmountMatch: false,
            });

            const providerState = snapshot.providerState;
            const shouldForwardSettled =
              providerState === "SETTLED" && snapshot.apiRefMatches;
            const shouldForwardTerminal =
              TERMINAL_STATES.has(providerState) && snapshot.apiRefMatches;

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

    return NextResponse.json({
      hasPaidOnboardingFee: Boolean(profile?.hasPaidOnboardingFee),
      onboardingFeeWaived: Boolean(profile?.onboardingFeeWaived),
      verificationStatus: profile?.verificationStatus || "PENDING",
      isSettled,
      pendingPayment,
    });
  } catch (error) {
    console.error("[ONBOARDING_FEE_STATUS]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
