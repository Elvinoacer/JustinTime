import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  evaluateWebhookSignature,
  verifyIntaSendPayment,
  verifyWebhookChallenge,
} from "@/lib/intasend";
import { Prisma } from "@/generated/prisma/client";
import {
  CanonicalIntaSendState,
  IntaSendWebhookPayload,
  parseIntaSendWebhook,
} from "@/lib/intasend-webhook";
import {
  getWalletSchemaOutOfSyncMessage,
  isWalletSchemaOutOfSyncError,
} from "@/lib/wallet/errors";
import {
  buildWalletWebhookDedupeKey,
  recordPaymentWebhookReceipt,
  updateWalletTopUpPaymentIntentFromWebhook,
} from "@/lib/payments/payment-intents";

const LEGACY_PENDING_PREFIX = "INTASEND:WALLET:PENDING:";
const LEGACY_SETTLED_PREFIX = "INTASEND:WALLET:SETTLED:";
const CURRENT_PROVIDER_PREFIX = "INTASEND:WALLET:TOPUP:";

function asRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function buildProviderReferenceCandidates(referenceCandidates: string[]) {
  const expanded: string[] = [];
  for (const reference of referenceCandidates) {
    expanded.push(
      `${CURRENT_PROVIDER_PREFIX}${reference}`,
      `${LEGACY_PENDING_PREFIX}${reference}`,
      `${LEGACY_SETTLED_PREFIX}${reference}`,
      `INTASEND:SEND_MONEY:${reference}`,
      `INTASEND:TRANSFER:${reference}`,
      `INTASEND:WITHDRAWAL:${reference}`,
      `INTASEND:WALLET:TRANSFER:${reference}`,
    );
  }

  return Array.from(new Set(expanded));
}

