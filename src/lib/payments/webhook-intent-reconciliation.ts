import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

export type ReconciliationIntentKind =
  | "WALLET_TOPUP"
  | "ONBOARDING_FEE"
  | "SUBSCRIPTION";

export type ReconciliationIntentStatus =
  | "PENDING"
  | "PROCESSING"
  | "VERIFIED_COMPLETE"
  | "VERIFIED_FAILED"
  | "VERIFIED_CANCELLED"
  | "VERIFIED_REVERSED"
  | "UNKNOWN";

const TRACKED_KINDS: ReconciliationIntentKind[] = [
  "WALLET_TOPUP",
  "ONBOARDING_FEE",
  "SUBSCRIPTION",
];

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

function metadataReason(metadata: Prisma.JsonValue | null | undefined): string {
  if (!metadata) {
    return "";
  }

  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        typeof (parsed as Record<string, unknown>).reason === "string"
      ) {
        return (parsed as Record<string, unknown>).reason as string;
      }
    } catch {
      return "";
    }

    return "";
  }

  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }

  const reason = (metadata as Record<string, unknown>).reason;
  return typeof reason === "string" ? reason : "";
}

function toIntentKind(
  kind: string | null,
): ReconciliationIntentKind | "UNKNOWN" {
  if (kind === "WALLET_TOPUP") return "WALLET_TOPUP";
  if (kind === "ONBOARDING_FEE") return "ONBOARDING_FEE";
  if (kind === "SUBSCRIPTION") return "SUBSCRIPTION";
  return "UNKNOWN";
}

function toIntentStatus(status: string): ReconciliationIntentStatus {
  if (status === "PENDING") return "PENDING";
  if (status === "PROCESSING") return "PROCESSING";
  if (status === "VERIFIED_COMPLETE") return "VERIFIED_COMPLETE";
  if (status === "VERIFIED_FAILED") return "VERIFIED_FAILED";
  if (status === "VERIFIED_CANCELLED") return "VERIFIED_CANCELLED";
  if (status === "VERIFIED_REVERSED") return "VERIFIED_REVERSED";
  return "UNKNOWN";
}

export interface WebhookIntentReconciliationOptions {
  limit?: number;
  lookbackHours?: number;
}

export interface UnmatchedWebhookReceiptRow {
  id: string;
  kind: ReconciliationIntentKind | "UNKNOWN";
  apiRef: string | null;
  invoiceId: string | null;
  rawState: string | null;
  dedupeKey: string;
  processedAt: Date | string;
  mismatchReason:
    | "missing_references"
    | "intent_not_found_for_api_ref"
    | "intent_not_found_for_invoice";
}

