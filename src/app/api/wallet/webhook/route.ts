import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookChallenge, verifyWebhookSignature } from "@/lib/intasend";
import { Prisma } from "@/generated/prisma/client";

const LEGACY_PENDING_PREFIX = "INTASEND:WALLET:PENDING:";
const LEGACY_SETTLED_PREFIX = "INTASEND:WALLET:SETTLED:";
const CURRENT_PROVIDER_PREFIX = "INTASEND:WALLET:TOPUP:";

type CanonicalWalletEventState =
  | "PENDING"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "CANCELLED"
  | "REVERSED";

function normalizeGatewayState(rawState: unknown): CanonicalWalletEventState {
  const value = String(rawState || "")
    .trim()
    .toUpperCase();

  if (
    ["COMPLETE", "COMPLETED", "SUCCESS", "SUCCEEDED", "PAID"].includes(value)
  ) {
    return "SETTLED";
  }

  if (["FAILED", "DECLINED", "ERROR"].includes(value)) {
    return "FAILED";
  }

  if (["CANCELLED", "CANCELED", "VOID", "VOIDED"].includes(value)) {
    return "CANCELLED";
  }

  if (["REVERSED", "REFUNDED", "CHARGEBACK"].includes(value)) {
    return "REVERSED";
  }

  if (["PROCESSING", "IN_PROGRESS", "QUEUED"].includes(value)) {
    return "PROCESSING";
  }

  return "PENDING";
}

type IntaSendWebhookPayload = Record<string, unknown>;

function asObject(value: unknown): IntaSendWebhookPayload | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return value as IntaSendWebhookPayload;
}

function extractAmount(payload: IntaSendWebhookPayload): number | null {
  const invoice = asObject(payload.invoice);
  const value = Number(
    payload.value ?? invoice?.value ?? payload.amount ?? invoice?.amount,
  );

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function extractApiRef(payload: IntaSendWebhookPayload): string {
  const invoice = asObject(payload.invoice);
  return String(payload.api_ref ?? invoice?.api_ref ?? "").trim();
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

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const invoicePayload = asObject(body.invoice);
    const apiRef = extractApiRef(body);
    const gatewayState = normalizeGatewayState(
      body.state || invoicePayload?.state,
    );
    const amountFromGateway = extractAmount(body);
    const gatewayInvoiceId = String(
      body.invoice_id ?? body.id ?? invoicePayload?.invoice_id ?? "",
    ).trim();
    const gatewaySessionId = String(invoicePayload?.id ?? body.id ?? "").trim();

    if (!apiRef) {
      return NextResponse.json({
        received: true,
        skipped: true,
        reason: "missing_api_ref",
      });
    }

    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${apiRef}, 0))`;

      let topUp = await tx.walletTopUp.findUnique({
        where: { apiRef },
      });

      if (!topUp) {
        topUp = await ensureLegacyTopUp(tx, apiRef);
      }

      if (!topUp) {
        return {
          received: true,
          skipped: true,
          requiresManualResolution: true,
          reason: "missing_topup_record",
          apiRef,
        };
      }

      const previousStatus = topUp.status;

      const ledgerEntry = await tx.transaction.findFirst({
        where: {
          OR: [
            { topUpId: topUp.id },
            { providerRef: `${CURRENT_PROVIDER_PREFIX}${apiRef}` },
            { providerRef: `${LEGACY_PENDING_PREFIX}${apiRef}` },
            { providerRef: `${LEGACY_SETTLED_PREFIX}${apiRef}` },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      const effectiveAmount = amountFromGateway ?? Number(topUp.amountExpected);
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
              ? String(
                  body.failed_reason ||
                    invoicePayload?.failed_reason ||
                    body.message ||
                    "Gateway failure",
                )
              : gatewayState === "REVERSED"
                ? String(body.message || "Gateway reversal")
                : null,
          rawWebhookPayload: body as Prisma.InputJsonValue,
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
        gatewayReference: gatewayInvoiceId || apiRef,
        gatewaySessionId: gatewaySessionId || updatedTopUp.gatewaySessionId,
        providerRef: `${CURRENT_PROVIDER_PREFIX}${apiRef}`,
        sourceType: "WALLET_TOPUP",
        sourceId: topUp.id,
        createdByType: "WEBHOOK" as const,
        description:
          gatewayState === "SETTLED"
            ? `Wallet Top-up settled [Ref:${apiRef}]`
            : gatewayState === "FAILED"
              ? `Wallet Top-up failed [Ref:${apiRef}]`
              : gatewayState === "CANCELLED"
                ? `Wallet Top-up cancelled [Ref:${apiRef}]`
                : gatewayState === "REVERSED"
                  ? `Wallet Top-up reversed [Ref:${apiRef}]`
                  : `Wallet Top-up processing [Ref:${apiRef}]`,
        metadata: {
          apiRef,
          gatewayState,
          invoiceId: gatewayInvoiceId || null,
        },
        settledAt: gatewayState === "SETTLED" ? now : null,
        failedAt: gatewayState === "FAILED" ? now : null,
        cancelledAt: gatewayState === "CANCELLED" ? now : null,
        reversedAt: gatewayState === "REVERSED" ? now : null,
        failureReason:
          gatewayState === "FAILED" || gatewayState === "CANCELLED"
            ? String(
                body.failed_reason ||
                  invoicePayload?.failed_reason ||
                  body.message ||
                  "Gateway failure",
              )
            : gatewayState === "REVERSED"
              ? String(body.message || "Gateway reversal")
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
        apiRef,
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
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
