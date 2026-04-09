import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionActivationEmail } from "@/lib/email";
import {
  evaluateDarajaCallbackIp,
  evaluateDarajaCallbackToken,
  getDarajaCallbackTokenFromRequest,
  verifyDarajaPayment,
  verifyWebhookChallenge,
} from "@/lib/daraja";
import { Prisma, SubscriptionPlan } from "@/generated/prisma/client";
import { DarajaWebhookPayload, parseDarajaWebhook } from "@/lib/daraja-webhook";
import {
  buildPaymentWebhookDedupeKey,
  recordPaymentWebhookReceipt,
  updateSubscriptionPaymentIntentFromWebhook,
} from "@/lib/payments/payment-intents";
import { POST as handleWalletWebhook } from "@/app/api/wallet/webhook/route";
import { POST as handleOnboardingWebhook } from "@/app/api/onboarding-fee/webhook/route";

function buildDelegatedWebhookRequest(
  req: NextRequest,
  rawBody: string,
): Request {
  return new Request(req.url, {
    method: "POST",
    headers: new Headers(req.headers),
    body: rawBody,
  });
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return true;
}

function isChallengeOnlyPayload(payload: DarajaWebhookPayload): boolean {
  const challenge = payload.challenge;
  if (typeof challenge !== "string" || challenge.trim().length === 0) {
    return false;
  }

  const directPaymentFields = [
    payload.state,
    payload.status,
    payload.api_ref,
    payload.request_reference_id,
    payload.reference_id,
    payload.reference,
    payload.tracking_id,
    payload.invoice_id,
    payload.id,
    payload.value,
  ];

  if (directPaymentFields.some(hasMeaningfulValue)) {
    return false;
  }

  const invoice =
    payload.invoice &&
    typeof payload.invoice === "object" &&
    !Array.isArray(payload.invoice)
      ? (payload.invoice as Record<string, unknown>)
      : null;

  if (
    invoice &&
    [
      invoice.state,
      invoice.status,
      invoice.api_ref,
      invoice.invoice_id,
      invoice.id,
      invoice.value,
    ].some(hasMeaningfulValue)
  ) {
    return false;
  }

  return true;
}

function parseSubscriptionRef(apiRef: string) {
  const normalized = String(apiRef || "").trim();
  if (!normalized) {
    return {
      userId: null as string | null,
      plan: null as SubscriptionPlan | null,
    };
  }

  // New format: SUB-PLAN-userid-timestamp
  const hyphenParts = normalized.split("-");
  if (hyphenParts.length >= 4 && hyphenParts[0] === "SUB") {
    const possiblePlan = hyphenParts[1]?.toUpperCase();
    const possibleUserId = hyphenParts[2];
    if (
      possibleUserId &&
      (possiblePlan === "PRO" || possiblePlan === "BUSINESS")
    ) {
      return {
        userId: possibleUserId,
        plan: possiblePlan as SubscriptionPlan,
      };
    }
  }

  // Legacy format: SUB_userid_PLAN_timestamp
  const underscoreParts = normalized.split("_");
  if (underscoreParts.length >= 4 && underscoreParts[0] === "SUB") {
    const possibleUserId = underscoreParts[1];
    const possiblePlan = underscoreParts[2]?.toUpperCase();
    if (
      possibleUserId &&
      (possiblePlan === "PRO" || possiblePlan === "BUSINESS")
    ) {
      return {
        userId: possibleUserId,
        plan: possiblePlan as SubscriptionPlan,
      };
    }
  }

  return {
    userId: null as string | null,
    plan: null as SubscriptionPlan | null,
  };
}

