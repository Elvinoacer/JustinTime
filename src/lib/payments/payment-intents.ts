import crypto from "crypto";
import { Prisma } from "@/generated/prisma/client";
import { CanonicalDarajaState } from "@/lib/daraja-webhook";

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isMissingIntentSchemaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = String(error.message || "").toLowerCase();
  return (
    message.includes('relation "paymentintent" does not exist') ||
    message.includes('relation "paymentwebhookreceipt" does not exist') ||
    message.includes('type "paymentintentkind" does not exist') ||
    message.includes('type "paymentintentstatus" does not exist')
  );
}

function mapToIntentStatus(state: CanonicalDarajaState): string {
  switch (state) {
    case "SETTLED":
      return "VERIFIED_COMPLETE";
    case "FAILED":
      return "VERIFIED_FAILED";
    case "CANCELLED":
      return "VERIFIED_CANCELLED";
    case "REVERSED":
      return "VERIFIED_REVERSED";
    case "PROCESSING":
      return "PROCESSING";
    default:
      return "PENDING";
  }
}

export type SupportedPaymentIntentKind =
  | "WALLET_TOPUP"
  | "ONBOARDING_FEE"
  | "SUBSCRIPTION";

interface EnsurePaymentIntentInput {
  kind: SupportedPaymentIntentKind;
  userId: string;
  walletId?: string | null;
  apiRef: string;
  amountExpected: number;
  currency: string;
  sourceType: string;
  sourceId: string;
  gatewaySessionId?: string | null;
  gatewayInvoiceId?: string | null;
  providerRef?: string | null;
  initiationPayload?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

async function ensurePaymentIntent(
  tx: Prisma.TransactionClient,
  input: EnsurePaymentIntentInput,
): Promise<{ id: string | null; schemaReady: boolean }> {
  try {
    const kindSql = Prisma.sql`${input.kind}::"PaymentIntentKind"`;

    const rows = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        INSERT INTO "PaymentIntent" (
          "id",
          "kind",
          "status",
          "gateway",
          "userId",
          "walletId",
          "apiRef",
          "invoiceId",
          "gatewaySessionId",
          "providerRef",
          "amountExpected",
          "currency",
          "sourceType",
          "sourceId",
          "rawInitiationPayload",
          "metadata",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${createId("pi")},
          ${kindSql},
          ${"PENDING"}::"PaymentIntentStatus",
          ${"DARAJA"}::"WalletGateway",
          ${input.userId},
          ${input.walletId || null},
          ${input.apiRef},
          ${input.gatewayInvoiceId || null},
          ${input.gatewaySessionId || null},
          ${input.providerRef || null},
          ${input.amountExpected},
          ${input.currency || "KES"},
          ${input.sourceType},
          ${input.sourceId},
          ${input.initiationPayload ? JSON.stringify(input.initiationPayload) : null}::jsonb,
          ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("gateway", "apiRef") DO UPDATE
        SET
          "walletId" = COALESCE("PaymentIntent"."walletId", EXCLUDED."walletId"),
          "invoiceId" = COALESCE("PaymentIntent"."invoiceId", EXCLUDED."invoiceId"),
          "gatewaySessionId" = COALESCE("PaymentIntent"."gatewaySessionId", EXCLUDED."gatewaySessionId"),
          "providerRef" = COALESCE("PaymentIntent"."providerRef", EXCLUDED."providerRef"),
          "sourceType" = COALESCE("PaymentIntent"."sourceType", EXCLUDED."sourceType"),
          "sourceId" = COALESCE("PaymentIntent"."sourceId", EXCLUDED."sourceId"),
          "rawInitiationPayload" = COALESCE("PaymentIntent"."rawInitiationPayload", EXCLUDED."rawInitiationPayload"),
          "metadata" = COALESCE("PaymentIntent"."metadata", EXCLUDED."metadata"),
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "id";
      `,
    );

    return {
      id: rows[0]?.id || null,
      schemaReady: true,
    };
  } catch (error) {
    if (isMissingIntentSchemaError(error)) {
      return { id: null, schemaReady: false };
    }

    throw error;
  }
}

interface UpdatePaymentIntentFromWebhookInput {
  kind: SupportedPaymentIntentKind;
  userId: string;
  walletId?: string | null;
  sourceType: string;
  sourceId: string;
  apiRef: string;
  amountExpected: number;
  amountReceived?: number | null;
  currency: string;
  gatewayState: CanonicalDarajaState;
  gatewayInvoiceId?: string | null;
  gatewaySessionId?: string | null;
  providerRef?: string | null;
  failureReason?: string | null;
  payload: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue | null;
}

async function updatePaymentIntentFromWebhook(
  tx: Prisma.TransactionClient,
  input: UpdatePaymentIntentFromWebhookInput,
): Promise<{ id: string | null; schemaReady: boolean }> {
  const status = mapToIntentStatus(input.gatewayState);
  const now = new Date();
  const receivedAmount =
    typeof input.amountReceived === "number" &&
    Number.isFinite(input.amountReceived)
      ? input.amountReceived
      : null;

  try {
    const kindSql = Prisma.sql`${input.kind}::"PaymentIntentKind"`;

    const rows = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        INSERT INTO "PaymentIntent" (
          "id",
          "kind",
          "status",
          "gateway",
          "userId",
          "walletId",
          "apiRef",
          "invoiceId",
          "gatewaySessionId",
          "providerRef",
          "amountExpected",
          "amountReceived",
          "currency",
          "sourceType",
          "sourceId",
          "verifiedAt",
          "failedAt",
          "cancelledAt",
          "reversedAt",
          "failureReason",
          "rawLastWebhookPayload",
          "metadata",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${createId("pi")},
          ${kindSql},
          ${status}::"PaymentIntentStatus",
          ${"DARAJA"}::"WalletGateway",
          ${input.userId},
          ${input.walletId || null},
          ${input.apiRef},
          ${input.gatewayInvoiceId || null},
          ${input.gatewaySessionId || null},
          ${input.providerRef || null},
          ${input.amountExpected},
          ${receivedAmount},
          ${input.currency || "KES"},
          ${input.sourceType},
          ${input.sourceId},
          ${input.gatewayState === "SETTLED" ? now : null},
          ${input.gatewayState === "FAILED" ? now : null},
          ${input.gatewayState === "CANCELLED" ? now : null},
          ${input.gatewayState === "REVERSED" ? now : null},
          ${
            input.gatewayState === "FAILED" ||
            input.gatewayState === "CANCELLED" ||
            input.gatewayState === "REVERSED"
              ? input.failureReason || null
              : null
          },
          ${JSON.stringify(input.payload || {})}::jsonb,
          ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("gateway", "apiRef") DO UPDATE
        SET
          "status" = EXCLUDED."status",
          "invoiceId" = COALESCE(EXCLUDED."invoiceId", "PaymentIntent"."invoiceId"),
          "gatewaySessionId" = COALESCE(EXCLUDED."gatewaySessionId", "PaymentIntent"."gatewaySessionId"),
          "providerRef" = COALESCE(EXCLUDED."providerRef", "PaymentIntent"."providerRef"),
          "sourceType" = COALESCE(EXCLUDED."sourceType", "PaymentIntent"."sourceType"),
          "sourceId" = COALESCE(EXCLUDED."sourceId", "PaymentIntent"."sourceId"),
          "amountReceived" = COALESCE(EXCLUDED."amountReceived", "PaymentIntent"."amountReceived"),
          "verifiedAt" = COALESCE(EXCLUDED."verifiedAt", "PaymentIntent"."verifiedAt"),
          "failedAt" = COALESCE(EXCLUDED."failedAt", "PaymentIntent"."failedAt"),
          "cancelledAt" = COALESCE(EXCLUDED."cancelledAt", "PaymentIntent"."cancelledAt"),
          "reversedAt" = COALESCE(EXCLUDED."reversedAt", "PaymentIntent"."reversedAt"),
          "failureReason" = EXCLUDED."failureReason",
          "rawLastWebhookPayload" = EXCLUDED."rawLastWebhookPayload",
          "metadata" = COALESCE(EXCLUDED."metadata", "PaymentIntent"."metadata"),
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "id";
      `,
    );

    return {
      id: rows[0]?.id || null,
      schemaReady: true,
    };
  } catch (error) {
    if (isMissingIntentSchemaError(error)) {
      return { id: null, schemaReady: false };
    }

    throw error;
  }
}

export interface EnsureWalletTopUpIntentInput {
  userId: string;
  walletId: string;
  topUpId: string;
  apiRef: string;
  amountExpected: number;
  currency: string;
  gatewaySessionId?: string | null;
  gatewayInvoiceId?: string | null;
  providerRef?: string | null;
  initiationPayload?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

export async function ensureWalletTopUpPaymentIntent(
  tx: Prisma.TransactionClient,
  input: EnsureWalletTopUpIntentInput,
): Promise<{ id: string | null; schemaReady: boolean }> {
  return ensurePaymentIntent(tx, {
    kind: "WALLET_TOPUP",
    userId: input.userId,
    walletId: input.walletId,
    apiRef: input.apiRef,
    amountExpected: input.amountExpected,
    currency: input.currency,
    sourceType: "WALLET_TOPUP",
    sourceId: input.topUpId,
    gatewaySessionId: input.gatewaySessionId,
    gatewayInvoiceId: input.gatewayInvoiceId,
    providerRef: input.providerRef || `DARAJA:WALLET:TOPUP:${input.apiRef}`,
    initiationPayload: input.initiationPayload,
    metadata: input.metadata,
  });
}

export interface EnsureOnboardingFeeIntentInput {
  userId: string;
  walletId?: string | null;
  apiRef: string;
  amountExpected: number;
  currency: string;
  sourceId: string;
  gatewaySessionId?: string | null;
  gatewayInvoiceId?: string | null;
  providerRef?: string | null;
  initiationPayload?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

export async function ensureOnboardingFeePaymentIntent(
  tx: Prisma.TransactionClient,
  input: EnsureOnboardingFeeIntentInput,
): Promise<{ id: string | null; schemaReady: boolean }> {
  return ensurePaymentIntent(tx, {
    kind: "ONBOARDING_FEE",
    userId: input.userId,
    walletId: input.walletId || null,
    apiRef: input.apiRef,
    amountExpected: input.amountExpected,
    currency: input.currency,
    sourceType: "ONBOARDING_FEE",
    sourceId: input.sourceId,
    gatewaySessionId: input.gatewaySessionId,
    gatewayInvoiceId: input.gatewayInvoiceId,
    providerRef: input.providerRef,
    initiationPayload: input.initiationPayload,
    metadata: input.metadata,
  });
}

export interface EnsureSubscriptionIntentInput {
  userId: string;
  walletId?: string | null;
  apiRef: string;
  amountExpected: number;
  currency: string;
  sourceId: string;
  gatewaySessionId?: string | null;
  gatewayInvoiceId?: string | null;
  providerRef?: string | null;
  initiationPayload?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

export async function ensureSubscriptionPaymentIntent(
  tx: Prisma.TransactionClient,
  input: EnsureSubscriptionIntentInput,
): Promise<{ id: string | null; schemaReady: boolean }> {
  return ensurePaymentIntent(tx, {
    kind: "SUBSCRIPTION",
    userId: input.userId,
    walletId: input.walletId || null,
    apiRef: input.apiRef,
    amountExpected: input.amountExpected,
    currency: input.currency,
    sourceType: "SUBSCRIPTION",
    sourceId: input.sourceId,
    gatewaySessionId: input.gatewaySessionId,
    gatewayInvoiceId: input.gatewayInvoiceId,
    providerRef: input.providerRef,
    initiationPayload: input.initiationPayload,
    metadata: input.metadata,
  });
}

export interface RecordWebhookReceiptInput {
  intentId?: string | null;
  apiRef?: string | null;
  invoiceId?: string | null;
  rawState?: string | null;
  dedupeKey: string;
  payload: unknown;
  rawBody?: string;
  kind?: SupportedPaymentIntentKind | null;
}

export async function recordPaymentWebhookReceipt(
  tx: Prisma.TransactionClient,
  input: RecordWebhookReceiptInput,
): Promise<{ id: string | null; duplicate: boolean; schemaReady: boolean }> {
  const payloadHash = crypto
    .createHash("sha256")
    .update(input.rawBody || JSON.stringify(input.payload || {}))
    .digest("hex");

  try {
    const kindSql = input.kind
      ? Prisma.sql`${input.kind}::"PaymentIntentKind"`
      : Prisma.sql`NULL`;

    const rows = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        INSERT INTO "PaymentWebhookReceipt" (
          "id",
          "gateway",
          "kind",
          "intentId",
          "apiRef",
          "invoiceId",
          "rawState",
          "dedupeKey",
          "payloadHash",
          "payload",
          "processedAt",
          "createdAt"
        )
        VALUES (
          ${createId("pwr")},
          ${"DARAJA"}::"WalletGateway",
          ${kindSql},
          ${input.intentId || null},
          ${input.apiRef || null},
          ${input.invoiceId || null},
          ${input.rawState || null},
          ${input.dedupeKey},
          ${payloadHash},
          ${JSON.stringify(input.payload || {})}::jsonb,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("dedupeKey") DO NOTHING
        RETURNING "id";
      `,
    );

    return {
      id: rows[0]?.id || null,
      duplicate: rows.length === 0,
      schemaReady: true,
    };
  } catch (error) {
    if (isMissingIntentSchemaError(error)) {
      return {
        id: null,
        duplicate: false,
        schemaReady: false,
      };
    }

    throw error;
  }
}

export interface UpdateWalletIntentFromWebhookInput {
  userId: string;
  walletId: string;
  topUpId: string;
  apiRef: string;
  amountExpected: number;
  amountReceived?: number | null;
  currency: string;
  gatewayState: CanonicalDarajaState;
  gatewayInvoiceId?: string | null;
  gatewaySessionId?: string | null;
  providerRef?: string | null;
  failureReason?: string | null;
  payload: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue | null;
}

export async function updateWalletTopUpPaymentIntentFromWebhook(
  tx: Prisma.TransactionClient,
  input: UpdateWalletIntentFromWebhookInput,
): Promise<{ id: string | null; schemaReady: boolean }> {
  return updatePaymentIntentFromWebhook(tx, {
    kind: "WALLET_TOPUP",
    userId: input.userId,
    walletId: input.walletId,
    sourceType: "WALLET_TOPUP",
    sourceId: input.topUpId,
    apiRef: input.apiRef,
    amountExpected: input.amountExpected,
    amountReceived: input.amountReceived,
    currency: input.currency,
    gatewayState: input.gatewayState,
    gatewayInvoiceId: input.gatewayInvoiceId,
    gatewaySessionId: input.gatewaySessionId,
    providerRef: input.providerRef || `DARAJA:WALLET:TOPUP:${input.apiRef}`,
    failureReason: input.failureReason,
    payload: input.payload,
    metadata: input.metadata,
  });
}

export interface UpdateOnboardingFeeIntentFromWebhookInput {
  userId: string;
  walletId?: string | null;
  sourceId: string;
  apiRef: string;
  amountExpected: number;
  amountReceived?: number | null;
  currency: string;
  gatewayState: CanonicalDarajaState;
  gatewayInvoiceId?: string | null;
  gatewaySessionId?: string | null;
  providerRef?: string | null;
  failureReason?: string | null;
  payload: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue | null;
}

export async function updateOnboardingFeePaymentIntentFromWebhook(
  tx: Prisma.TransactionClient,
  input: UpdateOnboardingFeeIntentFromWebhookInput,
): Promise<{ id: string | null; schemaReady: boolean }> {
  return updatePaymentIntentFromWebhook(tx, {
    kind: "ONBOARDING_FEE",
    userId: input.userId,
    walletId: input.walletId || null,
    sourceType: "ONBOARDING_FEE",
    sourceId: input.sourceId,
    apiRef: input.apiRef,
    amountExpected: input.amountExpected,
    amountReceived: input.amountReceived,
    currency: input.currency,
    gatewayState: input.gatewayState,
    gatewayInvoiceId: input.gatewayInvoiceId,
    gatewaySessionId: input.gatewaySessionId,
    providerRef: input.providerRef,
    failureReason: input.failureReason,
    payload: input.payload,
    metadata: input.metadata,
  });
}

export interface UpdateSubscriptionIntentFromWebhookInput {
  userId: string;
  walletId?: string | null;
  sourceId: string;
  apiRef: string;
  amountExpected: number;
  amountReceived?: number | null;
  currency: string;
  gatewayState: CanonicalDarajaState;
  gatewayInvoiceId?: string | null;
  gatewaySessionId?: string | null;
  providerRef?: string | null;
  failureReason?: string | null;
  payload: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue | null;
}

export async function updateSubscriptionPaymentIntentFromWebhook(
  tx: Prisma.TransactionClient,
  input: UpdateSubscriptionIntentFromWebhookInput,
): Promise<{ id: string | null; schemaReady: boolean }> {
  return updatePaymentIntentFromWebhook(tx, {
    kind: "SUBSCRIPTION",
    userId: input.userId,
    walletId: input.walletId || null,
    sourceType: "SUBSCRIPTION",
    sourceId: input.sourceId,
    apiRef: input.apiRef,
    amountExpected: input.amountExpected,
    amountReceived: input.amountReceived,
    currency: input.currency,
    gatewayState: input.gatewayState,
    gatewayInvoiceId: input.gatewayInvoiceId,
    gatewaySessionId: input.gatewaySessionId,
    providerRef: input.providerRef,
    failureReason: input.failureReason,
    payload: input.payload,
    metadata: input.metadata,
  });
}

export function buildPaymentWebhookDedupeKey(params: {
  kind: SupportedPaymentIntentKind;
  apiRef?: string | null;
  invoiceId?: string | null;
  rawState?: string | null;
  state: CanonicalDarajaState;
}): string {
  const ref =
    String(params.apiRef || "")
      .trim()
      .toLowerCase() || "na";
  const invoice =
    String(params.invoiceId || "")
      .trim()
      .toLowerCase() || "na";
  const rawState =
    String(params.rawState || "")
      .trim()
      .toUpperCase() || "NA";
  return `DARAJA:${params.kind}:${ref}:${invoice}:${rawState}:${params.state}`;
}

export function buildWalletWebhookDedupeKey(params: {
  apiRef?: string | null;
  invoiceId?: string | null;
  rawState?: string | null;
  state: CanonicalDarajaState;
}): string {
  return buildPaymentWebhookDedupeKey({
    kind: "WALLET_TOPUP",
    apiRef: params.apiRef,
    invoiceId: params.invoiceId,
    rawState: params.rawState,
    state: params.state,
  });
}
