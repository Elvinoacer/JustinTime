import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import {
  getWalletSummaryForUser,
  getWalletTransactionsForUser,
} from "@/lib/wallet/queries";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, Coins, ArrowUpRight, Plus, History } from "lucide-react";
import { TransactionList } from "@/components/revenue/TransactionList";
import { WalletActions } from "@/components/revenue/WalletActions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Wallet | JustinTime",
  description: "Manage your funds and credits",
};

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (!hasRole(session.user, "PROVIDER")) redirect("/client/wallet");

  const [wallet, walletHistory] = await Promise.all([
    getWalletSummaryForUser(session.user.id),
    getWalletTransactionsForUser(session.user.id, {
      page: 1,
      pageSize: 20,
    }),
  ]);

  const pendingTopUpsCount =
    wallet.topUpStats.pendingCount + wallet.topUpStats.processingCount;
  const failedTopUpsCount = wallet.topUpStats.failedCount;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-3 py-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-8 sm:px-4 sm:py-8 md:px-6">
      <div className="flex flex-col items-start justify-between gap-3 border-b border-gray-100 pb-4 sm:pb-6 md:flex-row md:items-center md:gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Wallet & Credits
          </h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">
            Manage your earnings and spending.
          </p>
        </div>
        <WalletActions currentBalance={Number(wallet.availableBalance)} />
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Cash Balance */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 to-blue-800 p-4 text-white shadow-lg sm:p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>

          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-100 sm:mb-4 sm:text-base">
            <Wallet className="h-5 w-5" /> Cash Balance
          </div>

          <div className="mb-3 text-3xl font-bold sm:text-4xl">
            KES {Number(wallet.availableBalance).toLocaleString()}
          </div>

          <div className="mb-4 space-y-1 text-[11px] text-blue-100 sm:mb-5 sm:text-xs">
            <p>
              Pending incoming: KES{" "}
              {Number(
                wallet.pendingIncoming || wallet.pendingBalance,
              ).toLocaleString()}
            </p>
            <p>
              Pending top-ups: {pendingTopUpsCount} • Failed top-ups:{" "}
              {failedTopUpsCount}
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Link
              href="/client/wallet"
              className="flex-1 rounded-lg border-0 bg-white/20 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/30 sm:text-sm"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Plus className="h-4 w-4" /> Top Up
              </span>
            </Link>
            <button
              type="button"
              disabled
              className="flex-1 cursor-not-allowed rounded-lg border-0 bg-white/20 py-2 text-xs font-semibold text-white/70 sm:text-sm"
              title="Withdrawals are not available yet"
            >
              <span className="flex items-center justify-center gap-1.5">
                <ArrowUpRight className="h-4 w-4" /> Withdraw
              </span>
            </button>
          </div>
        </div>

        {/* Credit Balance */}
        <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-900 sm:text-base">
            <Coins className="h-5 w-5 text-purple-600" /> Lead Gen Credits
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Use credits to apply for jobs.
          </p>

          <div className="text-3xl font-bold text-purple-700 sm:text-4xl">
            {wallet.creditBalance}
          </div>
          <p className="mt-2 inline-block rounded bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-400 sm:text-xs">
            ~ KES {(wallet.creditBalance * 100).toLocaleString()} value
          </p>
        </div>
      </div>

      {pendingTopUpsCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 sm:p-4 sm:text-sm">
          You have {pendingTopUpsCount} pending top-up
          {pendingTopUpsCount === 1 ? "" : "s"}. These funds are not spendable
          until status becomes Confirmed.
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
            Transaction History
          </h2>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <TransactionList transactions={walletHistory.items} />
        </div>
      </div>
    </div>
  );
}
