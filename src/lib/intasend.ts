/**
 * IntaSend Payment Gateway Client
 * Uses the official intasend-node SDK
 */
import crypto from "crypto";
import { PAYMENT_AMOUNTS } from "@/lib/constants/pricing";

const IntaSend = require("intasend-node");

// Environment configuration
const PUBLISHABLE_KEY = process.env.INTASEND_PUBLISHABLE_KEY || "";
const SECRET_KEY = process.env.INTASEND_SECRET_KEY || "";
const IS_TEST_MODE = process.env.INTASEND_TEST_MODE === "true";

// Create IntaSend instance
export const getIntasendClient = () => {
  if (!PUBLISHABLE_KEY || !SECRET_KEY) {
    throw new Error("IntaSend API keys not configured");
  }

  return new IntaSend(
    PUBLISHABLE_KEY,
    SECRET_KEY,
    IS_TEST_MODE, // true = sandbox, false = live
  );
};

// Collection service for receiving payments
export const getCollectionService = () => {
  const intasend = getIntasendClient();
  return intasend.collection();
};

// Transfer service for sending money
export const getTransferService = () => {
  const intasend = getIntasendClient();
  return intasend.transfer();
};

// Wallet service
export const getWalletService = () => {
  const intasend = getIntasendClient();
  return intasend.wallets();
};

// Base URL for redirects
export const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || "https://justintimeservices.vercel.app";
};

// Webhook challenge verification
export const verifyWebhookChallenge = (receivedChallenge: string): boolean => {
  const expectedChallenge = process.env.INTASEND_WEBHOOK_CHALLENGE;
  if (!expectedChallenge) {
    return false;
  }
  return receivedChallenge === expectedChallenge;
};

