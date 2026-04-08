export type CanonicalIntaSendState =
  | "PENDING"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "CANCELLED"
  | "REVERSED";

export type IntaSendEventFamily =
  | "COLLECTION"
  | "SEND_MONEY"
  | "CHARGEBACK"
  | "WALLET_TRANSFER"
  | "SUBSCRIPTION"
  | "UNKNOWN";

export type IntaSendWebhookPayload = Record<string, unknown>;

export interface IntaSendWebhookContext {
  invoice?: IntaSendWebhookPayload;
  payment?: IntaSendWebhookPayload;
  transaction?: IntaSendWebhookPayload;
  eventFamily: IntaSendEventFamily;
  eventHint: string;
  rawState: string;
  state: CanonicalIntaSendState;
  apiRef: string | null;
  primaryReference: string | null;
  referenceCandidates: string[];
  invoiceId: string | null;
  sessionId: string | null;
  amount: number | null;
  failureReason: string | null;
}

const SUCCESS_STATES = new Set([
  "COMPLETE",
  "COMPLETED",
  "SUCCESS",
  "SUCCEEDED",
  "SUCCESSFUL",
  "PAID",
  "SETTLED",
  "APPROVED",
]);

const FAILED_STATES = new Set([
  "FAILED",
  "FAIL",
  "ERROR",
  "DECLINED",
  "REJECTED",
  "EXPIRED",
  "TIMED_OUT",
  "TIMEOUT",
  "ABANDONED",
]);

const CANCELLED_STATES = new Set([
  "CANCELLED",
  "CANCELED",
  "VOID",
  "VOIDED",
  "ABORTED",
]);

const PROCESSING_STATES = new Set([
  "PROCESSING",
  "IN_PROGRESS",
  "QUEUED",
  "PENDING_APPROVAL",
  "APPROVAL_PENDING",
  "INITIATED",
  "SUBMITTED",
]);

const REVERSED_STATES = new Set([
  "REVERSED",
  "REFUNDED",
  "CHARGEBACK",
  "CHARGED_BACK",
]);

function asObject(value: unknown): IntaSendWebhookPayload | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return value as IntaSendWebhookPayload;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return null;
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function pushUnique(values: string[], candidate: unknown) {
  const normalized = asString(candidate);
  if (!normalized) {
    return;
  }

  if (!values.includes(normalized)) {
    values.push(normalized);
  }
}

function collectReferenceCandidates(payload: IntaSendWebhookPayload): string[] {
  const invoice = asObject(payload.invoice);
  const payment = asObject(payload.payment);
  const transaction = asObject(payload.transaction);
  const transactions = Array.isArray(payload.transactions)
    ? payload.transactions
    : [];

  const refs: string[] = [];

  const topLevelKeys = [
    "api_ref",
    "request_reference_id",
    "reference_id",
    "reference",
    "tracking_id",
    "batch_reference",
    "merchant_reference",
    "external_reference",
    "invoice_id",
    "id",
    "subscription_id",
    "wallet_id",
    "chargeback_id",
  ] as const;

  for (const key of topLevelKeys) {
    pushUnique(refs, payload[key]);
  }

  const nestedKeys = [
    "api_ref",
    "request_reference_id",
    "reference_id",
    "reference",
    "tracking_id",
    "invoice_id",
    "id",
  ] as const;

  for (const key of nestedKeys) {
    pushUnique(refs, invoice?.[key]);
    pushUnique(refs, payment?.[key]);
    pushUnique(refs, transaction?.[key]);
  }

  for (const row of transactions) {
    const tx = asObject(row);
    if (!tx) {
      continue;
    }

    for (const key of nestedKeys) {
      pushUnique(refs, tx[key]);
    }
  }

  return refs;
}

