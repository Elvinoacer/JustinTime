"use client";
import {
  useTopUpWallet,
  useVerifyTopUp,
  useWallet,
} from "@/lib/api/hooks/useWallet";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Download,
  History,
  MoreVertical,
  Plus,
  QrCode,
  Receipt,
  Send,
  Wallet,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

function ClientWalletPageContent() {
  const { data: wallet, isLoading } = useWallet();
  const topUpMutation = useTopUpWallet();
  const verifyMutation = useVerifyTopUp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "credit" | "debit">(
    "all"
  );

  const [topUpAmount, setTopUpAmount] = useState<string>("1000");
  const [showQuickAmounts, setShowQuickAmounts] = useState(true);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment_status");
    const apiRef = searchParams.get("ref");

    if (paymentStatus === "success" && apiRef) {
      verifyMutation.mutate({ apiRef, amount: 1000 });
      router.replace("/client/wallet");
    }
  }, [searchParams, router, verifyMutation]);

  const handleTopUp = () => {
    const amount = parseInt(topUpAmount);
    if (!amount || amount < 10) {
      toast.error("Minimum top-up is KES 10");
      return;
    }
    topUpMutation.mutate({ amount });
  };

  const transactions = wallet?.transactions || [];

  const filteredTransactions =
    activeFilter === "all"
      ? transactions
      : activeFilter === "credit"
      ? transactions.filter((t) => t.type === "DEPOSIT" || t.type === "REFUND")
      : transactions.filter((t) => t.type !== "DEPOSIT" && t.type !== "REFUND");

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "DEPOSIT":
      case "REFUND":
        return <ArrowDownRight className="w-4 h-4" />;
      case "WITHDRAWAL":
        return <ArrowUpRight className="w-4 h-4" />;
      case "PAYMENT":
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    return type === "DEPOSIT" || type === "REFUND"
      ? "text-emerald-600 bg-emerald-50"
      : "text-red-600 bg-red-50";
  };

  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
        <div>
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900">
            Wallet & Payments
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage your balance and transaction history
          </p>
        </div>
        {!isMobile && (
          <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg sm:rounded-xl hover:bg-gray-800 transition-colors shadow-sm font-medium text-sm">
            <Download className="w-4 h-4" />
            Download Statement
          </button>
        )}
      </div>

      {/* Main Content Grid - Mobile: Stacked, Desktop: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Balance Card - Takes full width on mobile, 2/3 on desktop */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-lg relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5">
              <Wallet className="w-16 h-16 sm:w-24 sm:h-24" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-emerald-100 font-medium text-sm sm:text-base">
                  Total Balance
                </p>
                {isMobile && (
                  <button className="text-emerald-100 hover:text-white">
                    <History className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 lg:mb-8">
                {isLoading
                  ? "..."
                  : `KES ${Number(wallet?.balance || 0).toLocaleString()}`}
              </h2>

              {/* Top Up Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm font-bold">
                      KES
                    </span>
                    <input
                      type="number"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="w-full pl-10 pr-3 sm:pl-12 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      min="10"
                      placeholder="Amount"
                    />
                  </div>
                  <button
                    onClick={handleTopUp}
                    disabled={topUpMutation.isPending}
                    className="bg-white text-emerald-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-70 text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4" />
                    {topUpMutation.isPending ? "Processing..." : "Top Up"}
                  </button>
                </div>

                {/* Quick Amounts */}
                {showQuickAmounts && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <p className="text-xs sm:text-sm text-emerald-100 w-full mb-1">
                      Quick amounts:
                    </p>
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setTopUpAmount(amount.toString())}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          topUpAmount === amount.toString()
                            ? "bg-white text-emerald-700"
                            : "bg-emerald-500/30 text-white hover:bg-emerald-500/40"
                        }`}
                      >
                        KES {amount.toLocaleString()}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowQuickAmounts(false)}
                      className="px-2.5 py-1.5 text-emerald-100 hover:text-white text-xs"
                    >
                      Hide
                    </button>
                  </div>
                )}

                {/* Mobile Action Buttons */}
                {isMobile && (
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-emerald-500/30">
                    <button className="bg-emerald-500/30 text-white px-3 py-2 rounded-lg font-medium hover:bg-emerald-500/40 transition-colors flex items-center justify-center gap-1.5 text-sm">
                      <Send className="w-4 h-4" />
                      Withdraw
                    </button>
                    <button className="bg-emerald-500/30 text-white px-3 py-2 rounded-lg font-medium hover:bg-emerald-500/40 transition-colors flex items-center justify-center gap-1.5 text-sm">
                      <QrCode className="w-4 h-4" />
                      Pay with QR
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Desktop Action Buttons */}
          {!isMobile && (
            <div className="mt-3 sm:mt-4 flex gap-2">
              <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-medium transition-colors border border-gray-200 flex items-center justify-center gap-1.5">
                <Send className="w-4 h-4" />
                Withdraw Funds
              </button>
              <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-medium transition-colors border border-gray-200 flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4" />
                Generate QR
              </button>
            </div>
          )}
        </div>

        {/* Payment Methods & Stats */}
        <div className="space-y-3 sm:space-y-4">
          {/* Payment Methods */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-xs sm:shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                Payment Methods
              </h3>
              <button className="text-emerald-600 hover:text-emerald-700 text-xs sm:text-sm font-medium">
                Add New
              </button>
            </div>

            {/* Payment Methods List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">MP</span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                      M-Pesa
                    </p>
                    <p className="text-xs text-gray-500">+254 7XX XXX XXX</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              </div>

              <button className="w-full p-2.5 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1.5">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                Add Card or Bank
              </button>
            </div>
          </motion.div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 text-white"
          >
            <h3 className="text-sm sm:text-base font-bold mb-2 sm:mb-3">
              This Month
            </h3>
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-blue-100">
                  Total Spent
                </span>
                <span className="text-sm sm:text-base font-bold">
                  KES 15,240
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-blue-100">
                  Transactions
                </span>
                <span className="text-sm sm:text-base font-bold">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-blue-100">
                  Avg. Payment
                </span>
                <span className="text-sm sm:text-base font-bold">
                  KES 1,905
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-1.5">
              <History className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              Transaction History
            </h2>

            <div className="flex items-center gap-2">
              {/* Filter Tabs - Mobile: Scrollable, Desktop: Normal */}
              <div
                className={`flex ${
                  isMobile ? "overflow-x-auto pb-2" : "gap-1"
                } -mx-3 sm:mx-0 px-3 sm:px-0`}
              >
                {["all", "credit", "debit"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      activeFilter === filter
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {filter === "all" && "All"}
                    {filter === "credit" && "Credits"}
                    {filter === "debit" && "Debits"}
                  </button>
                ))}
              </div>

              {!isMobile && (
                <button className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className={isMobile ? "" : "overflow-x-auto"}>
          {isMobile ? (
            /* Mobile Transaction List */
            <div className="divide-y divide-gray-100">
              {filteredTransactions.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Wallet className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No transactions found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try changing your filters
                  </p>
                </div>
              ) : (
                filteredTransactions.slice(0, 10).map((transaction: any) => (
                  <div
                    key={transaction.id}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTransactionColor(
                            transaction.type
                          )}`}
                        >
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                            {transaction.description || "Transaction"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                ...(isMobile ? {} : { year: "numeric" }),
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${
                            transaction.type === "DEPOSIT" ||
                            transaction.type === "REFUND"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "DEPOSIT" ||
                          transaction.type === "REFUND"
                            ? "+"
                            : "-"}
                          KES {Number(transaction.amount).toLocaleString()}
                        </p>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            transaction.type === "DEPOSIT" ||
                            transaction.type === "REFUND"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        Receipt
                      </button>
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {filteredTransactions.length > 10 && (
                <button className="w-full p-3 text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium border-t border-gray-100">
                  View All {filteredTransactions.length} Transactions
                </button>
              )}
            </div>
          ) : (
            /* Desktop Transaction Table */
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 sm:px-6 py-8 text-center text-gray-500"
                    >
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction: any) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTransactionColor(
                              transaction.type
                            )}`}
                          >
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                            {transaction.description || "Transaction"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td
                        className={`px-4 sm:px-6 py-3 text-sm font-bold ${
                          transaction.type === "DEPOSIT" ||
                          transaction.type === "REFUND"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "DEPOSIT" ||
                        transaction.type === "REFUND"
                          ? "+"
                          : "-"}
                        KES {Number(transaction.amount).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === "DEPOSIT" ||
                            transaction.type === "REFUND"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right">
                        <button className="text-gray-400 hover:text-gray-600 p-1">
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg grid grid-cols-3 gap-2">
          <button className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-xs flex flex-col items-center justify-center gap-1">
            <History className="w-4 h-4" />
            History
          </button>
          <button className="px-3 py-2 bg-emerald-600 text-white rounded-lg font-medium text-xs flex flex-col items-center justify-center gap-1">
            <Plus className="w-4 h-4" />
            Top Up
          </button>
          <button className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-xs flex flex-col items-center justify-center gap-1">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClientWalletPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen px-4">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-emerald-600"></div>
        </div>
      }
    >
      <ClientWalletPageContent />
    </Suspense>
  );
}
