import {
  getPaymentLifecycleReconciliation,
  processWalletManualAdjustmentAction,
  resolveReconciliationEventAction,
} from "@/app/actions/admin";
import { AlertTriangle, CircleAlert, Scale, Wallet } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ReconciliationSearchParams {
  staleValue?: string | string[];
  staleUnit?: string | string[];
  limit?: string | string[];
}

function firstQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
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

async function handleReconciliationFormAction(formData: FormData) {
  "use server";
  await resolveReconciliationEventAction(formData);
}

async function handleManualWalletAdjustmentFormAction(formData: FormData) {
  "use server";
  await processWalletManualAdjustmentAction(formData);
}

export default async function AdminReconciliationPage({
  searchParams,
}: {
  searchParams?: Promise<ReconciliationSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const staleUnit =
    firstQueryValue(params.staleUnit) === "minutes" ? "minutes" : "hours";
  const staleValueRaw = Number.parseInt(
    firstQueryValue(params.staleValue) ||
      (staleUnit === "minutes" ? "60" : "48"),
    10,
  );
  const staleValue = Number.isFinite(staleValueRaw)
    ? Math.max(1, staleValueRaw)
    : staleUnit === "minutes"
      ? 60
      : 48;

  const limitRaw = Number.parseInt(firstQueryValue(params.limit) || "100", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 10), 250)
    : 100;

  const staleThresholdMinutes =
    staleUnit === "minutes" ? staleValue : staleValue * 60;

  const data = await getPaymentLifecycleReconciliation(
    limit,
    staleThresholdMinutes,
  );

  const staleThresholdLabel =
    data.staleThresholdMinutes >= 60 && data.staleThresholdMinutes % 60 === 0
      ? `${data.staleThresholdMinutes / 60}h`
      : `${data.staleThresholdMinutes}m`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-xl">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Payment Reconciliation
            </h1>
            <p className="text-slate-500 text-sm">
              Detect mismatched lifecycle states and unresolved financial items.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/reconciliation/payment-intents"
            className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Webhook Intent View
          </Link>
          <p className="text-xs text-slate-500">
            Last generated: {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">
            Mismatches
          </p>
          <p className="text-2xl font-bold text-amber-900">
            {data.mismatchCount}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold text-rose-700 mb-1">
            Unresolved Payments
          </p>
          <p className="text-2xl font-bold text-rose-900">
            {data.unresolvedCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            Stale Threshold
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {staleThresholdLabel}
          </p>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Detection Filters</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure stale age threshold and record window for unresolved event
            detection.
          </p>
        </div>

        <form
          method="get"
          className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <label className="text-xs font-medium text-slate-600 space-y-1">
            Stale Value
            <input
              name="staleValue"
              type="number"
              min="1"
              required
              defaultValue={String(staleValue)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="text-xs font-medium text-slate-600 space-y-1">
            Unit
            <select
              name="staleUnit"
              defaultValue={staleUnit}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option value="hours">Hours</option>
              <option value="minutes">Minutes</option>
            </select>
          </label>

          <label className="text-xs font-medium text-slate-600 space-y-1">
            Max Records
            <select
              name="limit"
              defaultValue={String(limit)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
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
              Apply Filters
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 flex items-center gap-2">
          <CircleAlert className="w-4 h-4 text-amber-600" />
          <h2 className="font-semibold text-slate-900">Lifecycle Mismatches</h2>
        </div>

        {data.mismatches.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No booking and payment lifecycle mismatches detected.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3">Booking</th>
                  <th className="text-left px-4 py-3">Job</th>
                  <th className="text-left px-4 py-3">States</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Issue</th>
                  <th className="text-left px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.mismatches.map((row) => (
                  <tr
                    key={`${row.bookingId}-${row.paymentId}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {row.bookingId}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.jobTitle || row.jobId || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs text-slate-700">
                        <span>Booking: {row.bookingStatus}</span>
                        <span>Payment: {row.paymentStatus}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-semibold">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          row.severity === "high"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {row.issue}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(row.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-rose-600" />
          <h2 className="font-semibold text-slate-900">
            Unresolved Financial Events
          </h2>
        </div>

        {data.unresolvedFinancialEvents.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No stale unresolved financial events detected.
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {data.unresolvedFinancialEvents.map((row) => (
              <div
                key={row.paymentId}
                className="rounded-xl border border-rose-200 bg-rose-50 p-4"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-rose-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {row.issue}
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      {row.entityType === "PAYMENT"
                        ? `Booking ${row.bookingId} • Payment ${row.paymentId}`
                        : row.entityType === "TOPUP"
                          ? `Wallet Top-up • ${"apiRef" in row ? row.apiRef : row.paymentId}`
                          : `Ledger Event • Transaction ${row.paymentId}`}
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      Job: {row.jobTitle || row.jobId || "N/A"}
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      Status: Booking {row.bookingStatus || "N/A"} / Payment{" "}
                      {row.paymentStatus}
                    </p>
                    {"description" in row && row.description && (
                      <p className="text-xs text-rose-700 mt-1">
                        Ref: {row.description}
                      </p>
                    )}
                    {"gatewayReference" in row && row.gatewayReference && (
                      <p className="text-xs text-rose-700 mt-1">
                        Gateway ref: {row.gatewayReference}
                      </p>
                    )}
                    {"gatewaySessionId" in row && row.gatewaySessionId && (
                      <p className="text-xs text-rose-700 mt-1">
                        Session: {row.gatewaySessionId}
                      </p>
                    )}
                    {"failureReason" in row && row.failureReason && (
                      <p className="text-xs text-rose-700 mt-1">
                        Failure reason: {row.failureReason}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-900">
                      {formatCurrency(row.amount)}
                    </p>
                    {"amountReceived" in row && row.amountReceived != null && (
                      <p className="text-xs text-rose-700 mt-1">
                        Received: {formatCurrency(row.amountReceived)}
                      </p>
                    )}
                    <p className="text-xs text-rose-700 mt-1">
                      Open for {row.hoursOpen}h
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      {formatDate(row.createdAt)}
                    </p>
                  </div>
                </div>

                {row.entityType === "PAYMENT" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={handleReconciliationFormAction}>
                      <input
                        type="hidden"
                        name="paymentId"
                        value={row.paymentId}
                      />
                      <input
                        type="hidden"
                        name="bookingId"
                        value={row.bookingId || ""}
                      />
                      <input
                        type="hidden"
                        name="reason"
                        value="Admin force-settled from reconciliation dashboard"
                      />
                      <button
                        type="submit"
                        name="resolutionAction"
                        value="FORCE_SETTLE"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Force Settle
                      </button>
                    </form>

                    <form action={handleReconciliationFormAction}>
                      <input
                        type="hidden"
                        name="paymentId"
                        value={row.paymentId}
                      />
                      <input
                        type="hidden"
                        name="bookingId"
                        value={row.bookingId || ""}
                      />
                      <input
                        type="hidden"
                        name="reason"
                        value="Admin refunded from reconciliation dashboard"
                      />
                      <button
                        type="submit"
                        name="resolutionAction"
                        value="REFUND"
                        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                      >
                        Refund
                      </button>
                    </form>

                    <form action={handleReconciliationFormAction}>
                      <input
                        type="hidden"
                        name="paymentId"
                        value={row.paymentId}
                      />
                      <input
                        type="hidden"
                        name="bookingId"
                        value={row.bookingId || ""}
                      />
                      <input
                        type="hidden"
                        name="reason"
                        value="Admin voided from reconciliation dashboard"
                      />
                      <button
                        type="submit"
                        name="resolutionAction"
                        value="VOID"
                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Void
                      </button>
                    </form>
                  </div>
                ) : row.entityType === "TOPUP" ? (
                  <div className="mt-3 space-y-2">
                    <form action={handleReconciliationFormAction}>
                      <input
                        type="hidden"
                        name="topUpId"
                        value={"topUpId" in row ? row.topUpId : row.paymentId}
                      />
                      <input
                        type="hidden"
                        name="paymentId"
                        value={row.paymentId}
                      />
                      <input
                        type="hidden"
                        name="reason"
                        value="Admin marked stale top-up as resolved from reconciliation dashboard"
                      />
                      <button
                        type="submit"
                        name="resolutionAction"
                        value="MARK_TOPUP_RESOLVED"
                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Mark Resolved
                      </button>
                    </form>

                    {"rawWebhookPayload" in row && row.rawWebhookPayload && (
                      <details className="rounded-lg border border-rose-200 bg-white/70 p-3 text-xs text-rose-800">
                        <summary className="cursor-pointer font-semibold">
                          View Raw Webhook Payload
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">
                          {JSON.stringify(row.rawWebhookPayload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-rose-300 bg-white/60 px-3 py-2 text-xs text-rose-700">
                    Review this pending ledger event in webhook and payment
                    logs. Settlement actions are available for payment lifecycle
                    items above.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Manual Wallet Adjustment
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Creates audited adjustment entries with before/after wallet
            balances.
          </p>
        </div>

        <form
          action={handleManualWalletAdjustmentFormAction}
          className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <label className="text-xs font-medium text-slate-600 space-y-1">
            Target User (ID or Email)
            <input
              name="targetUser"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="user_id or user@email.com"
            />
          </label>

          <label className="text-xs font-medium text-slate-600 space-y-1">
            Direction
            <select
              name="direction"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              defaultValue="CREDIT"
            >
              <option value="CREDIT">Credit</option>
              <option value="DEBIT">Debit</option>
            </select>
          </label>

          <label className="text-xs font-medium text-slate-600 space-y-1">
            Amount (KES)
            <input
              name="amount"
              required
              min="0.01"
              step="0.01"
              type="number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="0.00"
            />
          </label>

          <label className="text-xs font-medium text-slate-600 space-y-1">
            Source Reference (Optional)
            <input
              name="sourceReference"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="ticket id / correction id"
            />
          </label>

          <label className="text-xs font-medium text-slate-600 space-y-1 md:col-span-2">
            Mandatory Reason
            <textarea
              name="reason"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              placeholder="Explain why this adjustment is required"
              rows={3}
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Apply Adjustment
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">
            Wallet Debits & Promo Impact
          </h2>
          <p className="text-xs text-slate-500">
            Last {data.promoImpactSummary.evaluationWindowDays} days
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border-b border-slate-100 bg-slate-50">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Debit Events
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {data.promoImpactSummary.totalWalletDebitEvents}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Debit Amount
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatCurrency(data.promoImpactSummary.totalWalletDebitAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Promo-Tagged Events
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {data.promoImpactSummary.promoAppliedEvents}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Promo-Tagged Amount
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatCurrency(data.promoImpactSummary.promoAppliedAmount)}
            </p>
          </div>
        </div>

        {data.walletDebitActivities.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No wallet debit activity captured for the configured window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Promo</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-left px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.walletDebitActivities.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex flex-col">
                        <span>{row.userName}</span>
                        <span className="text-xs text-slate-500">
                          {row.userEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {row.promoApplied ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Applied
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