function providerStatesForTerminalState(state: string): string[] {
  switch (state) {
    case "FAILED":
      return [
        "FAILED",
        "FAIL",
        "DECLINED",
        "REJECTED",
        "EXPIRED",
        "TIMED_OUT",
        "TIMEOUT",
        "ABANDONED",
      ];
    case "CANCELLED":
      return ["CANCELLED", "CANCELED", "VOID", "VOIDED", "ABANDONED"];
    case "REVERSED":
      return ["REVERSED", "REFUNDED", "CHARGEBACK", "CHARGED_BACK"];
    default:
      return ["COMPLETE", "COMPLETED", "SUCCESS", "SUCCEEDED", "PAID"];
  }
}

function extractApiRefFromProviderRef(
  value: string | null | undefined,
): string {
  const providerRef = String(value || "").trim();
  if (!providerRef) {
    return "";
  }

  const index = providerRef.lastIndexOf(":");
  if (index === -1 || index === providerRef.length - 1) {
    return "";
  }

  return providerRef.slice(index + 1).trim();
}

function extractApiRefFromMetadata(
  metadata: Prisma.JsonValue | null | undefined,
): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }

  const candidate = (metadata as Record<string, unknown>).apiRef;
  return typeof candidate === "string" ? candidate.trim() : "";
}

