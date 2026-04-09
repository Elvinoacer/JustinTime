/**
 * Daraja (Safaricom M-Pesa) Payment Gateway Client
 * Handles STK Push initiation, callback trust checks, and STK status queries.
 */
import crypto from "crypto";
import { PAYMENT_AMOUNTS } from "@/lib/constants/pricing";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";

const DARAJA_SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke";
const DARAJA_LIVE_BASE_URL = "https://api.safaricom.co.ke";

const CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET || "";
const BUSINESS_SHORT_CODE = process.env.DARAJA_SHORTCODE || "";
const PASSKEY = process.env.DARAJA_PASSKEY || "";

const TRANSACTION_TYPE =
  process.env.DARAJA_TRANSACTION_TYPE || "CustomerPayBillOnline";

const DARAJA_ACCOUNT_REFERENCE_MAX_LENGTH = 12;
const DARAJA_TRANSACTION_DESC_MAX_LENGTH = 13;

type CachedToken = {
  token: string;
  expiresAtMs: number;
};

let cachedToken: CachedToken | null = null;

function getDarajaBaseUrl() {
  const mode = (process.env.DARAJA_ENV || process.env.NODE_ENV || "")
    .trim()
    .toLowerCase();

  if (mode === "sandbox" || mode === "test" || mode === "development") {
    return DARAJA_SANDBOX_BASE_URL;
  }

  return DARAJA_LIVE_BASE_URL;
}

