"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Receipt,
  XCircle,
} from "lucide-react";
import {
  clearStoredPendingTopUp,
  getStoredPendingTopUp,
} from "@/lib/api/hooks/useWallet";
import {
  normalizeInternalReturnPath,
  PaymentVerificationKind,
} from "@/lib/payments/verification";

type VerificationStatus =
  | "PENDING"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "REVERSED"
  | "CANCELLED";

interface UnifiedStatusPayload {
  kind: PaymentVerificationKind;
  status: VerificationStatus;
  isTerminal: boolean;
  apiRef: string | null;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  amountExpected: number | string | null;
  amountReceived: number | string | null;
  currency: string | null;
  failureReason: string | null;
  reconciliationError: string | null;
}

interface PaymentVerificationStatusProps {
  defaultKind?: PaymentVerificationKind;
  defaultReturnTo?: string;
}

const FAST_POLL_INTERVAL_MS = 4000;
const SLOW_POLL_INTERVAL_MS = 30_000;
const POLL_TIMEOUT_MS = 90_000;
const SUCCESS_REDIRECT_DELAY_MS = 2500;

const TERMINAL_STATUSES = new Set<VerificationStatus>([
  "SETTLED",
  "FAILED",
  "CANCELLED",
  "REVERSED",
]);

const FLOW_COPY: Record<
  PaymentVerificationKind,
  {
    heading: string;
    fallbackReturnPath: string;
    returnLabel: string;
  }
> = {
  wallet_topup: {
    heading: "Confirming Your Wallet Top-up",
    fallbackReturnPath: "/wallet",
    returnLabel: "Wallet",
  },
  onboarding_fee: {
    heading: "Confirming Your Onboarding Payment",
    fallbackReturnPath: "/dashboard/verification",
    returnLabel: "Verification",
  },
  subscription: {
    heading: "Confirming Your Subscription Payment",
    fallbackReturnPath: "/dashboard/premium",
    returnLabel: "Premium",
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeStatus(value: unknown): VerificationStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (
    normalized === "PENDING" ||
    normalized === "PROCESSING" ||
    normalized === "SETTLED" ||
    normalized === "FAILED" ||
    normalized === "REVERSED" ||
    normalized === "CANCELLED"
  ) {
    return normalized;
  }

  return null;
}

function resolveKind(
  value: string | null,
  fallback?: PaymentVerificationKind,
): PaymentVerificationKind | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "wallet_topup" ||
    normalized === "onboarding_fee" ||
    normalized === "subscription"
  ) {
    return normalized;
  }

  return fallback || null;
}

function formatCurrency(
  value: number | string | null | undefined,
  currency: string | null = "KES",
): string {
  if (value == null) {
    return `${currency || "KES"} 0`;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return `${currency || "KES"} ${String(value)}`;
  }

  return `${currency || "KES"} ${numeric.toLocaleString()}`;
}

function statusLabel(status: VerificationStatus | undefined): string {
  switch (status) {
    case "SETTLED":
      return "Confirmed";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "REVERSED":
      return "Reversed";
    case "PROCESSING":
      return "Processing";
    case "PENDING":
    default:
      return "Pending confirmation";
  }
}