function detectEventFamily(payload: IntaSendWebhookPayload): {
  family: IntaSendEventFamily;
  hint: string;
} {
  const eventHint = [
    asString(payload.event),
    asString(payload.event_type),
    asString(payload.type),
    asString(payload.category),
    asString(payload.topic),
    asString(payload.object),
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  if (asString(payload.chargeback_id) || eventHint.includes("CHARGEBACK")) {
    return { family: "CHARGEBACK", hint: eventHint };
  }

  if (
    asString(payload.batch_reference) ||
    Array.isArray(payload.transactions) ||
    eventHint.includes("SEND_MONEY") ||
    eventHint.includes("DISBURSE")
  ) {
    return { family: "SEND_MONEY", hint: eventHint };
  }

  if (
    asString(payload.wallet_id) &&
    (payload.transfer_amount != null || payload.new_balance != null)
  ) {
    return { family: "WALLET_TRANSFER", hint: eventHint };
  }

  if (asString(payload.subscription_id) || eventHint.includes("SUBSCRIPTION")) {
    return { family: "SUBSCRIPTION", hint: eventHint };
  }

  if (asString(payload.invoice_id) || asObject(payload.invoice)) {
    return { family: "COLLECTION", hint: eventHint };
  }

  return { family: "UNKNOWN", hint: eventHint };
}

function pickState(payload: IntaSendWebhookPayload): string {
  const invoice = asObject(payload.invoice);
  const payment = asObject(payload.payment);
  const transaction = asObject(payload.transaction);

  const state =
    asString(payload.state) ||
    asString(payload.status) ||
    asString(payload.payment_state) ||
    asString(payload.payment_status) ||
    asString(payment?.state) ||
    asString(payment?.status) ||
    asString(invoice?.state) ||
    asString(invoice?.status) ||
    asString(transaction?.state) ||
    asString(transaction?.status) ||
    "";

  return state;
}

export function normalizeIntaSendState(
  rawState: unknown,
  eventFamily: IntaSendEventFamily = "UNKNOWN",
): CanonicalIntaSendState {
  const value = normalizeToken(asString(rawState) || "");

  if (!value) {
    return "PENDING";
  }

  if (eventFamily === "CHARGEBACK") {
    if (
      value.includes("PENDING") ||
      value.includes("REVIEW") ||
      value.includes("INVESTIGAT") ||
      value.includes("OPEN")
    ) {
      return "PROCESSING";
    }

    if (
      value.includes("CANCEL") ||
      value.includes("REJECT") ||
      value.includes("DECLIN") ||
      value.includes("DISMISS")
    ) {
      // Chargeback cancelled/rejected means the original transaction remains settled.
      return "SETTLED";
    }

    if (
      value.includes("COMPLETE") ||
      value.includes("SUCCESS") ||
      value.includes("APPROV") ||
      value.includes("RESOLV") ||
      value.includes("WON")
    ) {
      return "REVERSED";
    }
  }

  if (SUCCESS_STATES.has(value)) {
    return "SETTLED";
  }

  if (FAILED_STATES.has(value)) {
    return "FAILED";
  }

  if (CANCELLED_STATES.has(value)) {
    return "CANCELLED";
  }

  if (REVERSED_STATES.has(value) || value.includes("CHARGEBACK")) {
    return "REVERSED";
  }

  if (
    PROCESSING_STATES.has(value) ||
    value.includes("PROCESS") ||
    value.includes("QUEUE")
  ) {
    return "PROCESSING";
  }

  if (value.includes("PENDING")) {
    return "PENDING";
  }

  return "PENDING";
}

function extractAmount(payload: IntaSendWebhookPayload): number | null {
  const invoice = asObject(payload.invoice);
  const payment = asObject(payload.payment);
  const transaction = asObject(payload.transaction);

  const candidates = [
    payload.value,
    payload.net_amount,
    payload.amount,
    payload.transfer_amount,
    payload.actual_charges,
    payment?.value,
    payment?.amount,
    invoice?.value,
    invoice?.amount,
    transaction?.amount,
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return null;
}

function extractFailureReason(payload: IntaSendWebhookPayload): string | null {
  const invoice = asObject(payload.invoice);
  const payment = asObject(payload.payment);
  const transaction = asObject(payload.transaction);

  const reason =
    asString(payload.failed_reason) ||
    asString(payload.fail_reason) ||
    asString(payload.reason) ||
    asString(payload.message) ||
    asString(payload.status_description) ||
    asString(payment?.failed_reason) ||
    asString(payment?.reason) ||
    asString(invoice?.failed_reason) ||
    asString(invoice?.reason) ||
    asString(transaction?.reason);

  return reason;
}

export function parseIntaSendWebhook(
  payload: IntaSendWebhookPayload,
): IntaSendWebhookContext {
  const invoice = asObject(payload.invoice);
  const payment = asObject(payload.payment);
  const transaction = asObject(payload.transaction);
  const { family, hint } = detectEventFamily(payload);
  const rawState = pickState(payload);
  const referenceCandidates = collectReferenceCandidates(payload);

  const apiRef =
    asString(payload.api_ref) ||
    asString(invoice?.api_ref) ||
    asString(payment?.api_ref) ||
    asString(transaction?.api_ref) ||
    asString(payload.request_reference_id) ||
    asString(transaction?.request_reference_id) ||
    referenceCandidates[0] ||
    null;

  const invoiceId =
    asString(payload.invoice_id) ||
    asString(invoice?.invoice_id) ||
    asString(invoice?.id) ||
    null;

  const sessionId =
    asString(invoice?.id) ||
    asString(payment?.id) ||
    asString(payload.id) ||
    null;

  return {
    invoice,
    payment,
    transaction,
    eventFamily: family,
    eventHint: hint,
    rawState,
    state: normalizeIntaSendState(rawState, family),
    apiRef,
    primaryReference: apiRef || referenceCandidates[0] || null,
    referenceCandidates,
    invoiceId,
    sessionId,
    amount: extractAmount(payload),
    failureReason: extractFailureReason(payload),
  };
}