function getTimestamp(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}${second}`;
}

function getPassword(timestamp: string): string {
  return Buffer.from(`${BUSINESS_SHORT_CODE}${PASSKEY}${timestamp}`).toString(
    "base64",
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
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
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function timingSafeEqualStrings(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function normalizeProviderState(value: string | null): string {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeAlphaNumericUpper(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function buildStableShortHash(value: string, size: number): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .toUpperCase()
    .slice(0, size);
}

function canonicalStateFromDaraja(
  resultCodeRaw: unknown,
  resultDescRaw: unknown,
): string {
  const resultCode = Number(resultCodeRaw);
  const resultDesc = String(resultDescRaw || "")
    .trim()
    .toUpperCase();

  if (Number.isFinite(resultCode)) {
    if (resultCode === 0) {
      return "SETTLED";
    }

    if (resultCode === 1032) {
      return "CANCELLED";
    }

    if ([1, 1025, 1037, 2001].includes(resultCode)) {
      return "FAILED";
    }

    return "PROCESSING";
  }

  if (resultDesc.includes("SUCCESS") || resultDesc.includes("COMPLETED")) {
    return "SETTLED";
  }

  if (resultDesc.includes("CANCEL")) {
    return "CANCELLED";
  }

  if (
    resultDesc.includes("FAIL") ||
    resultDesc.includes("ERROR") ||
    resultDesc.includes("DECLIN")
  ) {
    return "FAILED";
  }

  if (resultDesc.includes("PENDING") || resultDesc.includes("PROCESS")) {
    return "PROCESSING";
  }

  return "PENDING";
}

function normalizeCurrency(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.trim().toUpperCase();
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs > now + 30_000) {
    return cachedToken.token;
  }

  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error("Daraja consumer key/secret not configured");
  }

  const baseUrl = getDarajaBaseUrl();
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString(
    "base64",
  );

  const response = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      cache: "no-store",
    },
  );

  const payload = asRecord(await response.json().catch(() => ({})));
  if (!response.ok) {
    throw new Error(
      asString(payload.error_description) ||
        asString(payload.errorMessage) ||
        "Failed to obtain Daraja access token",
    );
  }

  const accessToken = asString(payload.access_token);
  const expiresInSec = Math.max(30, Number(payload.expires_in) || 3599);

  if (!accessToken) {
    throw new Error("Daraja token response missing access_token");
  }

  cachedToken = {
    token: accessToken,
    expiresAtMs: now + expiresInSec * 1000,
  };

  return accessToken;
}

async function callDaraja<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!BUSINESS_SHORT_CODE || !PASSKEY) {
    throw new Error("Daraja shortcode/passkey not configured");
  }

  const baseUrl = getDarajaBaseUrl();
  const accessToken = await getAccessToken();

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = asRecord(await response.json().catch(() => ({})));
  if (!response.ok) {
    throw new Error(
      asString(payload.errorMessage) ||
        asString(payload.error_description) ||
        asString(payload.ResponseDescription) ||
        "Daraja request failed",
    );
  }

  return payload as T;
}

export interface DarajaStkPushInput {
  amount: number;
  phoneNumber: string;
  apiRef: string;
  callbackUrl: string;
  description: string;
  transactionType?: string;
  accountReference?: string;
}

export interface DarajaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
  raw: Record<string, unknown>;
}

export const initiateDarajaStkPush = async (
  input: DarajaStkPushInput,
): Promise<DarajaStkPushResponse> => {
  const apiRef = String(input.apiRef || "").trim();
  if (!apiRef) {
    throw new Error("apiRef is required for Daraja STK push");
  }

  const callbackUrl = String(input.callbackUrl || "").trim();
  if (!/^https?:\/\//i.test(callbackUrl)) {
    throw new Error("A valid callback URL is required for Daraja STK push");
  }

  const normalizedPhone = normalizeKenyanPhone(String(input.phoneNumber || ""));
  if (!isValidKenyanPhone(normalizedPhone)) {
    throw new Error(
      "A valid Kenyan phone number is required (example: 254712345678)",
    );
  }

  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("A valid positive amount is required for Daraja STK push");
  }

  const accountReference = String(input.accountReference || apiRef).trim();
  if (!accountReference) {
    throw new Error("AccountReference is required for Daraja STK push");
  }

  if (accountReference.length > DARAJA_ACCOUNT_REFERENCE_MAX_LENGTH) {
    throw new Error(
      `AccountReference must not exceed ${DARAJA_ACCOUNT_REFERENCE_MAX_LENGTH} characters`,
    );
  }

  const normalizedDescription = String(input.description || "Payment").trim();
  const transactionDesc =
    normalizedDescription.slice(0, DARAJA_TRANSACTION_DESC_MAX_LENGTH) ||
    "Payment";

  const timestamp = getTimestamp();
  const payload = {
    BusinessShortCode: BUSINESS_SHORT_CODE,
    Password: getPassword(timestamp),
    Timestamp: timestamp,
    TransactionType: input.transactionType || TRANSACTION_TYPE,
    Amount: amount,
    PartyA: normalizedPhone,
    PartyB: BUSINESS_SHORT_CODE,
    PhoneNumber: normalizedPhone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  const response = await callDaraja<Record<string, unknown>>(
    "/mpesa/stkpush/v1/processrequest",
    payload,
  );

  const responseCode = asString(response.ResponseCode) || "";
  const merchantRequestId = asString(response.MerchantRequestID) || "";
  const checkoutRequestId = asString(response.CheckoutRequestID) || "";

  if (!merchantRequestId || !checkoutRequestId) {
    throw new Error(
      asString(response.ResponseDescription) ||
        "Daraja did not return request identifiers",
    );
  }

  if (responseCode !== "0") {
    throw new Error(
      asString(response.ResponseDescription) ||
        asString(response.errorMessage) ||
        "Daraja STK push request was not accepted",
    );
  }

  return {
    MerchantRequestID: merchantRequestId,
    CheckoutRequestID: checkoutRequestId,
    ResponseCode: responseCode,
    ResponseDescription: asString(response.ResponseDescription) || "",
    CustomerMessage: asString(response.CustomerMessage) || "",
    raw: response,
  };
};

function extractMetadataMap(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const callback =
    asRecord(asRecord(asRecord(payload.Body).stkCallback).CallbackMetadata) ||
    asRecord(payload.CallbackMetadata);

  const items = Array.isArray(callback.Item) ? callback.Item : [];
  const map: Record<string, unknown> = {};

  for (const item of items) {
    const row = asRecord(item);
    const name = asString(row.Name);
    if (!name) {
      continue;
    }

    map[name] = row.Value;
  }

  return map;
}

function normalizeAllowedState(state: string): string {
  const normalized = normalizeProviderState(state);
  if (!normalized) {
    return "";
  }

  if (normalized === "0") {
    return "SETTLED";
  }

  if (normalized === "1032") {
    return "CANCELLED";
  }

  if (["1", "1025", "1037", "2001"].includes(normalized)) {
    return "FAILED";
  }

  return normalized;
}

const DEFAULT_SUCCESS_STATES = ["SETTLED"];

export interface VerifyDarajaPaymentInput {
  checkoutRequestId?: string;
  // Backward compatibility alias for checkoutRequestId.
  invoiceId?: string;
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

export interface VerifyDarajaPaymentResult {
  ok: boolean;
  providerState: string;
  providerStatesSeen: string[];
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  // Backward compatibility alias for checkoutRequestId.
  invoiceId: string | null;
  apiRef: string | null;
  amount: number | null;
  currency: string | null;
  amountMatches: boolean;
  apiRefMatches: boolean;
  currencyMatches: boolean;
  stateMatches: boolean;
  receiptNumber: string | null;
  phoneNumber: string | null;
  raw: unknown;
}

export const verifyDarajaPayment = async (
  input: VerifyDarajaPaymentInput,
): Promise<VerifyDarajaPaymentResult> => {
  const checkoutRequestId = String(
    input.checkoutRequestId || input.invoiceId || "",
  ).trim();
  if (!checkoutRequestId) {
    throw new Error(
      "checkoutRequestId (CheckoutRequestID) is required for verification",
    );
  }

  const timestamp = getTimestamp();
  const queryPayload = {
    BusinessShortCode: BUSINESS_SHORT_CODE,
    Password: getPassword(timestamp),
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const response = await callDaraja<Record<string, unknown>>(
    "/mpesa/stkpushquery/v1/query",
    queryPayload,
  );

  const metadata = extractMetadataMap(response);

  const providerState = canonicalStateFromDaraja(
    response.ResultCode,
    response.ResultDesc,
  );

  const resolvedCheckoutRequestId =
    asString(response.CheckoutRequestID) || checkoutRequestId;
  const resolvedMerchantRequestId =
    asString(response.MerchantRequestID) || null;

  const providerStatesSeen = [
    providerState,
    normalizeProviderState(asString(response.ResultCode)),
    normalizeProviderState(asString(response.ResultDesc)),
  ].filter(Boolean);

  const resolvedApiRef =
    asString(response.AccountReference) ||
    asString(metadata.AccountReference) ||
    asString(input.expectedApiRef) ||
    null;
  const resolvedAmount =
    asNumber(response.Amount) ?? asNumber(metadata.Amount) ?? null;
  const resolvedCurrency =
    normalizeCurrency(
      asString(response.Currency) || asString(metadata.Currency),
    ) || "KES";
  const receiptNumber =
    asString(response.MpesaReceiptNumber) ||
    asString(metadata.MpesaReceiptNumber) ||
    null;
  const phoneNumber =
    asString(response.PhoneNumber) || asString(metadata.PhoneNumber) || null;

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
    )
      .map(normalizeAllowedState)
      .filter(Boolean),
  );

  const requireApiRefMatch = input.requireApiRefMatch ?? true;
  const requireAmountMatch = input.requireAmountMatch ?? true;
  const requireCurrencyMatch = input.requireCurrencyMatch ?? true;

  const normalizedProviderState = normalizeAllowedState(providerState);
  const stateMatches = allowedProviderStates.has(normalizedProviderState);
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
    providerState: normalizedProviderState,
    providerStatesSeen,
    checkoutRequestId: resolvedCheckoutRequestId,
    merchantRequestId: resolvedMerchantRequestId,
    invoiceId: resolvedCheckoutRequestId,
    apiRef: resolvedApiRef,
    amount: resolvedAmount,
    currency: resolvedCurrency,
    amountMatches,
    apiRefMatches,
    currencyMatches,
    stateMatches,
    receiptNumber,
    phoneNumber,
    raw: response,
  };
};

export interface DarajaCallbackAuthEvaluation {
  valid: boolean;
  enforceSignature: boolean;
  shouldReject: boolean;
}

export interface DarajaCallbackIpEvaluation {
  valid: boolean;
  enforceIp: boolean;
  shouldReject: boolean;
  requestIp: string | null;
  allowedIps: string[];
}

export function evaluateDarajaCallbackToken(
  receivedToken?: string | null,
): DarajaCallbackAuthEvaluation {
  const enforceSignature = process.env.DARAJA_ENFORCE_CALLBACK_TOKEN === "true";
  const expectedToken = process.env.DARAJA_CALLBACK_TOKEN || "";

  if (!expectedToken) {
    return {
      valid: !enforceSignature,
      enforceSignature,
      shouldReject: enforceSignature,
    };
  }

  const normalizedReceived = String(receivedToken || "").trim();
  const valid =
    normalizedReceived.length > 0 &&
    timingSafeEqualStrings(expectedToken, normalizedReceived);

  return {
    valid,
    enforceSignature,
    shouldReject: enforceSignature && !valid,
  };
}

function extractRequestIp(request: Request): string | null {
  const directHeaders = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for"),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const headerValue of directHeaders) {
    const candidate = headerValue.split(",")[0]?.trim();
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

export function evaluateDarajaCallbackIp(
  request: Request,
): DarajaCallbackIpEvaluation {
  const enforceIp = process.env.DARAJA_ENFORCE_CALLBACK_IP === "true";
  const allowedIps = String(process.env.DARAJA_CALLBACK_IP_WHITELIST || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const requestIp = extractRequestIp(request);

  if (allowedIps.length === 0) {
    return {
      valid: !enforceIp,
      enforceIp,
      shouldReject: enforceIp,
      requestIp,
      allowedIps,
    };
  }

  const valid = Boolean(requestIp && allowedIps.includes(requestIp));

  return {
    valid,
    enforceIp,
    shouldReject: enforceIp && !valid,
    requestIp,
    allowedIps,
  };
}

// Retained for optional callback probe checks in non-production setups.
export const verifyWebhookChallenge = (receivedChallenge: string): boolean => {
  const expectedChallenge = process.env.DARAJA_WEBHOOK_CHALLENGE;
  if (!expectedChallenge) {
    return false;
  }

  return receivedChallenge === expectedChallenge;
};

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export const getBaseUrl = () => {
  const explicitBaseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "";

  if (explicitBaseUrl.trim()) {
    return normalizeBaseUrl(explicitBaseUrl);
  }

  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
};

export const buildDarajaCallbackUrl = (
  baseUrl: string,
  webhookPath: string,
): string => {
  const normalizedPath = webhookPath.startsWith("/")
    ? webhookPath
    : `/${webhookPath}`;
  const pathSecret = String(
    process.env.DARAJA_CALLBACK_PATH_SECRET || "",
  ).trim();
  const callbackToken = String(process.env.DARAJA_CALLBACK_TOKEN || "").trim();

  const callbackPath = pathSecret
    ? `${normalizedPath}/${encodeURIComponent(pathSecret)}`
    : normalizedPath;

  const callbackUrl = new URL(callbackPath, `${normalizeBaseUrl(baseUrl)}/`);

  if (callbackToken) {
    callbackUrl.searchParams.set("token", callbackToken);
  }

  return callbackUrl.toString();
};

export const getDarajaCallbackTokenFromRequest = (requestUrl: string) => {
  try {
    const url = new URL(requestUrl);
    return url.searchParams.get("token");
  } catch {
    return null;
  }
};

export const generateApiRef = (prefix: string, userId: string): string => {
  const timestamp = Date.now().toString(36);
  const userPart = userId.replace(/[^a-zA-Z0-9]/g, "");
  return `${prefix}-${userPart}-${timestamp}`;
};

export const generateDarajaAccountReference = (
  prefix: string,
  apiRef: string,
): string => {
  const normalizedPrefix = normalizeAlphaNumericUpper(prefix).slice(0, 3);
  const effectivePrefix =
    normalizedPrefix.length > 0 ? normalizedPrefix : "PAY";
  const hash = buildStableShortHash(
    `${effectivePrefix}:${apiRef}:${Date.now().toString(36)}`,
    DARAJA_ACCOUNT_REFERENCE_MAX_LENGTH - effectivePrefix.length,
  );
  return `${effectivePrefix}${hash}`.slice(
    0,
    DARAJA_ACCOUNT_REFERENCE_MAX_LENGTH,
  );
};

export { PAYMENT_AMOUNTS };