export const verifyWebhookSignature = (
  rawBody: string,
  signatureHeader?: string | null,
): boolean => {
  const secret = process.env.INTASEND_SECRET_KEY;
  if (!secret || !signatureHeader) {
    return false;
  }

  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const normalizedReceived = signatureHeader
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();

  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(normalizedReceived, "hex");

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function asNumber(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric;
}

function normalizeState(value: string | null): string {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function statesFromResponse(payload: Record<string, unknown>): string[] {
  const invoice = isObject(payload.invoice) ? payload.invoice : null;

  const states = [
    normalizeState(asString(payload.state)),
    normalizeState(asString(payload.status)),
    normalizeState(asString(invoice?.state)),
    normalizeState(asString(invoice?.status)),
  ].filter(Boolean);

  return Array.from(new Set(states));
}

function extractInvoiceNode(
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  if (isObject(payload.invoice)) {
    return payload.invoice;
  }

  if (isObject(payload.data) && isObject(payload.data.invoice)) {
    return payload.data.invoice;
  }

  if (isObject(payload.result) && isObject(payload.result.invoice)) {
    return payload.result.invoice;
  }

  if (isObject(payload.results) && isObject(payload.results.invoice)) {
    return payload.results.invoice;
  }

  return null;
}

function normalizeCurrency(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.trim().toUpperCase();
}

export interface IntaSendWebhookSignatureEvaluation {
  valid: boolean;
  enforceSignature: boolean;
  shouldReject: boolean;
}

export function evaluateWebhookSignature(
  rawBody: string,
  signatureHeader?: string | null,
): IntaSendWebhookSignatureEvaluation {
  const enforceSignature = process.env.INTASEND_ENFORCE_SIGNATURE === "true";
  const valid = verifyWebhookSignature(rawBody, signatureHeader);

  return {
    valid,
    enforceSignature,
    shouldReject: enforceSignature && !valid,
  };
}

const DEFAULT_SUCCESS_STATES = [
  "COMPLETE",
  "COMPLETED",
  "SUCCESS",
  "SUCCEEDED",
  "PAID",
];

export interface VerifyIntaSendPaymentInput {
  invoiceId: string;
  expectedApiRef?: string | null;
  expectedAmount?: number | null;
  expectedCurrency?: string | null;
  allowedProviderStates?: string[];
  allowedSuccessStates?: string[];
  amountTolerance?: number;
  requireApiRefMatch?: boolean;
  requireAmountMatch?: boolean;
  requireCurrencyMatch?: boolean;
}

export interface VerifyIntaSendPaymentResult {
  ok: boolean;
  providerState: string;
  providerStatesSeen: string[];
  invoiceId: string | null;
  apiRef: string | null;
  amount: number | null;
  currency: string | null;
  amountMatches: boolean;
  apiRefMatches: boolean;
  currencyMatches: boolean;
  stateMatches: boolean;
  raw: unknown;
}

export const verifyIntaSendPayment = async (
  input: VerifyIntaSendPaymentInput,
): Promise<VerifyIntaSendPaymentResult> => {
  const invoiceId = String(input.invoiceId || "").trim();
  if (!invoiceId) {
    throw new Error("invoiceId is required to verify IntaSend payment status");
  }

  const collection = getCollectionService();
  const response = (await collection.status(invoiceId)) as unknown;

  const payload = isObject(response) ? response : {};
  const invoice = extractInvoiceNode(payload);
  const states = statesFromResponse(payload);
  const providerState = states[0] || "";

  const resolvedInvoiceId =
    asString(payload.invoice_id) ||
    asString(invoice?.invoice_id) ||
    asString(invoice?.id) ||
    invoiceId;
  const resolvedApiRef =
    asString(payload.api_ref) ||
    asString(invoice?.api_ref) ||
    asString(invoice?.reference) ||
    null;
  const resolvedAmount =
    asNumber(payload.value) ??
    asNumber(payload.amount) ??
    asNumber(invoice?.value) ??
    asNumber(invoice?.amount) ??
    null;
  const resolvedCurrency =
    normalizeCurrency(asString(payload.currency)) ||
    normalizeCurrency(asString(invoice?.currency)) ||
    null;

  const expectedApiRef = asString(input.expectedApiRef);
  const expectedCurrency = normalizeCurrency(asString(input.expectedCurrency));
  const expectedAmount =
    typeof input.expectedAmount === "number" &&
    Number.isFinite(input.expectedAmount)
      ? input.expectedAmount
      : null;
  const tolerance =
    typeof input.amountTolerance === "number" && input.amountTolerance >= 0
      ? input.amountTolerance
      : 0.01;

  const allowedProviderStates = new Set(
    (
      input.allowedProviderStates ||
      input.allowedSuccessStates ||
      DEFAULT_SUCCESS_STATES
    ).map((state) => normalizeState(state)),
  );
  const requireApiRefMatch = input.requireApiRefMatch ?? true;
  const requireAmountMatch = input.requireAmountMatch ?? true;
  const requireCurrencyMatch = input.requireCurrencyMatch ?? true;

  const stateMatches = allowedProviderStates.has(providerState);
  const apiRefMatches = requireApiRefMatch
    ? expectedApiRef
      ? resolvedApiRef === expectedApiRef
      : Boolean(resolvedApiRef)
    : true;
  const amountMatches = requireAmountMatch
    ? expectedAmount != null
      ? resolvedAmount != null &&
        Math.abs(resolvedAmount - expectedAmount) <= tolerance
      : resolvedAmount != null
    : true;
  const currencyMatches = requireCurrencyMatch
    ? expectedCurrency
      ? resolvedCurrency === expectedCurrency
      : Boolean(resolvedCurrency)
    : true;

  return {
    ok: stateMatches && apiRefMatches && amountMatches && currencyMatches,
    providerState,
    providerStatesSeen: states,
    invoiceId: resolvedInvoiceId,
    apiRef: resolvedApiRef,
    amount: resolvedAmount,
    currency: resolvedCurrency,
    amountMatches,
    apiRefMatches,
    currencyMatches,
    stateMatches,
    raw: response,
  };
};

// Generate API reference with proper format (no underscores, alphanumeric + hyphens only)
export const generateApiRef = (prefix: string, userId: string): string => {
  const timestamp = Date.now().toString(36); // base36 for shorter string
  const userPart = userId.replace(/[^a-zA-Z0-9]/g, "");
  return `${prefix}-${userPart}-${timestamp}`;
};

export { PAYMENT_AMOUNTS };
