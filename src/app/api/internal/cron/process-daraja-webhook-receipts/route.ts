import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { PENDING_WEBHOOK_PROCESSED_AT } from "@/lib/payments/payment-intents";
import { POST as handleWalletWebhook } from "@/app/api/wallet/webhook/route";
import { POST as handleOnboardingWebhook } from "@/app/api/onboarding-fee/webhook/route";
import { POST as handleSubscriptionWebhook } from "@/app/api/subscription/webhook/route";

type SupportedReceiptKind = "WALLET_TOPUP" | "ONBOARDING_FEE" | "SUBSCRIPTION";

interface ProcessResult {
  ok: boolean;
  retryable: boolean;
  status: number;
  detail?: string;
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

function normalizeBatchSize(value: string | null): number {
  const parsed = Number(value || "25");
  if (!Number.isFinite(parsed)) {
    return 25;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 200);
}

function isSupportedKind(kind: string | null): kind is SupportedReceiptKind {
  return (
    kind === "WALLET_TOPUP" ||
    kind === "ONBOARDING_FEE" ||
    kind === "SUBSCRIPTION"
  );
}

function isPayloadRecord(
  payload: Prisma.JsonValue | null,
): payload is Prisma.JsonObject {
  return Boolean(
    payload && typeof payload === "object" && !Array.isArray(payload),
  );
}

function buildInternalProcessingRequest(
  requestUrl: string,
  webhookPath: string,
  payload: Prisma.JsonObject,
  receiptId: string,
  internalSecret: string,
): Request {
  const callbackToken = String(process.env.DARAJA_CALLBACK_TOKEN || "").trim();
  const origin = new URL(requestUrl).origin;
  const targetUrl = new URL(webhookPath, origin);

  if (callbackToken) {
    targetUrl.searchParams.set("token", callbackToken);
  }

  const headers = new Headers({
    "content-type": "application/json",
    "x-daraja-internal-process": "1",
    "x-daraja-internal-secret": internalSecret,
    "x-payment-webhook-receipt-id": receiptId,
  });

  if (callbackToken) {
    headers.set("x-daraja-callback-token", callbackToken);
  }

  return new Request(targetUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

async function processClaimedReceipt(
  requestUrl: string,
  receipt: {
    id: string;
    kind: string | null;
    payload: Prisma.JsonValue | null;
  },
  internalSecret: string,
): Promise<ProcessResult> {
  if (!isSupportedKind(receipt.kind)) {
    return {
      ok: false,
      retryable: false,
      status: 400,
      detail: "unsupported_receipt_kind",
    };
  }

  if (!isPayloadRecord(receipt.payload)) {
    return {
      ok: false,
      retryable: false,
      status: 400,
      detail: "invalid_payload",
    };
  }

  const webhookPath =
    receipt.kind === "WALLET_TOPUP"
      ? "/api/wallet/webhook"
      : receipt.kind === "ONBOARDING_FEE"
        ? "/api/onboarding-fee/webhook"
        : "/api/subscription/webhook";

  const processingRequest = buildInternalProcessingRequest(
    requestUrl,
    webhookPath,
    receipt.payload,
    receipt.id,
    internalSecret,
  );

  const response =
    receipt.kind === "WALLET_TOPUP"
      ? await handleWalletWebhook(processingRequest)
      : receipt.kind === "ONBOARDING_FEE"
        ? await handleOnboardingWebhook(processingRequest)
        : await handleSubscriptionWebhook(processingRequest as never);

  if (response.ok) {
    return {
      ok: true,
      retryable: false,
      status: response.status,
    };
  }

  const detail = await response
    .text()
    .then((text) => text.slice(0, 1000))
    .catch(() => "");

  return {
    ok: false,
    retryable: response.status >= 500,
    status: response.status,
    detail,
  };
}

async function runWorker(request: Request) {
  const internalSecret = String(
    process.env.DARAJA_RECONCILE_CRON_SECRET || "",
  ).trim();
  if (!internalSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "DARAJA_RECONCILE_CRON_SECRET must be configured",
      },
      { status: 400 },
    );
  }

  const secretAuthorized = hasSecretAccess(request);
  if (!secretAuthorized) {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const url = new URL(request.url);
  const batchSize = normalizeBatchSize(url.searchParams.get("batchSize"));

  const pendingReceipts = await prisma.paymentWebhookReceipt.findMany({
    where: {
      gateway: "DARAJA",
      kind: {
        in: ["WALLET_TOPUP", "ONBOARDING_FEE", "SUBSCRIPTION"],
      },
      processedAt: PENDING_WEBHOOK_PROCESSED_AT,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: batchSize,
    select: {
      id: true,
      kind: true,
      payload: true,
      dedupeKey: true,
      createdAt: true,
    },
  });

  let claimedCount = 0;
  let processedCount = 0;
  let retriedLaterCount = 0;
  const failures: Array<{
    id: string;
    kind: string | null;
    status: number;
    retryable: boolean;
    detail?: string;
  }> = [];

  for (const receipt of pendingReceipts) {
    const claimResult = await prisma.paymentWebhookReceipt.updateMany({
      where: {
        id: receipt.id,
        processedAt: PENDING_WEBHOOK_PROCESSED_AT,
      },
      data: {
        processedAt: new Date(),
      },
    });

    if (claimResult.count === 0) {
      continue;
    }

    claimedCount += 1;

    const result = await processClaimedReceipt(
      request.url,
      receipt,
      internalSecret,
    );

    if (result.ok) {
      processedCount += 1;
      continue;
    }

    failures.push({
      id: receipt.id,
      kind: receipt.kind,
      status: result.status,
      retryable: result.retryable,
      detail: result.detail,
    });

    if (result.retryable) {
      await prisma.paymentWebhookReceipt.update({
        where: { id: receipt.id },
        data: {
          processedAt: PENDING_WEBHOOK_PROCESSED_AT,
        },
      });
      retriedLaterCount += 1;
    }
  }

  const remainingPending = await prisma.paymentWebhookReceipt.count({
    where: {
      gateway: "DARAJA",
      kind: {
        in: ["WALLET_TOPUP", "ONBOARDING_FEE", "SUBSCRIPTION"],
      },
      processedAt: PENDING_WEBHOOK_PROCESSED_AT,
    },
  });

  return NextResponse.json({
    success: true,
    batchSize,
    scanned: pendingReceipts.length,
    claimed: claimedCount,
    processed: processedCount,
    retryQueued: retriedLaterCount,
    failedNonRetryable: failures.filter((entry) => !entry.retryable).length,
    remainingPending,
    failures,
  });
}

export async function GET(request: Request) {
  try {
    return await runWorker(request);
  } catch (error) {
    console.error("[DARAJA_WEBHOOK_WORKER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await runWorker(request);
  } catch (error) {
    console.error("[DARAJA_WEBHOOK_WORKER_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