function statusTone(status: VerificationStatus | undefined): string {
  switch (status) {
    case "SETTLED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "PENDING":
    case "PROCESSING":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "FAILED":
    case "REVERSED":
      return "bg-red-100 text-red-800 border-red-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function statusDescription(
  kind: PaymentVerificationKind,
  status: VerificationStatus | undefined,
): string {
  switch (status) {
    case "SETTLED":
      if (kind === "wallet_topup") {
        return "Your wallet has been credited and the payment is fully confirmed.";
      }

      if (kind === "onboarding_fee") {
        return "Payment confirmed. Your onboarding access is now active for verification review.";
      }

      return "Payment confirmed. Your subscription is now active.";
    case "FAILED":
      if (kind === "subscription") {
        return "The subscription payment failed and your current plan remains unchanged.";
      }

      if (kind === "onboarding_fee") {
        return "The onboarding payment failed and access has not been activated.";
      }

      return "The top-up failed and no wallet credit was applied.";
    case "CANCELLED":
      return "The payment was cancelled before confirmation.";
    case "REVERSED":
      return "The payment was reversed by the gateway and was not applied.";
    case "PROCESSING":
      return "The payment provider is still processing this transaction.";
    case "PENDING":
    default:
      return "Waiting for secure provider and webhook confirmation.";
  }
}

function buildIcon(status: VerificationStatus | undefined) {
  if (status === "SETTLED") {
    return <CheckCircle2 className="h-8 w-8 text-emerald-600" />;
  }

  if (status === "FAILED" || status === "REVERSED") {
    return <XCircle className="h-8 w-8 text-red-600" />;
  }

  if (status === "CANCELLED") {
    return <AlertTriangle className="h-8 w-8 text-slate-600" />;
  }

  return <Clock3 className="h-8 w-8 text-amber-600" />;
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    if (payload && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // Ignore JSON parse errors and use fallback.
  }

  return fallback;
}

async function fetchUnifiedStatus(params: {
  kind: PaymentVerificationKind;
  apiRef: string | null;
  topUpId: string | null;
  checkoutId: string | null;
  trackingId: string | null;
}): Promise<UnifiedStatusPayload> {
  const url =
    params.kind === "wallet_topup"
      ? new URL("/api/wallet/topup/status", window.location.origin)
      : params.kind === "onboarding_fee"
        ? new URL("/api/onboarding-fee/status", window.location.origin)
        : new URL("/api/subscription/status", window.location.origin);

  if (params.apiRef) {
    url.searchParams.set("apiRef", params.apiRef);
  }

  if (params.checkoutId) {
    url.searchParams.set("checkoutId", params.checkoutId);
  }

  if (params.trackingId) {
    url.searchParams.set("trackingId", params.trackingId);
  }

  if (params.kind === "wallet_topup" && params.topUpId) {
    url.searchParams.set("topUpId", params.topUpId);
  }

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    const fallback =
      params.kind === "wallet_topup"
        ? "Unable to fetch top-up status"
        : "Unable to fetch payment status";
    throw new Error(await readErrorMessage(response, fallback));
  }

  const payload = (await response.json()) as Record<string, unknown>;

  if (params.kind === "wallet_topup") {
    const status = normalizeStatus(payload.status) || "PENDING";

    return {
      kind: params.kind,
      status,
      isTerminal:
        typeof payload.isTerminal === "boolean"
          ? payload.isTerminal
          : TERMINAL_STATUSES.has(status),
      apiRef:
        typeof payload.apiRef === "string"
          ? payload.apiRef
          : params.apiRef || null,
      checkoutRequestId:
        typeof payload.gatewaySessionId === "string"
          ? payload.gatewaySessionId
          : params.checkoutId,
      merchantRequestId:
        typeof payload.gatewayInvoiceId === "string"
          ? payload.gatewayInvoiceId
          : null,
      amountExpected:
        typeof payload.amountExpected === "number" ||
        typeof payload.amountExpected === "string"
          ? payload.amountExpected
          : null,
      amountReceived:
        typeof payload.amountReceived === "number" ||
        typeof payload.amountReceived === "string"
          ? payload.amountReceived
          : null,
      currency: typeof payload.currency === "string" ? payload.currency : "KES",
      failureReason:
        typeof payload.failureReason === "string"
          ? payload.failureReason
          : null,
      reconciliationError:
        typeof payload.reconciliationError === "string"
          ? payload.reconciliationError
          : null,
    };
  }

  const pendingPayment = asRecord(payload.pendingPayment);
  const statusFromPending = normalizeStatus(pendingPayment?.status);
  const status =
    normalizeStatus(payload.paymentStatus) ||
    (payload.isSettled === true ? "SETTLED" : statusFromPending || "PENDING");

  const fallbackApiRef =
    (typeof payload.apiRef === "string" ? payload.apiRef : null) ||
    (typeof pendingPayment?.apiRef === "string"
      ? pendingPayment.apiRef
      : null) ||
    params.apiRef;

  const fallbackCheckout =
    (typeof payload.checkoutRequestId === "string"
      ? payload.checkoutRequestId
      : null) ||
    (typeof pendingPayment?.checkoutRequestId === "string"
      ? pendingPayment.checkoutRequestId
      : null) ||
    params.checkoutId;

  return {
    kind: params.kind,
    status,
    isTerminal:
      typeof payload.isTerminal === "boolean"
        ? payload.isTerminal
        : TERMINAL_STATUSES.has(status),
    apiRef: fallbackApiRef,
    checkoutRequestId: fallbackCheckout,
    merchantRequestId:
      typeof payload.merchantRequestId === "string"
        ? payload.merchantRequestId
        : typeof pendingPayment?.merchantRequestId === "string"
          ? pendingPayment.merchantRequestId
          : null,
    amountExpected:
      typeof payload.amountExpected === "number" ||
      typeof payload.amountExpected === "string"
        ? payload.amountExpected
        : typeof pendingPayment?.amountExpected === "number" ||
            typeof pendingPayment?.amountExpected === "string"
          ? pendingPayment.amountExpected
          : null,
    amountReceived:
      typeof payload.amountReceived === "number" ||
      typeof payload.amountReceived === "string"
        ? payload.amountReceived
        : null,
    currency:
      typeof payload.currency === "string"
        ? payload.currency
        : typeof pendingPayment?.currency === "string"
          ? pendingPayment.currency
          : "KES",
    failureReason:
      typeof payload.failureReason === "string"
        ? payload.failureReason
        : typeof pendingPayment?.failureReason === "string"
          ? pendingPayment.failureReason
          : null,
    reconciliationError:
      typeof payload.reconciliationError === "string"
        ? payload.reconciliationError
        : null,
  };
}

