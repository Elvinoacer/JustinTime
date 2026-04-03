import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
  if (!session?.user?.id) redirect("/login");

  let wallet = await prisma.wallet.findUnique({
    where: { userId: session.user.id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId: session.user.id,
        balance: 0,
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
  }

  return (
    <div className="container mx-auto py-8 space-y-8 px-4 md:px-6 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Wallet & Credits
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your earnings and spending.
          </p>
        </div>
        <WalletActions currentBalance={Number(wallet.balance)} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Cash Balance */}
        <div className="bg-linear-to-br from-blue-600 to-blue-800 text-white rounded-2xl shadow-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>

          <div className="flex items-center gap-2 mb-4 text-blue-100 font-medium">
            <Wallet className="h-5 w-5" /> Cash Balance
          </div>

          <div className="text-4xl font-bold mb-6">
            KES {Number(wallet.balance).toLocaleString()}
          </div>

          <div className="flex gap-3 relative z-10">
            <Link
              href="/client/wallet"
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="h-4 w-4" /> Top Up
            </Link>
            <button
              disabled
              className="flex-1 bg-white/20 text-white/70 border-0 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
              title="Withdrawals are not available yet"
            >
              <ArrowUpRight className="h-4 w-4" /> Withdraw
            </button>
          </div>
        </div>

        {/* Credit Balance */}
        <div className="bg-white border border-purple-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6">
          <div className="flex items-center gap-2 mb-2 text-purple-900 font-medium">
            <Coins className="h-5 w-5 text-purple-600" /> Lead Gen Credits
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Use credits to apply for jobs.
          </p>

          <div className="text-4xl font-bold text-purple-700">
            {wallet.creditBalance}
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium bg-gray-50 inline-block px-2 py-1 rounded">
            ~ KES {(wallet.creditBalance * 100).toLocaleString()} value
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-xl font-bold text-gray-900">
            Transaction History
          </h2>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <TransactionList transactions={wallet.transactions} />
        </div>
      </div>
    </div>
  );
}
