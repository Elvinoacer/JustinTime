import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Receipt,
  ShieldAlert,
  Unplug,
} from "lucide-react";
import { getWebhookIntentReconciliation } from "../../../../lib/payments/webhook-intent-reconciliation";

export const dynamic = "force-dynamic";

interface SearchParams {
  limit?: string;
  lookbackHours?: string;
}

type FinanceTransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "REVERSED"
  | "CANCELLED";

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return "";
}

function buildFinanceTransactionsHref(search: string) {
  const query = new URLSearchParams({
    tab: "transactions",
    search,
  });

  return `/admin/finance?${query.toString()}`;
}

function buildFinanceTransactionsFilteredHref(
  search: string,
  status: FinanceTransactionStatus,
) {
  const query = new URLSearchParams({
    tab: "transactions",
    search,
    status,
  });

  return `/admin/finance?${query.toString()}`;
}

function mapIntentStatusToFinanceStatus(
  status: string,
): "FAILED" | "PROCESSING" {
  return status === "VERIFIED_FAILED" ? "FAILED" : "PROCESSING";
}

function normalizeStateToken(rawState?: string | null) {
  return String(rawState || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function mapRawStateToFinanceStatus(
  rawState?: string | null,
): FinanceTransactionStatus {
  const state = normalizeStateToken(rawState);

  if (!state) {
    return "PROCESSING";
  }

  if (
    state.includes("CHARGEBACK") ||
    state.includes("REVERSE") ||
    state.includes("REFUND")
  ) {
    return "REVERSED";
  }

  if (
    state.includes("CANCEL") ||
    state.includes("VOID") ||
    state.includes("ABORT")
  ) {
    return "CANCELLED";
  }

  if (
    state.includes("FAIL") ||
    state.includes("ERROR") ||
    state.includes("DECLIN") ||
    state.includes("REJECT") ||
    state.includes("EXPIRE")
  ) {
    return "FAILED";
  }

  if (
    state.includes("SETTLED") ||
    state.includes("COMPLETE") ||
    state.includes("SUCCESS") ||
    state.includes("PAID") ||
    state.includes("APPROV")
  ) {
    return "SETTLED";
  }

  if (
    state.includes("PROCESS") ||
    state.includes("IN_PROGRESS") ||
    state.includes("QUEUE") ||
    state.includes("INITIAT") ||
    state.includes("SUBMIT")
  ) {
    return "PROCESSING";
  }

  if (state.includes("PENDING")) {
    return "PENDING";
  }

  return "PROCESSING";
}

function parseBoundedInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: Date | string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleString();
}

export default async function AdminPaymentIntentReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const limit = parseBoundedInt(params.limit, 50, 10, 250);
  const lookbackHours = parseBoundedInt(params.lookbackHours, 72, 1, 24 * 30);

  const data = await getWebhookIntentReconciliation({
    limit,
    lookbackHours,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Webhook Intent Reconciliation
            </h1>
            <p className="text-slate-500 text-sm">
              Find unmatched webhook receipts and verification-failed payment
              intents across wallet, onboarding, and subscriptions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/reconciliation"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <a
            href={`/api/admin/reconciliation/payment-intents?limit=${limit}&lookbackHours=${lookbackHours}`}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            API JSON
          </a>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <form method="get" className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs font-medium text-slate-600 space-y-1">
            Lookback Hours
            <input
              name="lookbackHours"
              type="number"
              min="1"
              max={String(24 * 30)}
              defaultValue={String(lookbackHours)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="text-xs font-medium text-slate-600 space-y-1">
            Limit
            <select
              name="limit"
              defaultValue={String(limit)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="150">150</option>
              <option value="250">250</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">
            Unmatched Receipts
          </p>
          <p className="text-2xl font-bold text-amber-900">
            {data.unmatchedReceiptCount}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold text-rose-700 mb-1">
            Verification-Failed Intents
          </p>
          <p className="text-2xl font-bold text-rose-900">
            {data.verificationFailedIntentCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            Scanned Receipts
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {data.scannedReceipts}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            Scanned Intents
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {data.scannedIntents}
          </p>
        </div>
      </div>

      {!data.schemaReady && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Payment intent schema is not available in this environment yet. Apply
          migrations to enable webhook-intent reconciliation data.
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Unplug className="w-4 h-4 text-amber-600" />
            <h2 className="font-semibold text-slate-900">
              Unmatched Webhook Receipts
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Generated {formatDate(data.generatedAt)}
          </p>
        </div>

        {data.unmatchedReceipts.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No unmatched receipts found in the selected lookback window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3">Kind</th>
                  <th className="text-left px-4 py-3">API Ref</th>
                  <th className="text-left px-4 py-3">Invoice</th>
                  <th className="text-left px-4 py-3">State</th>
                  <th className="text-left px-4 py-3">Reason</th>
                  <th className="text-left px-4 py-3">Processed</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.unmatchedReceipts.map((row) => {
                  const financeSearch = firstNonEmpty(
                    row.apiRef,
                    row.invoiceId,
                  );
                  const focusStatus = mapRawStateToFinanceStatus(row.rawState);

                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">{row.kind}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {row.apiRef || "N/A"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {row.invoiceId || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.rawState || "UNKNOWN"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-medium">
                          {row.mismatchReason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(row.processedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {financeSearch ? (
                          <div className="flex items-center gap-2">
                            <Link
                              href={buildFinanceTransactionsHref(financeSearch)}
                              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Open Finance
                            </Link>
                            <Link
                              href={buildFinanceTransactionsFilteredHref(
                                financeSearch,
                                focusStatus,
                              )}
                              className="inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                            >
                              Focus {focusStatus}
                            </Link>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-rose-600" />
          <h2 className="font-semibold text-slate-900">
            Verification-Failed Intents
          </h2>
        </div>

        {data.verificationFailedIntents.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No verification-failed intents found in the selected lookback
            window.
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {data.verificationFailedIntents.map((row) => {
              const financeSearch = firstNonEmpty(
                row.apiRef,
                row.providerRef,
                row.invoiceId,
                row.sourceId,
              );
              const focusStatus = mapIntentStatusToFinanceStatus(row.status);

              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-rose-200 bg-rose-50 p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-rose-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {row.kind} • {row.status}
                      </p>
                      <p className="text-xs text-rose-700 mt-1">
                        API Ref: {row.apiRef}
                      </p>
                      <p className="text-xs text-rose-700 mt-1">
                        Invoice: {row.invoiceId || "N/A"}
                      </p>
                      <p className="text-xs text-rose-700 mt-1">
                        Source: {row.sourceType || "N/A"} •{" "}
                        {row.sourceId || "N/A"}
                      </p>
                      {(row.failureReason || row.metadataReason) && (
                        <p className="text-xs text-rose-700 mt-1">
                          Reason: {row.failureReason || row.metadataReason}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-900">
                        {formatCurrency(row.amountExpected, row.currency)}
                      </p>
                      {row.amountReceived != null && (
                        <p className="text-xs text-rose-700 mt-1">
                          Received:{" "}
                          {formatCurrency(row.amountReceived, row.currency)}
                        </p>
                      )}
                      <p className="text-xs text-rose-700 mt-1">
                        Receipt linked:{" "}
                        {row.hasRecentWebhookReceipt ? "Yes" : "No"}
                      </p>
                      <p className="text-xs text-rose-700 mt-1">
                        Updated: {formatDate(row.updatedAt)}
                      </p>

                      <div className="mt-3 flex items-center justify-end gap-2">
                        {financeSearch ? (
                          <>
                            <Link
                              href={buildFinanceTransactionsHref(financeSearch)}
                              className="inline-flex items-center rounded-md border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Finance
                            </Link>
                            <Link
                              href={buildFinanceTransactionsFilteredHref(
                                financeSearch,
                                focusStatus,
                              )}
                              className="inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-200"
                            >
                              Focus {focusStatus}
                            </Link>
                          </>
                        ) : (
                          <span className="text-xs text-rose-400">
                            No finance key
                          </span>
                        )}
                        <Link
                          href={`/admin/users/${row.userId}`}
                          className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          User
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