export function PaymentVerificationStatus({
  defaultKind,
  defaultReturnTo,
}: PaymentVerificationStatusProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestInFlightRef = useRef(false);

  const rawKind = searchParams.get("kind");
  const kind = resolveKind(rawKind, defaultKind);

  const searchApiRef =
    searchParams.get("apiRef") ||
    searchParams.get("api_ref") ||
    searchParams.get("reference");
  const searchTopUpId = searchParams.get("topUpId");
  const searchTrackingId =
    searchParams.get("tracking_id") ||
    searchParams.get("trackingId") ||
    searchParams.get("invoice_id") ||
    searchParams.get("invoiceId");
  const searchCheckoutId =
    searchParams.get("checkoutId") ||
    searchParams.get("checkout_id") ||
    searchParams.get("sessionId");

  const fallbackTopUp = useMemo(() => {
    if (kind !== "wallet_topup" || searchApiRef || searchTopUpId) {
      return null;
    }

    return getStoredPendingTopUp();
  }, [kind, searchApiRef, searchTopUpId]);

  const apiRef = searchApiRef || fallbackTopUp?.apiRef || null;
  const topUpId = searchTopUpId || fallbackTopUp?.topUpId || null;
  const checkoutId = searchCheckoutId || null;
  const trackingId = searchTrackingId || null;

  const rawReturnTo =
    searchParams.get("returnTo") ||
    searchParams.get("return_to") ||
    defaultReturnTo ||
    null;
  const normalizedReturnTo = normalizeInternalReturnPath(rawReturnTo);

  const fallbackReturnTo = kind ? FLOW_COPY[kind].fallbackReturnPath : "/";
  const returnTo = normalizedReturnTo || fallbackReturnTo;

  const canVerify =
    kind != null && (kind !== "wallet_topup" || Boolean(apiRef || topUpId));

  const verificationKey = `${kind || "unknown"}:${apiRef || ""}:${topUpId || ""}:${checkoutId || ""}:${trackingId || ""}`;

  const [statusPayload, setStatusPayload] =
    useState<UnifiedStatusPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [pollStartedAt, setPollStartedAt] = useState(() => Date.now());

  useEffect(() => {
    setStatusPayload(null);
    setErrorMessage(null);
    setIsLoading(true);
    setTimedOut(false);
    setPollStartedAt(Date.now());
  }, [verificationKey]);

  const loadStatus = useCallback(
    async (manual = false) => {
      if (!kind || !canVerify) {
        setIsLoading(false);
        return;
      }

      if (requestInFlightRef.current && !manual) {
        return;
      }

      requestInFlightRef.current = true;
      if (manual) {
        setIsRefreshing(true);
      }

      try {
        const data = await fetchUnifiedStatus({
          kind,
          apiRef,
          topUpId,
          checkoutId,
          trackingId,
        });

        setStatusPayload(data);
        setErrorMessage(null);

        if (kind === "wallet_topup" && data.isTerminal) {
          clearStoredPendingTopUp();
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to verify payment status right now";
        setErrorMessage(message);
      } finally {
        requestInFlightRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [kind, canVerify, apiRef, topUpId, checkoutId, trackingId],
  );

  useEffect(() => {
    if (!kind || !canVerify) {
      setIsLoading(false);
      return;
    }

    void loadStatus();

    if (statusPayload?.isTerminal) {
      return;
    }

    const pollInterval = timedOut
      ? SLOW_POLL_INTERVAL_MS
      : FAST_POLL_INTERVAL_MS;
    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, pollInterval);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [kind, canVerify, loadStatus, statusPayload?.isTerminal, timedOut]);

  useEffect(() => {
    if (!kind || !canVerify || statusPayload?.isTerminal) {
      return;
    }

    const elapsed = Date.now() - pollStartedAt;
    const remaining = Math.max(0, POLL_TIMEOUT_MS - elapsed);
    const timeoutId = window.setTimeout(() => {
      setTimedOut(true);
    }, remaining);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [kind, canVerify, pollStartedAt, statusPayload?.isTerminal]);

  useEffect(() => {
    if (!statusPayload || statusPayload.status !== "SETTLED") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.replace(returnTo);
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [statusPayload, router, returnTo]);

  if (!kind) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm sm:p-6">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          Payment Verification
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We could not determine which payment flow to verify.
        </p>
        <div className="mt-5">
          <button
            type="button"
            onClick={() => router.replace(returnTo)}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (!canVerify) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm sm:p-6">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          {FLOW_COPY[kind].heading}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We could not find a payment reference to verify.
        </p>
        <div className="mt-5">
          <button
            type="button"
            onClick={() => router.replace(returnTo)}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
          >
            Return to {FLOW_COPY[kind].returnLabel}
          </button>
        </div>
      </div>
    );
  }

  const effectiveStatus = statusPayload?.status;
  const isTerminal = Boolean(statusPayload?.isTerminal);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-center">
        {buildIcon(effectiveStatus)}
      </div>

      <h1 className="mt-3 text-center text-xl font-bold text-slate-900">
        {FLOW_COPY[kind].heading}
      </h1>

      <div className="mt-3 flex justify-center">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
            effectiveStatus,
          )}`}
        >
          {statusLabel(effectiveStatus)}
        </span>
      </div>

      <p className="mt-3 text-center text-sm text-slate-600">
        {statusDescription(kind, effectiveStatus)}
      </p>

      {(isLoading || isRefreshing) && !isTerminal && (
        <div
          className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking payment status...
        </div>
      )}

      {statusPayload?.reconciliationError && !isTerminal && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          We could not confirm status with the payment provider right now (
          {statusPayload.reconciliationError}). Retrying automatically...
        </div>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <p className="text-slate-600 break-all">
            <span className="font-semibold text-slate-900">API Ref:</span>{" "}
            {statusPayload?.apiRef || apiRef || "Pending"}
          </p>
          <p className="text-slate-600 break-all">
            <span className="font-semibold text-slate-900">Session:</span>{" "}
            {statusPayload?.checkoutRequestId || checkoutId || "Pending"}
          </p>
          <p className="text-slate-600 break-all">
            <span className="font-semibold text-slate-900">Gateway Ref:</span>{" "}
            {statusPayload?.merchantRequestId || "Pending"}
          </p>
          <p className="text-slate-600 break-all">
            <span className="font-semibold text-slate-900">Expected:</span>{" "}
            {formatCurrency(
              statusPayload?.amountExpected,
              statusPayload?.currency || "KES",
            )}
          </p>
          <p className="text-slate-600 break-all">
            <span className="font-semibold text-slate-900">Received:</span>{" "}
            {statusPayload?.amountReceived == null
              ? "Not confirmed"
              : formatCurrency(
                  statusPayload.amountReceived,
                  statusPayload.currency || "KES",
                )}
          </p>
        </div>

        {statusPayload?.failureReason && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 break-words">
            <span className="font-semibold">Failure reason:</span>{" "}
            {statusPayload.failureReason}
          </p>
        )}
      </div>

      {timedOut && !isTerminal && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Verification is still pending after the expected window.
          <strong>
            {" "}
            We are still monitoring this payment in the background.
          </strong>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void loadStatus(true)}
          disabled={isRefreshing || isLoading}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isRefreshing ? "Refreshing..." : "Refresh Status"}
        </button>

        <button
          type="button"
          onClick={() => router.replace(returnTo)}
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
        >
          {statusPayload?.status === "SETTLED"
            ? `Continue to ${FLOW_COPY[kind].returnLabel}`
            : `Return to ${FLOW_COPY[kind].returnLabel}`}
        </button>

        {statusPayload?.apiRef && (
          <button
            type="button"
            onClick={() => router.replace(returnTo)}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto"
          >
            <Receipt className="mr-1 h-4 w-4" />
            View Destination
          </button>
        )}
      </div>

      {statusPayload?.status === "SETTLED" && (
        <p className="mt-3 text-xs text-emerald-700">
          Confirmed. Redirecting shortly...
        </p>
      )}
    </div>
  );
}