async function updateTransactionsByGatewayReferences(
  tx: Prisma.TransactionClient,
  params: {
    referenceCandidates: string[];
    gatewayState: CanonicalIntaSendState;
    gatewayInvoiceId: string;
    gatewaySessionId: string;
    failureReason: string | null;
    eventFamily: string;
    eventHint: string;
    rawState: string;
    payload: IntaSendWebhookPayload;
    verifiedSettlement?: boolean;
  },
) {
  const {
    referenceCandidates,
    gatewayState,
    gatewayInvoiceId,
    gatewaySessionId,
    failureReason,
    eventFamily,
    eventHint,
    rawState,
    payload,
    verifiedSettlement,
  } = params;

  if (referenceCandidates.length === 0) {
    return {
      matchedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
    };
  }

  const providerRefCandidates =
    buildProviderReferenceCandidates(referenceCandidates);

  const transactions = await tx.transaction.findMany({
    where: {
      OR: [
        { providerRef: { in: providerRefCandidates } },
        { gatewayReference: { in: referenceCandidates } },
        { gatewaySessionId: { in: referenceCandidates } },
      ],
    },
    select: {
      id: true,
      status: true,
      gatewayReference: true,
      gatewaySessionId: true,
      metadata: true,
      settledAt: true,
      failedAt: true,
      cancelledAt: true,
      reversedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (transactions.length === 0) {
    return {
      matchedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
    };
  }

  const now = new Date();
  let updatedCount = 0;
  let skippedCount = 0;

  for (const entry of transactions) {
    if (gatewayState === "SETTLED" && !verifiedSettlement) {
      skippedCount += 1;
      continue;
    }

    if (
      entry.status === "SETTLED" &&
      !["SETTLED", "REVERSED"].includes(gatewayState)
    ) {
      skippedCount += 1;
      continue;
    }

    const existingMetadata = asRecord(entry.metadata);

    await tx.transaction.update({
      where: { id: entry.id },
      data: {
        status: gatewayState,
        gatewayReference:
          gatewayInvoiceId ||
          entry.gatewayReference ||
          referenceCandidates[0] ||
          null,
        gatewaySessionId:
          gatewaySessionId ||
          entry.gatewaySessionId ||
          referenceCandidates[0] ||
          null,
        createdByType: "WEBHOOK",
        settledAt:
          gatewayState === "SETTLED" ? entry.settledAt || now : entry.settledAt,
        failedAt: gatewayState === "FAILED" ? now : entry.failedAt,
        cancelledAt: gatewayState === "CANCELLED" ? now : entry.cancelledAt,
        reversedAt: gatewayState === "REVERSED" ? now : entry.reversedAt,
        failureReason:
          gatewayState === "FAILED" ||
          gatewayState === "CANCELLED" ||
          gatewayState === "REVERSED"
            ? failureReason ||
              (gatewayState === "REVERSED"
                ? "Gateway reversal"
                : `Gateway state: ${gatewayState}`)
            : null,
        metadata: {
          ...existingMetadata,
          webhookState: gatewayState,
          webhookRawState: rawState,
          webhookEventFamily: eventFamily,
          webhookEventHint: eventHint || null,
          webhookInvoiceId: gatewayInvoiceId || null,
          webhookSessionId: gatewaySessionId || null,
          webhookReferences: referenceCandidates,
          webhookPayload: payload,
          webhookUpdatedAt: now.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    updatedCount += 1;
  }

  return {
    matchedCount: transactions.length,
    updatedCount,
    skippedCount,
  };
}

async function ensureLegacyTopUp(tx: Prisma.TransactionClient, apiRef: string) {
  const legacyTransaction = await tx.transaction.findFirst({
    where: {
      type: "DEPOSIT",
      OR: [
        { providerRef: `${CURRENT_PROVIDER_PREFIX}${apiRef}` },
        { providerRef: `${LEGACY_PENDING_PREFIX}${apiRef}` },
        { providerRef: `${LEGACY_SETTLED_PREFIX}${apiRef}` },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!legacyTransaction) {
    return null;
  }

  const wallet = await tx.wallet.findUnique({
    where: { id: legacyTransaction.walletId },
  });

  if (!wallet) {
    return null;
  }

  const inferredStatus = legacyTransaction.providerRef?.startsWith(
    LEGACY_SETTLED_PREFIX,
  )
    ? "SETTLED"
    : "PENDING";

  const topUp = await tx.walletTopUp.create({
    data: {
      userId: wallet.userId,
      walletId: wallet.id,
      amountExpected: legacyTransaction.amount,
      amountReceived:
        inferredStatus === "SETTLED" ? legacyTransaction.amount : null,
      currency: legacyTransaction.currency || wallet.currency || "KES",
      status: inferredStatus,
      gateway: "INTASEND",
      apiRef,
      initiatedAt: legacyTransaction.createdAt,
      confirmedAt:
        inferredStatus === "SETTLED" ? legacyTransaction.createdAt : null,
      rawInitiationPayload: {
        migratedFromLegacyTransactionId: legacyTransaction.id,
      },
    },
  });

  await tx.transaction.update({
    where: { id: legacyTransaction.id },
    data: {
      topUpId: topUp.id,
      status: inferredStatus,
      direction: "CREDIT",
      category: "TOPUP",
      gateway: "INTASEND",
      gatewayReference: apiRef,
      providerRef: `${CURRENT_PROVIDER_PREFIX}${apiRef}`,
      sourceType: "WALLET_TOPUP",
      sourceId: topUp.id,
      createdByType: legacyTransaction.createdByType || "WEBHOOK",
      settledAt:
        inferredStatus === "SETTLED"
          ? legacyTransaction.settledAt || legacyTransaction.createdAt
          : null,
    },
  });

  return topUp;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-intasend-signature");
    const body = JSON.parse(rawBody) as IntaSendWebhookPayload;
    const challenge =
      typeof body.challenge === "string" ? body.challenge : null;

    if (challenge) {
      if (verifyWebhookChallenge(challenge)) {
        return NextResponse.json({ challenge });
      }

      return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
    }

    const signatureEvaluation = evaluateWebhookSignature(rawBody, signature);
    if (signatureEvaluation.shouldReject) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!signatureEvaluation.valid) {
      console.warn(
        "[WALLET_TOPUP_WEBHOOK] Signature missing/invalid; continuing with challenge + provider verification flow",
      );
    }

    const webhook = parseIntaSendWebhook(body);
    const gatewayState = webhook.state;
    const amountFromGateway = webhook.amount;
    const gatewayInvoiceId = (webhook.invoiceId || "").trim();
    const gatewaySessionId = (webhook.sessionId || "").trim();
    const apiRef = (webhook.apiRef || "").trim();
    const lockKey = webhook.primaryReference || apiRef;

    if (!lockKey) {
      return NextResponse.json({
        received: true,
        skipped: true,
        reason: "missing_reference",
      });
    }

    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

      const dedupeKey = buildWalletWebhookDedupeKey({
        apiRef: apiRef || lockKey,
        invoiceId: gatewayInvoiceId || null,
        rawState: webhook.rawState,
        state: gatewayState,
      });

      const webhookReceipt = await recordPaymentWebhookReceipt(tx, {
        kind: "WALLET_TOPUP",
        apiRef: apiRef || lockKey,
        invoiceId: gatewayInvoiceId || null,
        rawState: webhook.rawState,
        dedupeKey,
        payload: body,
        rawBody,
      });

      if (webhookReceipt.duplicate) {
        return {
          received: true,
          skipped: true,
          reason: "duplicate_webhook_receipt",
          dedupeKey,
          state: gatewayState,
        };
      }

      let topUp = apiRef
        ? await tx.walletTopUp.findUnique({
            where: { apiRef },
          })
        : null;

      if (!topUp && apiRef) {
        topUp = await ensureLegacyTopUp(tx, apiRef);
      }

      if (!topUp && webhook.referenceCandidates.length > 0) {
        topUp = await tx.walletTopUp.findFirst({
          where: {
            OR: [
              { apiRef: { in: webhook.referenceCandidates } },
              { gatewayInvoiceId: { in: webhook.referenceCandidates } },
              { gatewaySessionId: { in: webhook.referenceCandidates } },
            ],
          },
        });
      }

      const resolvedApiRef = topUp?.apiRef || apiRef;

      if (!topUp) {
        const genericUpdate = await updateTransactionsByGatewayReferences(tx, {
          referenceCandidates: webhook.referenceCandidates,
          gatewayState,
          gatewayInvoiceId,
          gatewaySessionId,
          failureReason: webhook.failureReason,
          eventFamily: webhook.eventFamily,
          eventHint: webhook.eventHint,
          rawState: webhook.rawState,
          payload: body,
          verifiedSettlement: false,
        });

        if (genericUpdate.updatedCount > 0 || genericUpdate.matchedCount > 0) {
          return {
            received: true,
            success: true,
            state: gatewayState,
            topUpMatched: false,
            referenceCandidates: webhook.referenceCandidates,
            matchedTransactions: genericUpdate.matchedCount,
            updatedTransactions: genericUpdate.updatedCount,
            skippedTransactions: genericUpdate.skippedCount,
          };
        }

        return {
          received: true,
          skipped: true,
          requiresManualResolution: true,
          reason: "missing_topup_record",
          apiRef: resolvedApiRef || null,
          referenceCandidates: webhook.referenceCandidates,
        };
      }

      const previousStatus = topUp.status;
      let verifiedSettlementAmount: number | null = null;

      if (gatewayState === "SETTLED") {
        if (!gatewayInvoiceId) {
          await updateWalletTopUpPaymentIntentFromWebhook(tx, {
            userId: topUp.userId,
            walletId: topUp.walletId,
            topUpId: topUp.id,
            apiRef: resolvedApiRef,
            amountExpected: Number(topUp.amountExpected),
            amountReceived: null,
            currency: topUp.currency,
            gatewayState: "PENDING",
            gatewayInvoiceId: null,
            gatewaySessionId: gatewaySessionId || topUp.gatewaySessionId,
            providerRef: `${CURRENT_PROVIDER_PREFIX}${resolvedApiRef}`,
            failureReason: "Waiting for verifiable invoice_id",
            payload: body as Prisma.InputJsonValue,
            metadata: {
              reason: "missing_invoice_id_for_verification",
              gatewayRawState: webhook.rawState,
            },
          });

          await tx.walletTopUp.update({
            where: { id: topUp.id },
            data: {
              gatewaySessionId: gatewaySessionId || topUp.gatewaySessionId,
              rawWebhookPayload: body as Prisma.InputJsonValue,
            },
          });

          return {
            received: true,
            skipped: true,
            requiresManualResolution: true,
            reason: "missing_invoice_id_for_verification",
            apiRef: resolvedApiRef,
            topUpId: topUp.id,
          };
        }

        const verification = await verifyIntaSendPayment({
          invoiceId: gatewayInvoiceId,
          expectedApiRef: resolvedApiRef,
          expectedAmount: Number(topUp.amountExpected),
          expectedCurrency: topUp.currency || "KES",
        });

        if (!verification.ok) {
          await updateWalletTopUpPaymentIntentFromWebhook(tx, {
            userId: topUp.userId,
            walletId: topUp.walletId,
            topUpId: topUp.id,
            apiRef: resolvedApiRef,
            amountExpected: Number(topUp.amountExpected),
            amountReceived: null,
            currency: topUp.currency,
            gatewayState: "PROCESSING",
            gatewayInvoiceId,
            gatewaySessionId: gatewaySessionId || topUp.gatewaySessionId,
            providerRef: `${CURRENT_PROVIDER_PREFIX}${resolvedApiRef}`,
            failureReason: "Provider status verification failed",
            payload: body as Prisma.InputJsonValue,
            metadata: {
              reason: "provider_status_verification_failed",
              providerState: verification.providerState,
              apiRefMatches: verification.apiRefMatches,
              amountMatches: verification.amountMatches,
              currencyMatches: verification.currencyMatches,
            },
          });

          await tx.walletTopUp.update({
            where: { id: topUp.id },
            data: {
              gatewayInvoiceId: gatewayInvoiceId || topUp.gatewayInvoiceId,
              gatewaySessionId: gatewaySessionId || topUp.gatewaySessionId,
              rawWebhookPayload: body as Prisma.InputJsonValue,
            },
          });

          return {
            received: true,
            skipped: true,
            requiresManualResolution: true,
            reason: "provider_status_verification_failed",
            apiRef: resolvedApiRef,
            topUpId: topUp.id,
            verification: {
              providerState: verification.providerState,
              apiRefMatches: verification.apiRefMatches,
              amountMatches: verification.amountMatches,
              currencyMatches: verification.currencyMatches,
            },
          };
        }

        verifiedSettlementAmount =
          typeof verification.amount === "number" &&
          Number.isFinite(verification.amount)
            ? verification.amount
            : null;
      }

      if (
        previousStatus === "SETTLED" &&
        !["SETTLED", "REVERSED"].includes(gatewayState)
      ) {
        await tx.walletTopUp.update({
          where: { id: topUp.id },
          data: {
            gatewayInvoiceId: gatewayInvoiceId || topUp.gatewayInvoiceId,
            gatewaySessionId: gatewaySessionId || topUp.gatewaySessionId,
            rawWebhookPayload: body as Prisma.InputJsonValue,
          },
        });

        return {
          received: true,
          success: true,
          skipped: true,
          reason: "ignored_non_terminal_after_settlement",
          apiRef: resolvedApiRef,
          topUpId: topUp.id,
          previousStatus,
          status: previousStatus,
          incomingState: gatewayState,
        };
      }

      const ledgerEntry = await tx.transaction.findFirst({
        where: {
          OR: [
            { topUpId: topUp.id },
            { providerRef: `${CURRENT_PROVIDER_PREFIX}${resolvedApiRef}` },
            { providerRef: `${LEGACY_PENDING_PREFIX}${resolvedApiRef}` },
            { providerRef: `${LEGACY_SETTLED_PREFIX}${resolvedApiRef}` },
            { gatewayReference: { in: webhook.referenceCandidates } },
            { gatewaySessionId: { in: webhook.referenceCandidates } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      const effectiveAmount =
        verifiedSettlementAmount ??
        amountFromGateway ??
        Number(topUp.amountReceived ?? topUp.amountExpected);
      const shouldReleasePending =
        ["PENDING", "PROCESSING"].includes(previousStatus) &&
        ["SETTLED", "FAILED", "CANCELLED", "REVERSED"].includes(gatewayState);

      if (shouldReleasePending) {
        const wallet = await tx.wallet.findUnique({
          where: { id: topUp.walletId },
          select: { pendingBalance: true },
        });

        const currentPending = Number(wallet?.pendingBalance || 0);
        const decrementBy = Math.min(
          currentPending,
          Number(topUp.amountExpected),
        );

        if (decrementBy > 0) {
          await tx.wallet.update({
            where: { id: topUp.walletId },
            data: {
              pendingBalance: { decrement: decrementBy },
            },
          });
        }
      }

      if (gatewayState === "SETTLED" && previousStatus !== "SETTLED") {
        await tx.wallet.update({
          where: { id: topUp.walletId },
          data: {
            balance: { increment: effectiveAmount },
          },
        });
      }

      if (gatewayState === "REVERSED" && previousStatus === "SETTLED") {
        const reverseAmount = Number(
          topUp.amountReceived ?? topUp.amountExpected,
        );
        if (reverseAmount > 0) {
          await tx.wallet.update({
            where: { id: topUp.walletId },
            data: {
              balance: { decrement: reverseAmount },
            },
          });
        }
      }

      const now = new Date();

      const updatedTopUp = await tx.walletTopUp.update({
        where: { id: topUp.id },
        data: {
          status:
            previousStatus === "SETTLED" && gatewayState === "SETTLED"
              ? "SETTLED"
              : gatewayState,
          amountReceived:
            gatewayState === "SETTLED" ? effectiveAmount : topUp.amountReceived,
          gatewayInvoiceId: gatewayInvoiceId || topUp.gatewayInvoiceId,
          gatewaySessionId: gatewaySessionId || topUp.gatewaySessionId,
          confirmedAt:
            gatewayState === "SETTLED"
              ? topUp.confirmedAt || now
              : topUp.confirmedAt,
          failedAt: gatewayState === "FAILED" ? now : topUp.failedAt,
          cancelledAt: gatewayState === "CANCELLED" ? now : topUp.cancelledAt,
          reversedAt: gatewayState === "REVERSED" ? now : topUp.reversedAt,
          failureReason:
            gatewayState === "FAILED" || gatewayState === "CANCELLED"
              ? webhook.failureReason || "Gateway failure"
              : gatewayState === "REVERSED"
                ? webhook.failureReason || "Gateway reversal"
                : null,
          rawWebhookPayload: body as Prisma.InputJsonValue,
        },
      });

      await updateWalletTopUpPaymentIntentFromWebhook(tx, {
        userId: topUp.userId,
        walletId: topUp.walletId,
        topUpId: topUp.id,
        apiRef: resolvedApiRef,
        amountExpected: Number(topUp.amountExpected),
        amountReceived: gatewayState === "SETTLED" ? effectiveAmount : null,
        currency: updatedTopUp.currency,
        gatewayState: updatedTopUp.status as CanonicalIntaSendState,
        gatewayInvoiceId: gatewayInvoiceId || updatedTopUp.gatewayInvoiceId,
        gatewaySessionId: gatewaySessionId || updatedTopUp.gatewaySessionId,
        providerRef: `${CURRENT_PROVIDER_PREFIX}${resolvedApiRef}`,
        failureReason:
          gatewayState === "FAILED" || gatewayState === "CANCELLED"
            ? webhook.failureReason || "Gateway failure"
            : gatewayState === "REVERSED"
              ? webhook.failureReason || "Gateway reversal"
              : null,
        payload: body as Prisma.InputJsonValue,
        metadata: {
          apiRef: resolvedApiRef,
          gatewayState,
          gatewayRawState: webhook.rawState,
          eventFamily: webhook.eventFamily,
          invoiceId: gatewayInvoiceId || null,
        },
      });

      const ledgerBase = {
        walletId: topUp.walletId,
        topUpId: topUp.id,
        amount:
          gatewayState === "SETTLED"
            ? effectiveAmount
            : Number(topUp.amountExpected),
        type: "DEPOSIT" as const,
        status: updatedTopUp.status,
        direction: "CREDIT" as const,
        category: "TOPUP" as const,
        currency: updatedTopUp.currency,
        gateway: "INTASEND" as const,
        gatewayReference: gatewayInvoiceId || resolvedApiRef,
        gatewaySessionId: gatewaySessionId || updatedTopUp.gatewaySessionId,
        providerRef: `${CURRENT_PROVIDER_PREFIX}${resolvedApiRef}`,
        sourceType: "WALLET_TOPUP",
        sourceId: topUp.id,
        createdByType: "WEBHOOK" as const,
        description:
          gatewayState === "SETTLED"
            ? `Wallet Top-up settled [Ref:${resolvedApiRef}]`
            : gatewayState === "FAILED"
              ? `Wallet Top-up failed [Ref:${resolvedApiRef}]`
              : gatewayState === "CANCELLED"
                ? `Wallet Top-up cancelled [Ref:${resolvedApiRef}]`
                : gatewayState === "REVERSED"
                  ? `Wallet Top-up reversed [Ref:${resolvedApiRef}]`
                  : `Wallet Top-up processing [Ref:${resolvedApiRef}]`,
        metadata: {
          apiRef: resolvedApiRef,
          gatewayState,
          gatewayRawState: webhook.rawState,
          eventFamily: webhook.eventFamily,
          invoiceId: gatewayInvoiceId || null,
        },
        settledAt: gatewayState === "SETTLED" ? now : null,
        failedAt: gatewayState === "FAILED" ? now : null,
        cancelledAt: gatewayState === "CANCELLED" ? now : null,
        reversedAt: gatewayState === "REVERSED" ? now : null,
        failureReason:
          gatewayState === "FAILED" || gatewayState === "CANCELLED"
            ? webhook.failureReason || "Gateway failure"
            : gatewayState === "REVERSED"
              ? webhook.failureReason || "Gateway reversal"
              : null,
      };

      if (ledgerEntry) {
        await tx.transaction.update({
          where: { id: ledgerEntry.id },
          data: ledgerBase,
        });
      } else {
        await tx.transaction.create({
          data: ledgerBase,
        });
      }

      return {
        received: true,
        success: true,
        apiRef: resolvedApiRef,
        topUpId: topUp.id,
        previousStatus,
        status: updatedTopUp.status,
        amount:
          gatewayState === "SETTLED"
            ? effectiveAmount
            : Number(topUp.amountExpected),
      };
    });

    return NextResponse.json(outcome);
  } catch (error) {
    console.error("[WALLET_TOPUP_WEBHOOK_ERROR]", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 },
      );
    }

    if (isWalletSchemaOutOfSyncError(error)) {
      return NextResponse.json(
        {
          error: getWalletSchemaOutOfSyncMessage(),
          code: "WALLET_SCHEMA_OUT_OF_SYNC",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
