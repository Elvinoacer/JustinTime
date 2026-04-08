"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Download,
  Filter,
  History,
  Plus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  clearStoredPendingTopUp,
  getStoredPendingTopUp,
  WalletTransaction,
  useTopUpWallet,
  useWallet,
  useWalletTopUpStatus,
  useWalletTransactions,
} from "@/lib/api/hooks/useWallet";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";

function formatCurrency(value: number | string | null | undefined): string {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) {
    return "KES 0";
  }

  return `KES ${parsed.toLocaleString()}`;
}

function statusTone(status: string): string {
  switch (status) {
    case "SETTLED":
      return "bg-emerald-100 text-emerald-700";
    case "PENDING":
    case "PROCESSING":
      return "bg-amber-100 text-amber-700";
    case "FAILED":
    case "REVERSED":
      return "bg-red-100 text-red-700";
    case "CANCELLED":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "SETTLED":
      return "Confirmed";
    case "PENDING":
      return "Pending confirmation";
    case "PROCESSING":
      return "Processing";
    case "FAILED":
      return "Failed";
    case "REVERSED":
      return "Reversed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function isCredit(tx: WalletTransaction): boolean {
  if (tx.direction) {
    return tx.direction === "CREDIT";
  }

  return ["DEPOSIT", "REFUND", "EARNING"].includes(tx.type);
}

function transactionReference(tx: WalletTransaction): string | null {
  if (tx.topUp?.apiRef) {
    return tx.topUp.apiRef;
  }

  if (tx.gatewayReference) {
    return tx.gatewayReference;
  }

  if (tx.providerRef) {
    const pieces = tx.providerRef.split(":");
    return pieces[pieces.length - 1] || tx.providerRef;
  }

  return null;
}

export default function ClientWalletPage() {
  const queryClient = useQueryClient();
  const [topUpAmount, setTopUpAmount] = useState("1000");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "SETTLED" | "PENDING" | "FAILED"
  >("ALL");
  const [directionFilter, setDirectionFilter] = useState<
    "ALL" | "CREDIT" | "DEBIT"
  >("ALL");
  const [pendingTopUpRef, setPendingTopUpRef] = useState<{
    apiRef?: string;
    topUpId?: string;
  } | null>(null);
  const [statusToastKey, setStatusToastKey] = useState<string | null>(null);

  const { data: wallet, isLoading: walletLoading } = useWallet();
  const topUpMutation = useTopUpWallet();

  const txFilters = useMemo(
    () => ({
      page,
      pageSize: 12,
      status:
        statusFilter === "ALL"
          ? undefined
          : statusFilter === "PENDING"
            ? "PENDING"
            : statusFilter,
      direction: directionFilter === "ALL" ? undefined : directionFilter,
    }),
    [directionFilter, page, statusFilter],
  );

  const transactionsQuery = useWalletTransactions(txFilters);
  const pendingTopUpStatus = useWalletTopUpStatus(
    {
      apiRef: pendingTopUpRef?.apiRef,
      topUpId: pendingTopUpRef?.topUpId,
    },
    {
      enabled: Boolean(pendingTopUpRef?.apiRef || pendingTopUpRef?.topUpId),
      retry: 1,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        const isTerminal =
          status === "SETTLED" ||
          status === "FAILED" ||
          status === "CANCELLED" ||
          status === "REVERSED";
        return isTerminal ? false : 4000;
      },
    },
  );

  useEffect(() => {
    setPage(1);
  }, [statusFilter, directionFilter]);

  useEffect(() => {
    const pending = getStoredPendingTopUp();
    if (pending?.apiRef || pending?.topUpId) {
      setPendingTopUpRef(pending);
    }
  }, []);

  useEffect(() => {
    const status = pendingTopUpStatus.data?.status;
    if (!status || !pendingTopUpStatus.data?.isTerminal) {
      return;
    }

    const toastKey = `${pendingTopUpStatus.data.topUpId}:${status}`;
    if (statusToastKey === toastKey) {
      return;
    }

    setStatusToastKey(toastKey);
    clearStoredPendingTopUp();
    setPendingTopUpRef(null);

    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.transactions() });

    if (status === "SETTLED") {
      toast.success(
        `Top-up confirmed: ${formatCurrency(pendingTopUpStatus.data.amountReceived ?? pendingTopUpStatus.data.amountExpected)}`,
      );
      return;
    }

    if (status === "FAILED") {
      toast.error("Top-up failed. No wallet credit was added.");
      return;
    }

    if (status === "CANCELLED") {
      toast.message("Top-up was cancelled.");
      return;
    }

    if (status === "REVERSED") {
      toast.error("Top-up was reversed by the payment provider.");
    }
  }, [pendingTopUpStatus.data, queryClient, statusToastKey]);

  const handleTopUp = () => {
    const amount = parseInt(topUpAmount, 10);
    if (!amount || amount < 10) {
      toast.error("Minimum top-up is KES 10");
      return;
    }

    topUpMutation.mutate({
      amount,
      returnUrl: "/client/wallet/topup-complete",
    });
  };

  const transactions = transactionsQuery.data?.items || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Wallet & Payments
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Available funds, pending top-ups, and complete ledger history.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <Download className="h-4 w-4" />
            Download Statement
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-linear-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-emerald-100">
                  Available Balance
                </p>
                <Wallet className="h-5 w-5 text-emerald-100" />
              </div>
              <p className="text-3xl font-bold sm:text-4xl">
                {walletLoading
                  ? "..."
                  : formatCurrency(
                      wallet?.availableBalance || wallet?.balance || 0,
                    )}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-white/15 p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-100">
                    Pending Incoming
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {walletLoading
                      ? "..."
                      : formatCurrency(wallet?.pendingIncoming || 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/15 p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-100">
                    Pending Top-ups
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {walletLoading
                      ? "..."
                      : (wallet?.topUpStats.pendingCount || 0) +
                        (wallet?.topUpStats.processingCount || 0)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-slate-500">
                    KES
                  </span>
                  <input
                    type="number"
                    min="10"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full rounded-xl border border-emerald-100 bg-white py-2.5 pl-11 pr-3 text-slate-900 focus:border-emerald-300 focus:outline-none"
                    placeholder="Top-up amount"
                  />
                </div>
                <button
                  onClick={handleTopUp}
                  disabled={topUpMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-70"
                >
                  <Plus className="h-4 w-4" />
                  {topUpMutation.isPending ? "Creating checkout..." : "Top Up"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                This Month
              </h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Total Spent</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(wallet?.monthlyStats.spent || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Settled Debits</span>
                  <span className="font-semibold text-slate-900">
                    {wallet?.monthlyStats.transactionCount || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Average Debit</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(wallet?.monthlyStats.averageSpent || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Top-up Health
              </h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Pending / Processing</span>
                  <span className="font-semibold text-amber-700">
                    {(wallet?.topUpStats.pendingCount || 0) +
                      (wallet?.topUpStats.processingCount || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Failed This Month</span>
                  <span className="font-semibold text-red-700">
                    {wallet?.topUpStats.failedCount || 0}
                  </span>
                </div>
              </div>
              {(wallet?.topUpStats.pendingCount || 0) > 0 && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Pending top-ups are not spendable until status becomes
                  Confirmed.
                </p>
              )}
            </div>
          </div>
        </div>

        {wallet?.recentPendingTransactions?.length ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-amber-800">
              <Clock3 className="h-4 w-4" />
              <p className="text-sm font-semibold">Awaiting Confirmation</p>
            </div>
            <div className="space-y-2 text-sm">
              {wallet.recentPendingTransactions.slice(0, 3).map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-col gap-1 rounded-lg bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {tx.description || "Wallet top-up"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Ref: {transactionReference(tx) || "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(tx.amount)}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(tx.status)}`}
                    >
                      {statusLabel(tx.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
                <History className="h-5 w-5 text-slate-500" />
                Transaction History
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500">
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "ALL" ||
                      value === "SETTLED" ||
                      value === "PENDING" ||
                      value === "FAILED"
                    ) {
                      setStatusFilter(value);
                    }
                  }}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="ALL">All statuses</option>
                  <option value="SETTLED">Confirmed</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>
                <select
                  value={directionFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "ALL" ||
                      value === "CREDIT" ||
                      value === "DEBIT"
                    ) {
                      setDirectionFilter(value);
                    }
                  }}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="ALL">All directions</option>
                  <option value="CREDIT">Credits</option>
                  <option value="DEBIT">Debits</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactionsQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No transactions found for selected filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const credit = isCredit(tx);
                    const reference = transactionReference(tx);

                    return (
                      <tr
                        key={tx.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <div
                              className={`mt-0.5 rounded-full p-1 ${
                                credit
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {credit ? (
                                <ArrowDownRight className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {tx.description || "Wallet transaction"}
                              </p>
                              {tx.failureReason ? (
                                <p className="mt-1 inline-flex items-center gap-1 text-xs text-red-600">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  {tx.failureReason}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {reference || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(tx.status)}`}
                          >
                            {statusLabel(tx.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            credit ? "text-emerald-700" : "text-red-700"
                          }`}
                        >
                          {credit ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm">
            <p className="text-slate-500">
              {transactionsQuery.data
                ? `Showing ${transactions.length} of ${transactionsQuery.data.total} transactions`
                : "Loading history..."}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-slate-600">Page {page}</span>
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!transactionsQuery.data?.hasMore}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Full wallet history uses paginated data from the server. Confirmed
          funds are shown separately from pending top-ups.
        </div>
      </div>
    </div>
  );
}
