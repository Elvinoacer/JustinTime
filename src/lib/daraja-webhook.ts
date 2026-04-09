export type CanonicalDarajaState =
  | "PENDING"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "CANCELLED"
  | "REVERSED";

export type DarajaEventFamily = "STK_PUSH" | "UNKNOWN";

export type DarajaWebhookPayload = Record<string, unknown>;

export interface DarajaWebhookContext {
  eventFamily: DarajaEventFamily;
  eventHint: string;
  rawState: string;
  resultCode: number | null;
  resultDesc: string | null;
  state: CanonicalDarajaState;
  apiRef: string | null;
  primaryReference: string | null;
  referenceCandidates: string[];
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  // Backward compatibility aliases.
  invoiceId: string | null;
  sessionId: string | null;
  amount: number | null;
  failureReason: string | null;
  receiptNumber: string | null;
  phoneNumber: string | null;
  metadata: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
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

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
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

function extractCallbackNode(payload: DarajaWebhookPayload) {
  const body = asRecord(payload.Body);
  const direct = asRecord(body?.stkCallback);
  if (direct) {
    return direct;
  }

  return asRecord(payload.stkCallback);
}

function extractMetadata(
  payload: DarajaWebhookPayload,
): Record<string, unknown> {
  const callback = extractCallbackNode(payload);
  const callbackMetadata = asRecord(callback?.CallbackMetadata);
  const items = Array.isArray(callbackMetadata?.Item)
    ? callbackMetadata?.Item
    : [];

  const metadata: Record<string, unknown> = {};
  for (const item of items) {
    const row = asRecord(item);
    if (!row) {
      continue;
    }

    const name = asString(row.Name);
    if (!name) {
      continue;
    }

    metadata[name] = row.Value;
  }

  return metadata;
}

function detectEventFamily(payload: DarajaWebhookPayload): {
  family: DarajaEventFamily;
  hint: string;
} {
  const callback = extractCallbackNode(payload);
  const hint = [
    asString(payload.event),
    asString(payload.event_type),
    asString(payload.type),
    asString(payload.category),
    asString(payload.topic),
    asString(payload.object),
    asString(callback?.ResultDesc),
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  if (
    callback ||
    asString(payload.CheckoutRequestID) ||
    asString(payload.MerchantRequestID) ||
    asString(payload.invoice_id)
  ) {
    return { family: "STK_PUSH", hint };
  }

  return { family: "UNKNOWN", hint };
}

function pickRawState(payload: DarajaWebhookPayload): string {
  const callback = extractCallbackNode(payload);

  return (
    asString(callback?.ResultCode) ||
    asString(payload.ResultCode) ||
    asString(payload.state) ||
    asString(payload.status) ||
    asString(callback?.ResultDesc) ||
    asString(payload.ResultDesc) ||
    ""
  );
}

export function normalizeDarajaState(
  rawState: unknown,
  resultDesc?: unknown,
): CanonicalDarajaState {
  const token = normalizeToken(asString(rawState) || "");
  const description = normalizeToken(asString(resultDesc) || "");

  const numericCode = Number(token);
  if (Number.isFinite(numericCode)) {
    if (numericCode === 0) {
      return "SETTLED";
    }

    if (numericCode === 1032) {
      return "CANCELLED";
    }

    if ([1, 1025, 1037, 2001].includes(numericCode)) {
      return "FAILED";
    }

    return "PROCESSING";
  }

  if (
    token === "SETTLED" ||
    token === "SUCCESS" ||
    token === "SUCCEEDED" ||
    token === "COMPLETED" ||
    description.includes("SUCCESS") ||
    description.includes("COMPLETED")
  ) {
    return "SETTLED";
  }

  if (
    token.includes("CANCEL") ||
    description.includes("CANCEL") ||
    description.includes("ABORT")
  ) {
    return "CANCELLED";
  }

  if (
    token.includes("FAIL") ||
    token.includes("ERROR") ||
    token.includes("DECLIN") ||
    description.includes("FAIL") ||
    description.includes("ERROR") ||
    description.includes("DECLIN")
  ) {
    return "FAILED";
  }

  if (
    token.includes("REVERSE") ||
    token.includes("REFUND") ||
    description.includes("REVERSE") ||
    description.includes("REFUND")
  ) {
    return "REVERSED";
  }

  if (
    token.includes("PROCESS") ||
    token.includes("QUEUE") ||
    token.includes("PENDING") ||
    description.includes("PROCESS") ||
    description.includes("PENDING")
  ) {
    return "PROCESSING";
  }

  return "PENDING";
}

function collectReferenceCandidates(payload: DarajaWebhookPayload): string[] {
  const callback = extractCallbackNode(payload);
  const metadata = extractMetadata(payload);

  const refs: string[] = [];

  const topLevelKeys = [
    "api_ref",
    "reference",
    "tracking_id",
    "invoice_id",
    "CheckoutRequestID",
    "MerchantRequestID",
    "request_reference_id",
    "reference_id",
    "id",
  ] as const;

  for (const key of topLevelKeys) {
    pushUnique(refs, payload[key]);
  }

  pushUnique(refs, callback?.CheckoutRequestID);
  pushUnique(refs, callback?.MerchantRequestID);
  pushUnique(refs, metadata.AccountReference);
  pushUnique(refs, metadata.MpesaReceiptNumber);
  pushUnique(refs, metadata.PhoneNumber);

  return refs;
}

function extractAmount(payload: DarajaWebhookPayload): number | null {
  const callback = extractCallbackNode(payload);
  const metadata = extractMetadata(payload);

  const candidates = [
    metadata.Amount,
    payload.Amount,
    callback?.Amount,
    payload.amount,
    payload.value,
  ];

  for (const candidate of candidates) {
    const numeric = asNumber(candidate);
    if (numeric != null && numeric > 0) {
      return numeric;
    }
  }

  return null;
}

function extractFailureReason(payload: DarajaWebhookPayload): string | null {
  const callback = extractCallbackNode(payload);

  return (
    asString(callback?.ResultDesc) ||
    asString(payload.ResultDesc) ||
    asString(payload.failed_reason) ||
    asString(payload.fail_reason) ||
    asString(payload.reason) ||
    asString(payload.message) ||
    null
  );
}

function extractResultCode(payload: DarajaWebhookPayload): number | null {
  const callback = extractCallbackNode(payload);
  const candidates = [
    callback?.ResultCode,
    payload.ResultCode,
    payload.result_code,
    payload.code,
  ];

  for (const candidate of candidates) {
    const numeric = asNumber(candidate);
    if (numeric != null) {
      return numeric;
    }
  }

  return null;
}

function extractResultDesc(payload: DarajaWebhookPayload): string | null {
  const callback = extractCallbackNode(payload);

  return (
    asString(callback?.ResultDesc) ||
    asString(payload.ResultDesc) ||
    asString(payload.result_desc) ||
    asString(payload.message) ||
    null
  );
}

function mapDarajaFailureReason(
  resultCode: number | null,
  resultDesc: string | null,
): string | null {
  if (resultCode == null) {
    return resultDesc;
  }

  const fallback = resultDesc ? ` (${resultDesc})` : "";

  if (resultCode === 0) {
    return null;
  }

  if (resultCode === 1032) {
    return `User cancelled the STK prompt${fallback}`;
  }

  if (resultCode === 1037) {
    return `STK prompt timed out${fallback}`;
  }

  if (resultCode === 2001) {
    return `Insufficient M-Pesa balance${fallback}`;
  }

  return resultDesc || `Daraja request failed with code ${resultCode}`;
}

export function parseDarajaWebhook(
  payload: DarajaWebhookPayload,
): DarajaWebhookContext {
  const callback = extractCallbackNode(payload);
  const metadata = extractMetadata(payload);
  const { family, hint } = detectEventFamily(payload);

  const resultCode = extractResultCode(payload);
  const resultDesc = extractResultDesc(payload);
  const rawState = pickRawState(payload);
  const state = normalizeDarajaState(
    rawState,
    resultDesc || callback?.ResultDesc,
  );

  const apiRef =
    asString(metadata.AccountReference) ||
    asString(payload.api_ref) ||
    asString(payload.reference) ||
    asString(payload.request_reference_id) ||
    null;

  const checkoutRequestId =
    asString(callback?.CheckoutRequestID) ||
    asString(payload.CheckoutRequestID) ||
    asString(payload.invoice_id) ||
    asString(payload.tracking_id) ||
    null;

  const merchantRequestId =
    asString(callback?.MerchantRequestID) ||
    asString(payload.MerchantRequestID) ||
    asString(payload.id) ||
    null;

  const references = collectReferenceCandidates(payload);
  const primaryReference =
    apiRef || checkoutRequestId || merchantRequestId || references[0] || null;

  const failureReason =
    mapDarajaFailureReason(resultCode, resultDesc) ||
    extractFailureReason(payload);

  return {
    eventFamily: family,
    eventHint: hint,
    rawState,
    resultCode,
    resultDesc,
    state,
    apiRef,
    primaryReference,
    referenceCandidates: references,
    checkoutRequestId,
    merchantRequestId,
    invoiceId: checkoutRequestId,
    sessionId: merchantRequestId,
    amount: extractAmount(payload),
    failureReason,
    receiptNumber: asString(metadata.MpesaReceiptNumber),
    phoneNumber: asString(metadata.PhoneNumber),
    metadata,
  };
}