function isTrustedInternalProcessingRequest(request: Request): boolean {
  const requestedMode = String(
    request.headers.get("x-daraja-internal-process") || "",
  ).trim();
  if (requestedMode !== "1") {
    return false;
  }

  const expectedSecret = String(
    process.env.DARAJA_RECONCILE_CRON_SECRET || "",
  ).trim();
  const receivedSecret = String(
    request.headers.get("x-daraja-internal-secret") || "",
  ).trim();

  return expectedSecret.length > 0 && receivedSecret === expectedSecret;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as DarajaWebhookPayload;
    const internalProcessing = isTrustedInternalProcessingRequest(req);
    const queueEnabled =
      String(process.env.DARAJA_RECONCILE_CRON_SECRET || "").trim().length > 0;
    const challenge =
      typeof body.challenge === "string" ? body.challenge.trim() : "";

    if (!internalProcessing && isChallengeOnlyPayload(body)) {
      if (verifyWebhookChallenge(challenge)) {
        return NextResponse.json({ challenge });
      }

      return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
    }

    const previewWebhook = parseDarajaWebhook(body);
    const previewRef = String(
      previewWebhook.apiRef || previewWebhook.primaryReference || "",
    )
      .trim()
      .toUpperCase();

    if (previewRef.startsWith("TOPUP-")) {
      console.warn(
        "[SUBSCRIPTION_WEBHOOK] Delegating TOPUP collection payload to wallet webhook handler",
      );
      return handleWalletWebhook(buildDelegatedWebhookRequest(req, rawBody));
    }

    if (previewRef.startsWith("ONBOARD-")) {
      console.warn(
        "[SUBSCRIPTION_WEBHOOK] Delegating ONBOARDING collection payload to onboarding webhook handler",
      );
      return handleOnboardingWebhook(
        buildDelegatedWebhookRequest(req, rawBody),
      );
    }

    const callbackToken =
      getDarajaCallbackTokenFromRequest(req.url) ||
      req.headers.get("x-daraja-callback-token") ||
      req.headers.get("x-callback-token");
    const signatureEvaluation = internalProcessing
      ? {
          valid: true,
          enforceSignature: false,
          shouldReject: false,
        }
      : evaluateDarajaCallbackToken(callbackToken);
    if (!internalProcessing && signatureEvaluation.shouldReject) {
      console.error("Invalid Daraja callback token");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    const ipEvaluation = internalProcessing
      ? {
          valid: true,
          enforceIp: false,
          shouldReject: false,
          requestIp: null,
          allowedIps: [] as string[],
        }
      : evaluateDarajaCallbackIp(req);
    if (!internalProcessing && ipEvaluation.shouldReject) {
      return NextResponse.json(
        { error: "Unauthorized callback IP" },
        { status: 401 },
      );
    }

    if (!internalProcessing && !signatureEvaluation.valid) {
      console.warn(
        "[SUBSCRIPTION_WEBHOOK] Signature missing/invalid; continuing with challenge + provider verification flow",
      );
    }

    if (
      !internalProcessing &&
      !ipEvaluation.valid &&
      ipEvaluation.allowedIps.length > 0
    ) {
      console.warn(
        "[SUBSCRIPTION_WEBHOOK] Callback IP is not in allowlist; continuing because enforcement is disabled",
      );
    }

    // Log webhook for debugging
    console.log("=== Daraja Subscription Webhook Received ===");
    console.log("Payload:", JSON.stringify(body, null, 2));

    const webhook = previewWebhook;
    const checkoutRequestId = String(
      webhook.checkoutRequestId || webhook.invoiceId || "",
    ).trim();
    const merchantRequestId = String(
      webhook.merchantRequestId || webhook.sessionId || "",
    ).trim();

    let canonicalRef = "";

    if (checkoutRequestId) {
      const matchedByCheckout = await prisma.transaction.findFirst({
        where: {
          type: "PAYMENT",
          category: "SUBSCRIPTION",
          OR: [
            { gatewaySessionId: checkoutRequestId },
            {
              gatewayReference:
                merchantRequestId.length > 0
                  ? merchantRequestId
                  : checkoutRequestId,
            },
          ],
        },
        select: {
          providerRef: true,
          metadata: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      canonicalRef =
        extractApiRefFromProviderRef(matchedByCheckout?.providerRef) ||
        extractApiRefFromMetadata(matchedByCheckout?.metadata);
    }

    if (!canonicalRef) {
      canonicalRef = String(webhook.apiRef || "").trim();
    }

    if (!canonicalRef) {
      canonicalRef = String(webhook.primaryReference || "").trim();
    }

    const gatewayState = webhook.state;
    const isTerminalState = [
      "SETTLED",
      "FAILED",
      "CANCELLED",
      "REVERSED",
    ].includes(gatewayState);
    const queueOnly = queueEnabled && !internalProcessing && !isTerminalState;
    const invoiceId = checkoutRequestId || null;
    const pendingProviderRef = `DARAJA:SUBSCRIPTION:PENDING:${canonicalRef}`;
    const settledProviderRef = `DARAJA:SUBSCRIPTION:SETTLED:${canonicalRef}`;

    if (!canonicalRef) {
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        skipped: true,
        reason: "missing_api_ref",
        invoiceId: invoiceId ? String(invoiceId) : null,
      });
    }

    const dedupeKey = buildPaymentWebhookDedupeKey({
      kind: "SUBSCRIPTION",
      apiRef: canonicalRef,
      invoiceId: invoiceId ? String(invoiceId) : null,
      rawState: webhook.rawState,
      state: gatewayState,
    });

    const receiptIdFromHeader = String(
      req.headers.get("x-payment-webhook-receipt-id") || "",
    ).trim();
    const shouldCreateReceipt = !internalProcessing || !receiptIdFromHeader;

    const webhookReceipt = shouldCreateReceipt
      ? await prisma.$transaction(async (tx) => {
          return recordPaymentWebhookReceipt(tx, {
            kind: "SUBSCRIPTION",
            apiRef: canonicalRef,
            invoiceId: invoiceId ? String(invoiceId) : null,
            rawState: webhook.rawState,
            dedupeKey,
            payload: body,
            rawBody,
          });
        })
      : {
          id: receiptIdFromHeader,
          duplicate: false,
          schemaReady: true,
        };

    if (shouldCreateReceipt && webhookReceipt.duplicate) {
      return NextResponse.json({
        received: true,
        skipped: true,
        reason: "duplicate_webhook_receipt",
        state: gatewayState,
        dedupeKey,
      });
    }

    if (queueOnly) {
      return NextResponse.json({
        received: true,
        queued: true,
        reason: "webhook_queued_for_worker",
        state: gatewayState,
        dedupeKey,
        receiptId: webhookReceipt.id,
      });
    }

    const duplicateState = await prisma.transaction.findFirst({
      where: {
        type: "PAYMENT",
        providerRef: {
          in: [pendingProviderRef, settledProviderRef],
        },
        status: gatewayState,
        ...(merchantRequestId ? { gatewayReference: merchantRequestId } : {}),
        ...(checkoutRequestId ? { gatewaySessionId: checkoutRequestId } : {}),
      },
      select: {
        id: true,
      },
    });

    if (
      duplicateState &&
      ["SETTLED", "FAILED", "CANCELLED", "REVERSED"].includes(gatewayState)
    ) {
      return NextResponse.json({
        received: true,
        skipped: true,
        reason: "duplicate_webhook_state",
        state: gatewayState,
        transactionId: duplicateState.id,
      });
    }

    if (
      ["FAILED", "CANCELLED", "REVERSED"].includes(gatewayState) &&
      !signatureEvaluation.valid
    ) {
      if (!checkoutRequestId) {
        return NextResponse.json({
          received: true,
          skipped: true,
          requiresManualResolution: true,
          reason: "missing_checkout_request_id_for_terminal_verification",
          apiRef: canonicalRef,
          state: gatewayState,
        });
      }

      const terminalVerification = await verifyDarajaPayment({
        checkoutRequestId,
        expectedApiRef: canonicalRef,
        allowedProviderStates: providerStatesForTerminalState(gatewayState),
        requireAmountMatch: false,
        requireCurrencyMatch: false,
      });

      if (!terminalVerification.ok) {
        return NextResponse.json({
          received: true,
          skipped: true,
          requiresManualResolution: true,
          reason: "unverified_terminal_webhook_state",
          apiRef: canonicalRef,
          state: gatewayState,
          verification: {
            providerState: terminalVerification.providerState,
            apiRefMatches: terminalVerification.apiRefMatches,
            amountMatches: terminalVerification.amountMatches,
            currencyMatches: terminalVerification.currencyMatches,
          },
        });
      }
    }

    // Persist intermediate/failed/cancelled states to avoid stale pending entries.
    if (gatewayState !== "SETTLED") {
      const { updatedCount, skippedCount } = await prisma.$transaction(
        async (tx) => {
          const candidates = await tx.transaction.findMany({
            where: {
              type: "PAYMENT",
              providerRef: {
                in: [pendingProviderRef, settledProviderRef],
              },
            },
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              walletId: true,
              providerRef: true,
              wallet: {
                select: {
                  userId: true,
                },
              },
            },
          });

          const now = new Date();
          let updatedCount = 0;
          let skippedCount = 0;

          for (const entry of candidates) {
            if (
              entry.status === "SETTLED" &&
              !["SETTLED", "REVERSED"].includes(gatewayState)
            ) {
              skippedCount += 1;
              continue;
            }

            const failureReason =
              gatewayState === "FAILED" ||
              gatewayState === "CANCELLED" ||
              gatewayState === "REVERSED"
                ? webhook.failureReason ||
                  (gatewayState === "REVERSED"
                    ? "Gateway reversal"
                    : `Gateway state: ${webhook.rawState || gatewayState}`)
                : null;

            await tx.transaction.update({
              where: { id: entry.id },
              data: {
                status: gatewayState,
                failureReason,
                failedAt: gatewayState === "FAILED" ? now : null,
                cancelledAt: gatewayState === "CANCELLED" ? now : null,
                reversedAt: gatewayState === "REVERSED" ? now : null,
                createdByType: "WEBHOOK",
                gatewayReference: merchantRequestId || canonicalRef,
                gatewaySessionId: checkoutRequestId || null,
                metadata: {
                  apiRef: canonicalRef,
                  gatewayRawState: webhook.rawState,
                  gatewayState,
                  eventFamily: webhook.eventFamily,
                  invoiceId: invoiceId ? String(invoiceId) : null,
                } as Prisma.InputJsonValue,
              },
            });

            await updateSubscriptionPaymentIntentFromWebhook(tx, {
              userId: entry.wallet.userId,
              walletId: entry.walletId,
              sourceId: entry.id,
              apiRef: canonicalRef,
              amountExpected: Number(entry.amount),
              amountReceived: null,
              currency: entry.currency || "KES",
              gatewayState,
              gatewayInvoiceId: merchantRequestId || null,
              gatewaySessionId: checkoutRequestId || null,
              providerRef: entry.providerRef || pendingProviderRef,
              failureReason,
              payload: body as Prisma.InputJsonValue,
              metadata: {
                apiRef: canonicalRef,
                gatewayRawState: webhook.rawState,
                gatewayState,
                eventFamily: webhook.eventFamily,
                invoiceId: invoiceId ? String(invoiceId) : null,
              },
            });

            updatedCount += 1;
          }

          return { updatedCount, skippedCount };
        },
      );

      console.log(`Payment not settled. State: ${gatewayState}`);
      return NextResponse.json({
        message: "Payment not settled",
        state: gatewayState,
        updatedTransactions: updatedCount,
        skippedTransactions: skippedCount,
      });
    }

    const intentContext = await prisma.transaction.findFirst({
      where: {
        type: "PAYMENT",
        providerRef: {
          in: [pendingProviderRef, settledProviderRef],
        },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        walletId: true,
        providerRef: true,
        wallet: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rawMetadata = ((body.meta as unknown) || webhook.metadata || {}) as {
      userId?: string;
      plan?: string;
    };
    const metadata = {
      userId:
        typeof rawMetadata.userId === "string" ? rawMetadata.userId : undefined,
      plan: typeof rawMetadata.plan === "string" ? rawMetadata.plan : undefined,
    };
    const parsedApiRef = parseSubscriptionRef(canonicalRef);
    const pendingSubscription = await prisma.transaction.findFirst({
      where: {
        type: "PAYMENT",
        providerRef: pendingProviderRef,
      },
      include: {
        wallet: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!pendingSubscription) {
      if (intentContext) {
        await prisma.$transaction(async (tx) => {
          await updateSubscriptionPaymentIntentFromWebhook(tx, {
            userId: intentContext.wallet.userId,
            walletId: intentContext.walletId,
            sourceId: intentContext.id,
            apiRef: canonicalRef,
            amountExpected: Number(intentContext.amount),
            amountReceived: null,
            currency: intentContext.currency || "KES",
            gatewayState: "PROCESSING",
            gatewayInvoiceId: merchantRequestId || null,
            gatewaySessionId: checkoutRequestId || null,
            providerRef: intentContext.providerRef || pendingProviderRef,
            failureReason: "Missing pending provider reference",
            payload: body as Prisma.InputJsonValue,
            metadata: {
              reason: "missing_pending_provider_reference",
              apiRef: canonicalRef,
              invoiceId: invoiceId ? String(invoiceId) : null,
            },
          });
        });
      }

      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        skipped: true,
        reason: "missing_pending_provider_reference",
        apiRef: canonicalRef,
      });
    }

    const userId =
      metadata.userId ||
      parsedApiRef.userId ||
      pendingSubscription?.wallet.userId;
    const normalizedPlan = (metadata.plan || parsedApiRef.plan || "")
      .toString()
      .toUpperCase();
    const plan =
      normalizedPlan === "PRO" || normalizedPlan === "BUSINESS"
        ? (normalizedPlan as SubscriptionPlan)
        : null;

    if (!userId || !plan) {
      if (pendingSubscription) {
        await prisma.$transaction(async (tx) => {
          await updateSubscriptionPaymentIntentFromWebhook(tx, {
            userId: pendingSubscription.wallet.userId,
            walletId: pendingSubscription.walletId,
            sourceId: pendingSubscription.id,
            apiRef: canonicalRef,
            amountExpected: Number(pendingSubscription.amount),
            amountReceived: null,
            currency: pendingSubscription.currency || "KES",
            gatewayState: "PROCESSING",
            gatewayInvoiceId: merchantRequestId || null,
            gatewaySessionId: checkoutRequestId || null,
            providerRef: pendingSubscription.providerRef || pendingProviderRef,
            failureReason: "Missing userId or plan in webhook payload",
            payload: body as Prisma.InputJsonValue,
            metadata: {
              reason: "missing_user_or_plan",
              apiRef: canonicalRef,
              invoiceId: invoiceId ? String(invoiceId) : null,
            },
          });
        });
      }

      console.error("Missing userId or plan in webhook metadata:", metadata);
      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        error: "Missing userId or plan in webhook payload",
      });
    }

    console.log(`Processing subscription for user ${userId}, plan: ${plan}`);

    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      await prisma.$transaction(async (tx) => {
        await updateSubscriptionPaymentIntentFromWebhook(tx, {
          userId: pendingSubscription.wallet.userId,
          walletId: pendingSubscription.walletId,
          sourceId: pendingSubscription.id,
          apiRef: canonicalRef,
          amountExpected: Number(pendingSubscription.amount),
          amountReceived: null,
          currency: pendingSubscription.currency || "KES",
          gatewayState: "PROCESSING",
          gatewayInvoiceId: merchantRequestId || null,
          gatewaySessionId: checkoutRequestId || null,
          providerRef: pendingSubscription.providerRef || pendingProviderRef,
          failureReason: "User not found for subscription settlement",
          payload: body as Prisma.InputJsonValue,
          metadata: {
            reason: "missing_user_for_subscription_settlement",
            apiRef: canonicalRef,
            invoiceId: invoiceId ? String(invoiceId) : null,
          },
        });
      });

      console.error(`User not found: ${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!checkoutRequestId) {
      await prisma.$transaction(async (tx) => {
        await updateSubscriptionPaymentIntentFromWebhook(tx, {
          userId: pendingSubscription.wallet.userId,
          walletId: pendingSubscription.walletId,
          sourceId: pendingSubscription.id,
          apiRef: canonicalRef,
          amountExpected: Number(pendingSubscription.amount),
          amountReceived: null,
          currency: pendingSubscription.currency || "KES",
          gatewayState: "PROCESSING",
          gatewayInvoiceId: null,
          gatewaySessionId: null,
          providerRef: pendingSubscription.providerRef || pendingProviderRef,
          failureReason: "Waiting for verifiable checkoutRequestId",
          payload: body as Prisma.InputJsonValue,
          metadata: {
            reason: "missing_checkout_request_id_for_verification",
            apiRef: canonicalRef,
          },
        });
      });

      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        skipped: true,
        reason: "missing_checkout_request_id_for_verification",
        apiRef: canonicalRef,
      });
    }

    const expectedAmount = Number(pendingSubscription.amount || 0);
    let settledAmount = expectedAmount;
    let providerVerification: {
      providerState: string | null;
      apiRefMatches: boolean;
      amountMatches: boolean;
      currencyMatches: boolean;
    } | null = null;

    if (!internalProcessing) {
      const verification = await verifyDarajaPayment({
        checkoutRequestId,
        expectedApiRef: canonicalRef,
        expectedAmount,
        expectedCurrency: pendingSubscription.currency || "KES",
        requireApiRefMatch: false,
        requireAmountMatch: false,
        requireCurrencyMatch: false,
      });

      if (!verification.stateMatches) {
        await prisma.$transaction(async (tx) => {
          await updateSubscriptionPaymentIntentFromWebhook(tx, {
            userId: pendingSubscription.wallet.userId,
            walletId: pendingSubscription.walletId,
            sourceId: pendingSubscription.id,
            apiRef: canonicalRef,
            amountExpected: Number(pendingSubscription.amount),
            amountReceived: null,
            currency: pendingSubscription.currency || "KES",
            gatewayState: "PROCESSING",
            gatewayInvoiceId: merchantRequestId || null,
            gatewaySessionId: checkoutRequestId || null,
            providerRef: pendingSubscription.providerRef || pendingProviderRef,
            failureReason: "Provider status verification failed",
            payload: body as Prisma.InputJsonValue,
            metadata: {
              reason: "provider_status_verification_failed",
              providerState: verification.providerState,
              apiRefMatches: verification.apiRefMatches,
              amountMatches: verification.amountMatches,
              currencyMatches: verification.currencyMatches,
              apiRef: canonicalRef,
              invoiceId: String(invoiceId),
            },
          });
        });

        return NextResponse.json({
          received: true,
          skipped: true,
          requiresManualResolution: true,
          reason: "provider_status_verification_failed",
          apiRef: canonicalRef,
          verification: {
            providerState: verification.providerState,
            apiRefMatches: verification.apiRefMatches,
            amountMatches: verification.amountMatches,
            currencyMatches: verification.currencyMatches,
          },
        });
      }

      const settledAmountCandidate = Number(verification.amount);
      settledAmount =
        Number.isFinite(settledAmountCandidate) && settledAmountCandidate > 0
          ? settledAmountCandidate
          : expectedAmount;
      providerVerification = {
        providerState: verification.providerState,
        apiRefMatches: verification.apiRefMatches,
        amountMatches: verification.amountMatches,
        currencyMatches: verification.currencyMatches,
      };
    } else {
      const settledAmountCandidate = Number(webhook.amount);
      settledAmount =
        Number.isFinite(settledAmountCandidate) && settledAmountCandidate > 0
          ? settledAmountCandidate
          : expectedAmount;
      providerVerification = {
        providerState: "SETTLED",
        apiRefMatches: true,
        amountMatches: true,
        currencyMatches: true,
      };
    }

    if (!Number.isFinite(settledAmount) || settledAmount <= 0) {
      settledAmount = expectedAmount;
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    console.log(
      `Subscription period: ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const subscription = await prisma.$transaction(async (tx) => {
      const lockRef = canonicalRef;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockRef}, 0))`;
      const refForKeys = lockRef;
      const pendingSubscriptionProviderRef = `DARAJA:SUBSCRIPTION:PENDING:${refForKeys}`;
      const settledSubscriptionProviderRef = `DARAJA:SUBSCRIPTION:SETTLED:${refForKeys}`;

      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId,
            balance: 0,
            pendingBalance: 0,
            currency: "KES",
          },
        });
      }

      const settledDescription = `Subscription payment settled (${plan}) [Ref:${refForKeys}]`;
      const existingSettled = await tx.transaction.findFirst({
        where: {
          walletId: wallet.id,
          type: "PAYMENT",
          providerRef: settledSubscriptionProviderRef,
        },
      });

      if (existingSettled) {
        const existingSubscriptionRecord = await tx.subscription.upsert({
          where: { userId },
          update: {
            plan,
            startDate,
            endDate,
            isActive: true,
          },
          create: {
            userId,
            plan,
            startDate,
            endDate,
            isActive: true,
          },
        });

        await updateSubscriptionPaymentIntentFromWebhook(tx, {
          userId,
          walletId: wallet.id,
          sourceId: existingSubscriptionRecord.id,
          apiRef: canonicalRef,
          amountExpected: Number(pendingSubscription.amount),
          amountReceived: settledAmount,
          currency: pendingSubscription.currency || "KES",
          gatewayState: "SETTLED",
          gatewayInvoiceId: merchantRequestId || null,
          gatewaySessionId: checkoutRequestId || null,
          providerRef: settledSubscriptionProviderRef,
          failureReason: null,
          payload: body as Prisma.InputJsonValue,
          metadata: {
            apiRef: canonicalRef,
            reason: "already_settled",
            plan,
            invoiceId: invoiceId ? String(invoiceId) : null,
          },
        });

        return existingSubscriptionRecord;
      }

      const subscriptionRecord = await tx.subscription.upsert({
        where: { userId },
        update: {
          plan,
          startDate,
          endDate,
          isActive: true,
        },
        create: {
          userId,
          plan,
          startDate,
          endDate,
          isActive: true,
        },
      });

      const pendingRecord = await tx.transaction.findFirst({
        where: {
          walletId: wallet.id,
          type: "PAYMENT",
          providerRef: pendingSubscriptionProviderRef,
        },
      });

      const settledAt = new Date();

      if (pendingRecord) {
        await tx.transaction.update({
          where: { id: pendingRecord.id },
          data: {
            amount: settledAmount,
            status: "SETTLED",
            direction: "DEBIT",
            category: "SUBSCRIPTION",
            currency: "KES",
            gateway: "DARAJA",
            gatewayReference: merchantRequestId || refForKeys,
            gatewaySessionId: checkoutRequestId || null,
            providerRef: settledSubscriptionProviderRef,
            sourceType: "SUBSCRIPTION",
            sourceId: subscriptionRecord.id,
            createdByType: "WEBHOOK",
            description: settledDescription,
            settledAt,
            failureReason: null,
            failedAt: null,
            cancelledAt: null,
            metadata: {
              apiRef: canonicalRef,
              gatewayRawState: webhook.rawState,
              gatewayState,
              eventFamily: webhook.eventFamily,
              invoiceId: invoiceId ? String(invoiceId) : null,
              providerVerification,
            } as Prisma.InputJsonValue,
          },
        });
      } else {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: settledAmount,
            type: "PAYMENT",
            status: "SETTLED",
            direction: "DEBIT",
            category: "SUBSCRIPTION",
            currency: "KES",
            gateway: "DARAJA",
            gatewayReference: merchantRequestId || refForKeys,
            gatewaySessionId: checkoutRequestId || null,
            providerRef: settledSubscriptionProviderRef,
            sourceType: "SUBSCRIPTION",
            sourceId: subscriptionRecord.id,
            createdByType: "WEBHOOK",
            description: settledDescription,
            settledAt,
            metadata: {
              apiRef: canonicalRef,
              gatewayRawState: webhook.rawState,
              gatewayState,
              eventFamily: webhook.eventFamily,
              invoiceId: invoiceId ? String(invoiceId) : null,
              providerVerification,
            } as Prisma.InputJsonValue,
          },
        });
      }

      await updateSubscriptionPaymentIntentFromWebhook(tx, {
        userId,
        walletId: wallet.id,
        sourceId: subscriptionRecord.id,
        apiRef: canonicalRef,
        amountExpected: Number(pendingSubscription.amount),
        amountReceived: settledAmount,
        currency: pendingSubscription.currency || "KES",
        gatewayState: "SETTLED",
        gatewayInvoiceId: merchantRequestId || null,
        gatewaySessionId: checkoutRequestId || null,
        providerRef: settledSubscriptionProviderRef,
        failureReason: null,
        payload: body as Prisma.InputJsonValue,
        metadata: {
          apiRef: canonicalRef,
          reason: "settled",
          plan,
          invoiceId: invoiceId ? String(invoiceId) : null,
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: "Subscription Activated",
          message: `Your ${plan} subscription has been activated successfully! Enjoy premium features for one month.`,
          type: "PAYMENT",
        },
      });

      return subscriptionRecord;
    });

    console.log(`Subscription updated successfully:`, subscription);

    // Send activation email
    if (user.email && user.name) {
      await sendSubscriptionActivationEmail(
        user.email,
        user.name,
        plan,
        endDate,
      );
      console.log(`Activation email sent to ${user.email}`);
    }

    return NextResponse.json({
      message: "Webhook processed successfully",
      subscription: {
        userId: subscription.userId,
        plan: subscription.plan,
        isActive: subscription.isActive,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    console.error("=== Webhook Error ===");
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
