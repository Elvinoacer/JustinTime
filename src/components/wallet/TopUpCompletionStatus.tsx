"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Receipt,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  clearStoredPendingTopUp,
  getStoredPendingTopUp,
  useWalletTopUpStatus,
} from "@/lib/api/hooks/useWallet";
import { queryKeys } from "@/lib/api/queryKeys";

type TopUpStatus =
  | "PENDING"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "REVERSED"
  | "CANCELLED";

const FAST_POLL_INTERVAL_MS = 4000;
const SLOW_POLL_INTERVAL_MS = 30_000;
const POLL_TIMEOUT_MS = 90_000;

function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) {
    return "KES 0";
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return `KES ${String(value)}`;
  }

  return `KES ${parsed.toLocaleString()}`;
}

function statusLabel(status: TopUpStatus | undefined): string {
  switch (status) {
    case "PENDING":
      return "Pending confirmation";
    case "PROCESSING":
      return "Processing";
    case "SETTLED":
      return "Confirmed";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "REVERSED":
      return "Reversed";
    default:
      return "Unknown";
  }
}

function statusTone(status: TopUpStatus | undefined): string {
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

function statusDescription(status: TopUpStatus | undefined): string {
  switch (status) {
    case "SETTLED":
      return "Your wallet has been credited and the payment is fully confirmed.";
    case "FAILED":
      return "The gateway reported a failed payment. No wallet credit was applied.";
    case "CANCELLED":
      return "The payment was cancelled before confirmation.";
    case "REVERSED":
      return "The payment was reversed by the gateway and is not spendable.";
    case "PROCESSING":
      return "The payment provider is still processing this top-up.";
    case "PENDING":
    default:
      return "Waiting for secure webhook confirmation from the payment provider.";
  }
}

interface TopUpCompletionStatusProps {
  walletPath: string;
  heading: string;
}

export function TopUpCompletionStatus({
  walletPath,
  heading,
}: TopUpCompletionStatusProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [pollStartedAt] = useState(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);
  const [autoRedirectEnabled] = useState(true);

  const searchApiRef =
    searchParams.get("apiRef") ||
    searchParams.get("api_ref") ||
    searchParams.get("reference");
  const searchTopUpId = searchParams.get("topUpId");
  const searchTrackingId =
    searchParams.get("tracking_id") ||
    searchParams.get("invoice_id") ||
    searchParams.get("invoiceId");
  const searchCheckoutId =
    searchParams.get("checkout_id") || searchParams.get("checkoutId");

  const fallbackRef = useMemo(() => {
    if (searchApiRef || searchTopUpId) {
      return null;
    }

    return getStoredPendingTopUp();
  }, [searchApiRef, searchTopUpId]);

  const apiRef = searchApiRef || fallbackRef?.apiRef;
  const topUpId = searchTopUpId || fallbackRef?.topUpId;

  const statusQuery = useWalletTopUpStatus(
    {
      apiRef: apiRef || undefined,
      topUpId: topUpId || undefined,
      trackingId: searchTrackingId || undefined,
      checkoutId: searchCheckoutId || undefined,
    },
    {
      enabled: Boolean(apiRef || topUpId),
      retry: 1,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        const isTerminal =
          status === "SETTLED" ||
          status === "FAILED" ||
          status === "CANCELLED" ||
          status === "REVERSED";

        if (isTerminal) {
          return false;
        }

        if (timedOut) {
          return SLOW_POLL_INTERVAL_MS;
        }

        return FAST_POLL_INTERVAL_MS;
      },
    },
  );

  const status = statusQuery.data?.status;
  const isTerminal = Boolean(statusQuery.data?.isTerminal);

  useEffect(() => {
    if (isTerminal) {
      return;
    }

    const elapsed = Date.now() - pollStartedAt;
    const remaining = Math.max(0, POLL_TIMEOUT_MS - elapsed);
    const timeout = setTimeout(() => setTimedOut(true), remaining);

    return () => clearTimeout(timeout);
  }, [isTerminal, pollStartedAt]);

  useEffect(() => {
    if (!isTerminal) {
      return;
    }

    clearStoredPendingTopUp();
    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
    queryClient.invalidateQueries({
      queryKey: queryKeys.wallet.transactions(),
    });

    if (status === "SETTLED" && autoRedirectEnabled) {
      const timeout = setTimeout(() => {
        router.replace(walletPath);
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [
    autoRedirectEnabled,
    isTerminal,
    queryClient,
    router,
    status,
    walletPath,
  ]);

  const icon =
    status === "SETTLED" ? (
      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
    ) : status === "FAILED" || status === "REVERSED" ? (
      <XCircle className="h-8 w-8 text-red-600" />
    ) : status === "CANCELLED" ? (
      <AlertTriangle className="h-8 w-8 text-slate-600" />
    ) : (
      <Clock3 className="h-8 w-8 text-amber-600" />
    );

  if (!apiRef && !topUpId) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-3 text-xl font-bold text-slate-900">{heading}</h1>
        <p className="mt-2 text-sm text-slate-600">
          We could not find a top-up reference to verify. Open your wallet
          history to check current status.
        </p>
        <div className="mt-5">
          <button
            onClick={() => router.replace(walletPath)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-center">{icon}</div>

      <h1 className="mt-3 text-center text-xl font-bold text-slate-900">
        {heading}
      </h1>

      <div className="mt-3 flex justify-center">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
            status,
          )}`}
        >
          {statusLabel(status)}
        </span>
      </div>

      <p className="mt-3 text-center text-sm text-slate-600">
        {statusDescription(status)}
      </p>

      {(statusQuery.isLoading || statusQuery.isFetching) && !isTerminal && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking payment status...
        </div>
      )}

      {statusQuery.data?.reconciliationError && !isTerminal && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Could not reach M-Pesa to verify status (
          {statusQuery.data.reconciliationError}). Retrying automatically...
        </div>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900">API Ref:</span>{" "}
            {statusQuery.data?.apiRef || apiRef}
          </p>
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900">Top-up ID:</span>{" "}
            {statusQuery.data?.topUpId || topUpId}
          </p>
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900">Expected:</span>{" "}
            {formatCurrency(statusQuery.data?.amountExpected)}
          </p>
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900">Received:</span>{" "}
            {statusQuery.data?.amountReceived == null
              ? "Not confirmed"
              : formatCurrency(statusQuery.data?.amountReceived)}
          </p>
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900">Gateway Ref:</span>{" "}
            {statusQuery.data?.gatewayInvoiceId ||
              statusQuery.data?.transaction?.gatewayReference ||
              "Pending"}
          </p>
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900">Session:</span>{" "}
            {statusQuery.data?.gatewaySessionId ||
              statusQuery.data?.transaction?.gatewaySessionId ||
              "Pending"}
          </p>
        </div>

        {statusQuery.data?.failureReason && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
            <span className="font-semibold">Failure reason:</span>{" "}
            {statusQuery.data.failureReason}
          </p>
        )}
      </div>

      {timedOut && !isTerminal && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          We could not confirm this payment within the expected window.
          <strong> We are still monitoring it in the background.</strong> Your
          wallet will update automatically once M-Pesa confirms.
        </div>
      )}

      {statusQuery.error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Unable to fetch the latest status right now. Please retry.
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => statusQuery.refetch()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Refresh Status
        </button>

        <button
          onClick={() => router.replace(walletPath)}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          View Wallet
        </button>

        {statusQuery.data?.transaction?.id && (
          <button
            onClick={() => router.replace(walletPath)}
            className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Receipt className="mr-1 h-4 w-4" />
            View Transaction
          </button>
        )}
      </div>

      {status === "SETTLED" && autoRedirectEnabled && (
        <p className="mt-3 text-xs text-emerald-700">
          Confirmed. Redirecting to wallet shortly...
        </p>
      )}
    </div>
  );
}
