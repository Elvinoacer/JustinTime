import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  evaluateDarajaCallbackToken,
  getDarajaCallbackTokenFromRequest,
  verifyDarajaPayment,
  verifyWebhookChallenge,
  PAYMENT_AMOUNTS,
} from "@/lib/daraja";
import { DarajaWebhookPayload, parseDarajaWebhook } from "@/lib/daraja-webhook";
import {
  buildPaymentWebhookDedupeKey,
  recordPaymentWebhookReceipt,
  updateOnboardingFeePaymentIntentFromWebhook,
} from "@/lib/payments/payment-intents";

async function resolveSystemAdminId(tx: Prisma.TransactionClient) {
  const actor = await tx.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  return actor?.id ?? null;
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

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as DarajaWebhookPayload;
    const callbackToken =
      getDarajaCallbackTokenFromRequest(req.url) ||
      req.headers.get("x-daraja-callback-token") ||
      req.headers.get("x-callback-token");

    console.log("=== Daraja Onboarding Webhook ===");
    console.log("Payload:", JSON.stringify(body, null, 2));

    const challenge =
      typeof body.challenge === "string" ? body.challenge.trim() : "";

    // Handle challenge verification only for probe payloads, not payment events.
    if (isChallengeOnlyPayload(body)) {
      if (verifyWebhookChallenge(challenge)) {
        console.log("✅ Challenge verified successfully");
        return NextResponse.json({ challenge });
      }

      console.error("❌ Challenge verification failed");
      return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
    }

    const signatureEvaluation = evaluateDarajaCallbackToken(callbackToken);
    if (signatureEvaluation.shouldReject) {
      console.error("❌ Invalid Daraja callback token");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!signatureEvaluation.valid) {
      console.warn(
        "[ONBOARDING_WEBHOOK] Callback token missing/invalid; continuing with challenge + provider verification flow",
      );
    }

    // Extract payment state and reference
    const webhook = parseDarajaWebhook(body);
    const gatewayState = webhook.state;
    const canonicalRef = String(
      webhook.apiRef || webhook.primaryReference || "",
    ).trim();
    const invoiceId = webhook.invoiceId || webhook.sessionId;
    let amount = 0;
    const pendingProviderRef = `DARAJA:ONBOARDING:PENDING:${canonicalRef}`;
    const partialProviderRef = `DARAJA:ONBOARDING:PARTIAL:${canonicalRef}`;
    const settledProviderRef = `DARAJA:ONBOARDING:SETTLED:${canonicalRef}`;

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
      kind: "ONBOARDING_FEE",
      apiRef: canonicalRef,
      invoiceId: invoiceId ? String(invoiceId) : null,
      rawState: webhook.rawState,
      state: gatewayState,
    });

    const webhookReceipt = await prisma.$transaction(async (tx) => {
      return recordPaymentWebhookReceipt(tx, {
        kind: "ONBOARDING_FEE",
        apiRef: canonicalRef,
        invoiceId: invoiceId ? String(invoiceId) : null,
        rawState: webhook.rawState,
        dedupeKey,
        payload: body,
        rawBody,
      });
    });

    if (webhookReceipt.duplicate) {
      return NextResponse.json({
        received: true,
        skipped: true,
        reason: "duplicate_webhook_receipt",
        state: gatewayState,
        dedupeKey,
      });
    }

    console.log(
      `Processing webhook: state=${gatewayState}, api_ref=${canonicalRef}, invoice=${invoiceId}`,
    );

    const duplicateState = await prisma.transaction.findFirst({
      where: {
        type: "ONBOARDING_FEE",
        providerRef: {
          in: [pendingProviderRef, partialProviderRef, settledProviderRef],
        },
        status: gatewayState,
        ...(invoiceId ? { gatewayReference: String(invoiceId) } : {}),
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
      if (!invoiceId) {
        return NextResponse.json({
          received: true,
          skipped: true,
          requiresManualResolution: true,
          reason: "missing_invoice_id_for_terminal_verification",
          apiRef: canonicalRef,
          state: gatewayState,
        });
      }

      const terminalVerification = await verifyDarajaPayment({
        invoiceId: String(invoiceId),
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

    if (gatewayState !== "SETTLED") {
      const { updatedCount, skippedCount } = await prisma.$transaction(
        async (tx) => {
          const candidates = await tx.transaction.findMany({
            where: {
              type: "ONBOARDING_FEE",
              providerRef: {
                in: [
                  pendingProviderRef,
                  partialProviderRef,
                  settledProviderRef,
                ],
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
                gatewayReference: invoiceId ? String(invoiceId) : canonicalRef,
                gatewaySessionId: invoiceId ? String(invoiceId) : null,
                metadata: {
                  apiRef: canonicalRef,
                  gatewayRawState: webhook.rawState,
                  gatewayState,
                  eventFamily: webhook.eventFamily,
                  invoiceId: invoiceId ? String(invoiceId) : null,
                } as Prisma.InputJsonValue,
              },
            });

            await updateOnboardingFeePaymentIntentFromWebhook(tx, {
              userId: entry.wallet.userId,
              walletId: entry.walletId,
              sourceId: entry.id,
              apiRef: canonicalRef,
              amountExpected: Number(entry.amount),
              amountReceived: null,
              currency: entry.currency || "KES",
              gatewayState,
              gatewayInvoiceId: invoiceId ? String(invoiceId) : null,
              gatewaySessionId: invoiceId ? String(invoiceId) : null,
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

      console.log(
        `Payment not settled (state: ${gatewayState}), acknowledging...`,
      );

      return NextResponse.json({
        received: true,
        state: gatewayState,
        updatedTransactions: updatedCount,
        skippedTransactions: skippedCount,
      });
    }

    const intentContext = await prisma.transaction.findFirst({
      where: {
        type: "ONBOARDING_FEE",
        providerRef: {
          in: [pendingProviderRef, partialProviderRef, settledProviderRef],
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

    if (!invoiceId) {
      if (intentContext) {
        await prisma.$transaction(async (tx) => {
          await updateOnboardingFeePaymentIntentFromWebhook(tx, {
            userId: intentContext.wallet.userId,
            walletId: intentContext.walletId,
            sourceId: intentContext.id,
            apiRef: canonicalRef,
            amountExpected: Number(intentContext.amount),
            amountReceived: null,
            currency: intentContext.currency || "KES",
            gatewayState: "PROCESSING",
            gatewayInvoiceId: null,
            gatewaySessionId: null,
            providerRef: intentContext.providerRef || pendingProviderRef,
            failureReason: "Waiting for verifiable invoice_id",
            payload: body as Prisma.InputJsonValue,
            metadata: {
              reason: "missing_invoice_id_for_verification",
              gatewayRawState: webhook.rawState,
              eventFamily: webhook.eventFamily,
              apiRef: canonicalRef,
            },
          });
        });
      }

      return NextResponse.json({
        received: true,
        skipped: true,
        requiresManualResolution: true,
        reason: "missing_invoice_id_for_verification",
        apiRef: canonicalRef,
      });
    }

    const verification = await verifyDarajaPayment({
      invoiceId: String(invoiceId),
      expectedApiRef: canonicalRef,
      expectedAmount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
      expectedCurrency: "KES",
    });

    if (!verification.ok) {
      if (intentContext) {
        await prisma.$transaction(async (tx) => {
          await updateOnboardingFeePaymentIntentFromWebhook(tx, {
            userId: intentContext.wallet.userId,
            walletId: intentContext.walletId,
            sourceId: intentContext.id,
            apiRef: canonicalRef,
            amountExpected: Number(intentContext.amount),
            amountReceived: null,
            currency: intentContext.currency || "KES",
            gatewayState: "PROCESSING",
            gatewayInvoiceId: String(invoiceId),
            gatewaySessionId: String(invoiceId),
            providerRef: intentContext.providerRef || pendingProviderRef,
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
      }

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

    const verifiedAmount = verification.amount;

    if (
      typeof verifiedAmount !== "number" ||
      !Number.isFinite(verifiedAmount) ||
      verifiedAmount <= 0
    ) {
      if (intentContext) {
        await prisma.$transaction(async (tx) => {
          await updateOnboardingFeePaymentIntentFromWebhook(tx, {
            userId: intentContext.wallet.userId,
            walletId: intentContext.walletId,
            sourceId: intentContext.id,
            apiRef: canonicalRef,
            amountExpected: Number(intentContext.amount),
            amountReceived: null,
            currency: intentContext.currency || "KES",
            gatewayState: "PROCESSING",
            gatewayInvoiceId: String(invoiceId),
            gatewaySessionId: String(invoiceId),
            providerRef: intentContext.providerRef || pendingProviderRef,
            failureReason: "Invalid settlement amount",
            payload: body as Prisma.InputJsonValue,
            metadata: {
              reason: "invalid_amount_for_settlement",
              apiRef: canonicalRef,
              invoiceId: String(invoiceId),
              providerState: verification.providerState,
            },
          });
        });
      }

      return NextResponse.json({
        received: true,
        skipped: true,
        requiresManualResolution: true,
        reason: "invalid_amount_for_settlement",
        apiRef: canonicalRef,
      });
    }

    amount = verifiedAmount;

    const pendingOnboarding = await prisma.transaction.findFirst({
      where: {
        type: "ONBOARDING_FEE",
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

    if (!pendingOnboarding) {
      console.log(
        `No pending onboarding transaction found for providerRef ${pendingProviderRef}; skipping auto-settlement`,
      );

      if (intentContext) {
        await prisma.$transaction(async (tx) => {
          await updateOnboardingFeePaymentIntentFromWebhook(tx, {
            userId: intentContext.wallet.userId,
            walletId: intentContext.walletId,
            sourceId: intentContext.id,
            apiRef: canonicalRef,
            amountExpected: Number(intentContext.amount),
            amountReceived: null,
            currency: intentContext.currency || "KES",
            gatewayState: "PROCESSING",
            gatewayInvoiceId: invoiceId ? String(invoiceId) : null,
            gatewaySessionId: invoiceId ? String(invoiceId) : null,
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

    const user = await prisma.user.findUnique({
      where: { id: pendingOnboarding.wallet.userId },
      include: { profile: true },
    });

    if (!user) {
      console.error(
        `User not found for pending onboarding ref: ${canonicalRef}`,
      );

      await prisma.$transaction(async (tx) => {
        await updateOnboardingFeePaymentIntentFromWebhook(tx, {
          userId: pendingOnboarding.wallet.userId,
          walletId: pendingOnboarding.walletId,
          sourceId: pendingOnboarding.id,
          apiRef: canonicalRef,
          amountExpected: Number(pendingOnboarding.amount),
          amountReceived: null,
          currency: pendingOnboarding.currency || "KES",
          gatewayState: "PROCESSING",
          gatewayInvoiceId: invoiceId ? String(invoiceId) : null,
          gatewaySessionId: invoiceId ? String(invoiceId) : null,
          providerRef: pendingOnboarding.providerRef || pendingProviderRef,
          failureReason: "User not found for onboarding settlement",
          payload: body as Prisma.InputJsonValue,
          metadata: {
            reason: "missing_user_for_onboarding_settlement",
            apiRef: canonicalRef,
            invoiceId: invoiceId ? String(invoiceId) : null,
          },
        });
      });

      return NextResponse.json({
        received: true,
        requiresManualResolution: true,
        error: "User not found",
      });
    }

    // Process the payment
    await prisma.$transaction(async (tx) => {
      const lockRef = canonicalRef;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockRef}, 0))`;
      const refForKeys = lockRef;

      const successfulDescription = `Onboarding Fee Payment Settled [Ref:${refForKeys}]`;
      const partialDescription = `Onboarding Fee Partial Payment [Ref:${refForKeys}]`;
      const pendingPaymentProviderRef = `DARAJA:ONBOARDING:PENDING:${refForKeys}`;
      const partialPaymentProviderRef = `DARAJA:ONBOARDING:PARTIAL:${refForKeys}`;
      const settledPaymentProviderRef = `DARAJA:ONBOARDING:SETTLED:${refForKeys}`;

      const existingTx = await tx.transaction.findFirst({
        where: {
          type: "ONBOARDING_FEE",
          OR: [
            { providerRef: settledPaymentProviderRef },
            { providerRef: partialPaymentProviderRef },
          ],
        },
      });

      if (existingTx) {
        const existingState =
          existingTx.status === "SETTLED"
            ? "SETTLED"
            : existingTx.status === "FAILED"
              ? "FAILED"
              : "PROCESSING";

        await updateOnboardingFeePaymentIntentFromWebhook(tx, {
          userId: user.id,
          walletId: existingTx.walletId,
          sourceId: existingTx.id,
          apiRef: canonicalRef,
          amountExpected: PAYMENT_AMOUNTS.ONBOARDING_FEE,
          amountReceived:
            existingState === "SETTLED" ? Number(existingTx.amount) : null,
          currency: existingTx.currency || "KES",
          gatewayState: existingState,
          gatewayInvoiceId: invoiceId ? String(invoiceId) : null,
          gatewaySessionId: invoiceId ? String(invoiceId) : null,
          providerRef: existingTx.providerRef || settledPaymentProviderRef,
          failureReason:
            existingState === "FAILED" ? existingTx.failureReason : null,
          payload: body as Prisma.InputJsonValue,
          metadata: {
            apiRef: canonicalRef,
            reason: "already_processed",
            invoiceId: invoiceId ? String(invoiceId) : null,
          },
        });

        return;
      }

      const pendingPayment = await tx.transaction.findFirst({
        where: {
          type: "ONBOARDING_FEE",
          providerRef: pendingPaymentProviderRef,
        },
      });

      // Check if already processed
      const existingProfile = await tx.profile.findUnique({
        where: { userId: user.id },
        select: {
          hasPaidOnboardingFee: true,
          onboardingFeeWaived: true,
        },
      });

      if (
        existingProfile?.hasPaidOnboardingFee ||
        existingProfile?.onboardingFeeWaived
      ) {
        return;
      }

      const systemAdminId = await resolveSystemAdminId(tx);

      if (amount < PAYMENT_AMOUNTS.ONBOARDING_FEE) {
        let wallet = await tx.wallet.findUnique({
          where: { userId: user.id },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              userId: user.id,
              balance: 0,
              pendingBalance: 0,
              currency: "KES",
            },
          });
        }

        let failedOnboardingTxId: string;

        if (pendingPayment) {
          const updatedPending = await tx.transaction.update({
            where: { id: pendingPayment.id },
            data: {
              amount,
              status: "FAILED",
              direction: "DEBIT",
              category: "ONBOARDING_FEE",
              currency: "KES",
              gateway: "DARAJA",
              gatewayReference: invoiceId ? String(invoiceId) : refForKeys,
              gatewaySessionId: invoiceId ? String(invoiceId) : null,
              providerRef: partialPaymentProviderRef,
              sourceType: "ONBOARDING_FEE",
              sourceId: user.id,
              createdByType: "WEBHOOK",
              description: partialDescription,
              failedAt: new Date(),
              failureReason: "Partial onboarding payment",
              metadata: {
                apiRef: canonicalRef,
                gatewayRawState: webhook.rawState,
                gatewayState,
                eventFamily: webhook.eventFamily,
                invoiceId: invoiceId ? String(invoiceId) : null,
                providerVerification: {
                  providerState: verification.providerState,
                  apiRefMatches: verification.apiRefMatches,
                  amountMatches: verification.amountMatches,
                  currencyMatches: verification.currencyMatches,
                },
              } as Prisma.InputJsonValue,
            },
          });

          failedOnboardingTxId = updatedPending.id;
        } else {
          const createdFailed = await tx.transaction.create({
            data: {
              walletId: wallet.id,
              amount,
              type: "ONBOARDING_FEE",
              status: "FAILED",
              direction: "DEBIT",
              category: "ONBOARDING_FEE",
              currency: "KES",
              gateway: "DARAJA",
              gatewayReference: invoiceId ? String(invoiceId) : refForKeys,
              gatewaySessionId: invoiceId ? String(invoiceId) : null,
              providerRef: partialPaymentProviderRef,
              sourceType: "ONBOARDING_FEE",
              sourceId: user.id,
              createdByType: "WEBHOOK",
              description: partialDescription,
              failedAt: new Date(),
              failureReason: "Partial onboarding payment",
              metadata: {
                apiRef: canonicalRef,
                gatewayRawState: webhook.rawState,
                gatewayState,
                eventFamily: webhook.eventFamily,
                invoiceId: invoiceId ? String(invoiceId) : null,
                providerVerification: {
                  providerState: verification.providerState,
                  apiRefMatches: verification.apiRefMatches,
                  amountMatches: verification.amountMatches,
                  currencyMatches: verification.currencyMatches,
                },
              } as Prisma.InputJsonValue,
            },
          });

          failedOnboardingTxId = createdFailed.id;
        }

        await updateOnboardingFeePaymentIntentFromWebhook(tx, {
          userId: user.id,
          walletId: wallet.id,
          sourceId: failedOnboardingTxId,
          apiRef: canonicalRef,
          amountExpected: PAYMENT_AMOUNTS.ONBOARDING_FEE,
          amountReceived: amount,
          currency: "KES",
          gatewayState: "FAILED",
          gatewayInvoiceId: invoiceId ? String(invoiceId) : null,
          gatewaySessionId: invoiceId ? String(invoiceId) : null,
          providerRef: partialPaymentProviderRef,
          failureReason: "Partial onboarding payment",
          payload: body as Prisma.InputJsonValue,
          metadata: {
            apiRef: canonicalRef,
            reason: "partial_payment",
            expectedAmount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
            paidAmount: amount,
            invoiceId: invoiceId ? String(invoiceId) : null,
          },
        });

        if (systemAdminId) {
          await tx.adminLog.create({
            data: {
              adminId: systemAdminId,
              action: "ONBOARDING_FEE_PARTIAL_PAYMENT_REQUIRES_RESOLUTION",
              targetId: user.id,
              details: {
                source: "daraja_webhook",
                invoiceId: String(lockRef),
                apiRef: canonicalRef,
                expectedAmount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
                paidAmount: amount,
                actorUserId: user.id,
              },
            },
          });
        }

        return;
      }

      // Mark payment state only; verification must be granted by Trust & Safety review.
      await tx.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          hasPaidOnboardingFee: true,
        },
        update: {
          hasPaidOnboardingFee: true,
        },
      });

      // 2. Get or create wallet
      let wallet = await tx.wallet.findUnique({
        where: { userId: user.id },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            pendingBalance: 0,
            currency: "KES",
          },
        });
      }

      // 3. Mark pending transaction as settled, or create one if pending is missing.
      if (pendingPayment) {
        const updatedPending = await tx.transaction.update({
          where: { id: pendingPayment.id },
          data: {
            amount,
            status: "SETTLED",
            direction: "DEBIT",
            category: "ONBOARDING_FEE",
            currency: "KES",
            gateway: "DARAJA",
            gatewayReference: invoiceId ? String(invoiceId) : refForKeys,
            gatewaySessionId: invoiceId ? String(invoiceId) : null,
            providerRef: settledPaymentProviderRef,
            sourceType: "ONBOARDING_FEE",
            sourceId: user.id,
            createdByType: "WEBHOOK",
            description: successfulDescription,
            settledAt: new Date(),
            failureReason: null,
            failedAt: null,
            cancelledAt: null,
            metadata: {
              apiRef: canonicalRef,
              gatewayRawState: webhook.rawState,
              gatewayState,
              eventFamily: webhook.eventFamily,
              invoiceId: invoiceId ? String(invoiceId) : null,
              providerVerification: {
                providerState: verification.providerState,
                apiRefMatches: verification.apiRefMatches,
                amountMatches: verification.amountMatches,
                currencyMatches: verification.currencyMatches,
              },
            } as Prisma.InputJsonValue,
          },
        });

        await updateOnboardingFeePaymentIntentFromWebhook(tx, {
          userId: user.id,
          walletId: wallet.id,
          sourceId: updatedPending.id,
          apiRef: canonicalRef,
          amountExpected: PAYMENT_AMOUNTS.ONBOARDING_FEE,
          amountReceived: amount,
          currency: "KES",
          gatewayState: "SETTLED",
          gatewayInvoiceId: invoiceId ? String(invoiceId) : null,
          gatewaySessionId: invoiceId ? String(invoiceId) : null,
          providerRef: settledPaymentProviderRef,
          failureReason: null,
          payload: body as Prisma.InputJsonValue,
          metadata: {
            apiRef: canonicalRef,
            reason: "settled",
            expectedAmount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
            paidAmount: amount,
            invoiceId: invoiceId ? String(invoiceId) : null,
          },
        });
      } else {
        const createdSettled = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: "ONBOARDING_FEE",
            status: "SETTLED",
            direction: "DEBIT",
            category: "ONBOARDING_FEE",
            currency: "KES",
            gateway: "DARAJA",
            gatewayReference: invoiceId ? String(invoiceId) : refForKeys,
            gatewaySessionId: invoiceId ? String(invoiceId) : null,
            providerRef: settledPaymentProviderRef,
            sourceType: "ONBOARDING_FEE",
            sourceId: user.id,
            createdByType: "WEBHOOK",
            description: successfulDescription,
            settledAt: new Date(),
            metadata: {
              apiRef: canonicalRef,
              gatewayRawState: webhook.rawState,
              gatewayState,
              eventFamily: webhook.eventFamily,
              invoiceId: invoiceId ? String(invoiceId) : null,
              providerVerification: {
                providerState: verification.providerState,
                apiRefMatches: verification.apiRefMatches,
                amountMatches: verification.amountMatches,
                currencyMatches: verification.currencyMatches,
              },
            } as Prisma.InputJsonValue,
          },
        });

        await updateOnboardingFeePaymentIntentFromWebhook(tx, {
          userId: user.id,
          walletId: wallet.id,
          sourceId: createdSettled.id,
          apiRef: canonicalRef,
          amountExpected: PAYMENT_AMOUNTS.ONBOARDING_FEE,
          amountReceived: amount,
          currency: "KES",
          gatewayState: "SETTLED",
          gatewayInvoiceId: invoiceId ? String(invoiceId) : null,
          gatewaySessionId: invoiceId ? String(invoiceId) : null,
          providerRef: settledPaymentProviderRef,
          failureReason: null,
          payload: body as Prisma.InputJsonValue,
          metadata: {
            apiRef: canonicalRef,
            reason: "settled",
            expectedAmount: PAYMENT_AMOUNTS.ONBOARDING_FEE,
            paidAmount: amount,
            invoiceId: invoiceId ? String(invoiceId) : null,
          },
        });
      }

      if (systemAdminId) {
        await tx.adminLog.create({
          data: {
            adminId: systemAdminId,
            action: "ONBOARDING_FEE_PAID_ACCESS_GRANTED",
            targetId: user.id,
            details: {
              source: "daraja_webhook",
              invoiceId: String(lockRef),
              apiRef: canonicalRef,
              actorUserId: user.id,
            },
          },
        });
      }
    });

    console.log(
      `✅ Onboarding fee processed for user: ${user.id} (${user.email})`,
    );
    return NextResponse.json({
      received: true,
      success: true,
      userId: user.id,
    });
  } catch (error) {
    console.error("[ONBOARDING_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
