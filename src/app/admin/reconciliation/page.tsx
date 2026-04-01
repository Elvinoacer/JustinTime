import { getPaymentLifecycleReconciliation } from "@/app/actions/admin";
import { AlertTriangle, CircleAlert, Scale, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

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

export default async function AdminReconciliationPage() {
  const data = await getPaymentLifecycleReconciliation(100);

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
        <p className="text-xs text-slate-500">
          Last generated: {new Date(data.generatedAt).toLocaleString()}
        </p>
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
            {data.staleThresholdHours}h
          </p>
        </div>
      </div>

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
                      Booking {row.bookingId} • Payment {row.paymentId}
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      Job: {row.jobTitle || row.jobId || "N/A"}
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      Status: Booking {row.bookingStatus || "N/A"} / Payment{" "}
                      {row.paymentStatus}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-900">
                      {formatCurrency(row.amount)}
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      Open for {row.hoursOpen}h
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      {formatDate(row.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