export interface VerificationFailedIntentRow {
  id: string;
  kind: ReconciliationIntentKind;
  status: ReconciliationIntentStatus;
  userId: string;
  apiRef: string;
  invoiceId: string | null;
  providerRef: string | null;
  amountExpected: number;
  amountReceived: number | null;
  currency: string;
  failureReason: string | null;
  metadataReason: string | null;
  sourceType: string | null;
  sourceId: string | null;
  hasRecentWebhookReceipt: boolean;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface WebhookIntentReconciliationResult {
  generatedAt: string;
  schemaReady: boolean;
  limit: number;
  lookbackHours: number;
  lookbackStartedAt: string;
  scannedReceipts: number;
  scannedIntents: number;
  unmatchedReceiptCount: number;
  verificationFailedIntentCount: number;
  unmatchedReceipts: UnmatchedWebhookReceiptRow[];
  verificationFailedIntents: VerificationFailedIntentRow[];
}

interface ReceiptRow {
  id: string;
  kind: string | null;
  intentId: string | null;
  apiRef: string | null;
  invoiceId: string | null;
  rawState: string | null;
  dedupeKey: string;
  processedAt: Date;
}

interface IntentRefRow {
  id: string;
  apiRef: string;
  invoiceId: string | null;
}

interface IntentCandidateRow {
  id: string;
  kind: string;
  status: string;
  userId: string;
  apiRef: string;
  invoiceId: string | null;
  providerRef: string | null;
  amountExpected: string | number;
  amountReceived: string | number | null;
  currency: string;
  failureReason: string | null;
  metadata: Prisma.JsonValue | null;
  sourceType: string | null;
  sourceId: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export async function getWebhookIntentReconciliation(
  options: WebhookIntentReconciliationOptions = {},
): Promise<WebhookIntentReconciliationResult> {
  const safeLimit = Math.min(Math.max(options.limit ?? 50, 10), 250);
  const safeLookbackHours = Math.min(
    Math.max(options.lookbackHours ?? 72, 1),
    24 * 30,
  );

  const lookbackStartedAt = new Date(
    Date.now() - safeLookbackHours * 60 * 60 * 1000,
  );

  const scanCap = Math.min(safeLimit * 10, 2500);

  try {
    const receipts = await prisma.$queryRaw<ReceiptRow[]>(Prisma.sql`
      SELECT
        r."id",
        r."kind"::text AS "kind",
        r."intentId",
        r."apiRef",
        r."invoiceId",
        r."rawState",
        r."dedupeKey",
        r."processedAt"
      FROM "PaymentWebhookReceipt" r
      WHERE r."gateway"::text IN ('DARAJA', 'INTASEND')
        AND r."createdAt" >= ${lookbackStartedAt}
        AND (
          r."kind" IS NULL
          OR r."kind"::text IN ('WALLET_TOPUP', 'ONBOARDING_FEE', 'SUBSCRIPTION')
        )
      ORDER BY r."createdAt" DESC
      LIMIT ${scanCap};
    `);

    const receiptApiRefs = Array.from(
      new Set(
        receipts
          .map((row: ReceiptRow) => row.apiRef)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const receiptInvoiceIds = Array.from(
      new Set(
        receipts
          .map((row: ReceiptRow) => row.invoiceId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    let intentsByReceiptRefs: IntentRefRow[] = [];

    if (receiptApiRefs.length > 0 || receiptInvoiceIds.length > 0) {
      const apiRefCondition =
        receiptApiRefs.length > 0
          ? Prisma.sql`i."apiRef" IN (${Prisma.join(receiptApiRefs)})`
          : Prisma.sql`FALSE`;

      const invoiceCondition =
        receiptInvoiceIds.length > 0
          ? Prisma.sql`i."invoiceId" IN (${Prisma.join(receiptInvoiceIds)})`
          : Prisma.sql`FALSE`;

      intentsByReceiptRefs = await prisma.$queryRaw<IntentRefRow[]>(Prisma.sql`
        SELECT
          i."id",
          i."apiRef",
          i."invoiceId"
        FROM "PaymentIntent" i
        WHERE i."gateway"::text IN ('DARAJA', 'INTASEND')
          AND i."kind"::text IN ('WALLET_TOPUP', 'ONBOARDING_FEE', 'SUBSCRIPTION')
          AND (${apiRefCondition} OR ${invoiceCondition})
        ORDER BY i."updatedAt" DESC;
      `);
    }

    const intentByApiRef = new Map<string, string>();
    const intentByInvoiceId = new Map<string, string>();

    for (const intent of intentsByReceiptRefs) {
      if (intent.apiRef && !intentByApiRef.has(intent.apiRef)) {
        intentByApiRef.set(intent.apiRef, intent.id);
      }
      if (intent.invoiceId && !intentByInvoiceId.has(intent.invoiceId)) {
        intentByInvoiceId.set(intent.invoiceId, intent.id);
      }
    }

    const unmatchedReceipts: UnmatchedWebhookReceiptRow[] = [];

    for (const row of receipts) {
      if (row.intentId) {
        continue;
      }

      const matchedByApiRef = row.apiRef
        ? intentByApiRef.get(row.apiRef)
        : null;
      const matchedByInvoiceId = row.invoiceId
        ? intentByInvoiceId.get(row.invoiceId)
        : null;

      if (matchedByApiRef || matchedByInvoiceId) {
        continue;
      }

      const mismatchReason =
        !row.apiRef && !row.invoiceId
          ? "missing_references"
          : row.apiRef
            ? "intent_not_found_for_api_ref"
            : "intent_not_found_for_invoice";

      unmatchedReceipts.push({
        id: row.id,
        kind: toIntentKind(row.kind),
        apiRef: row.apiRef,
        invoiceId: row.invoiceId,
        rawState: row.rawState,
        dedupeKey: row.dedupeKey,
        processedAt: row.processedAt,
        mismatchReason,
      });
    }

    const intentCandidates = await prisma.$queryRaw<
      IntentCandidateRow[]
    >(Prisma.sql`
      SELECT
        i."id",
        i."kind"::text AS "kind",
        i."status"::text AS "status",
        i."userId",
        i."apiRef",
        i."invoiceId",
        i."providerRef",
        i."amountExpected"::text AS "amountExpected",
        i."amountReceived"::text AS "amountReceived",
        i."currency",
        i."failureReason",
        i."metadata",
        i."sourceType",
        i."sourceId",
        i."updatedAt",
        i."createdAt"
      FROM "PaymentIntent" i
      WHERE i."gateway"::text IN ('DARAJA', 'INTASEND')
        AND i."kind"::text IN ('WALLET_TOPUP', 'ONBOARDING_FEE', 'SUBSCRIPTION')
        AND i."updatedAt" >= ${lookbackStartedAt}
        AND i."status"::text IN ('VERIFIED_FAILED', 'PROCESSING')
      ORDER BY i."updatedAt" DESC
      LIMIT ${scanCap};
    `);

    const receiptApiRefSet = new Set(receiptApiRefs);
    const receiptInvoiceSet = new Set(receiptInvoiceIds);

    const verificationFailedIntents: VerificationFailedIntentRow[] =
      intentCandidates
        .filter((row: IntentCandidateRow) => {
          if (row.status === "VERIFIED_FAILED") {
            return true;
          }

          const failure = String(row.failureReason || "").toLowerCase();
          const reason = metadataReason(row.metadata).toLowerCase();

          return (
            failure.includes("verification") ||
            reason.includes("verification") ||
            reason === "provider_status_verification_failed"
          );
        })
        .map((row: IntentCandidateRow) => ({
          id: row.id,
          kind: toIntentKind(row.kind) as ReconciliationIntentKind,
          status: toIntentStatus(row.status),
          userId: row.userId,
          apiRef: row.apiRef,
          invoiceId: row.invoiceId,
          providerRef: row.providerRef,
          amountExpected: Number(row.amountExpected),
          amountReceived:
            row.amountReceived != null ? Number(row.amountReceived) : null,
          currency: row.currency,
          failureReason: row.failureReason,
          metadataReason: metadataReason(row.metadata) || null,
          sourceType: row.sourceType,
          sourceId: row.sourceId,
          hasRecentWebhookReceipt:
            receiptApiRefSet.has(row.apiRef) ||
            Boolean(row.invoiceId && receiptInvoiceSet.has(row.invoiceId)),
          updatedAt: row.updatedAt,
          createdAt: row.createdAt,
        }));

    return {
      generatedAt: new Date().toISOString(),
      schemaReady: true,
      limit: safeLimit,
      lookbackHours: safeLookbackHours,
      lookbackStartedAt: lookbackStartedAt.toISOString(),
      scannedReceipts: receipts.length,
      scannedIntents: intentCandidates.length,
      unmatchedReceiptCount: unmatchedReceipts.length,
      verificationFailedIntentCount: verificationFailedIntents.length,
      unmatchedReceipts: unmatchedReceipts.slice(0, safeLimit),
      verificationFailedIntents: verificationFailedIntents.slice(0, safeLimit),
    };
  } catch (error) {
    if (!isMissingIntentSchemaError(error)) {
      throw error;
    }

    return {
      generatedAt: new Date().toISOString(),
      schemaReady: false,
      limit: safeLimit,
      lookbackHours: safeLookbackHours,
      lookbackStartedAt: lookbackStartedAt.toISOString(),
      scannedReceipts: 0,
      scannedIntents: 0,
      unmatchedReceiptCount: 0,
      verificationFailedIntentCount: 0,
      unmatchedReceipts: [],
      verificationFailedIntents: [],
    };
  }
}
