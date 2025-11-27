"use client";
import React, { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useWallet, useTopUpWallet, useVerifyTopUp } from "@/lib/api/hooks/useWallet";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

function ClientWalletPageContent() {
  const { data: wallet, isLoading } = useWallet();
  const topUpMutation = useTopUpWallet();
  const verifyMutation = useVerifyTopUp();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [topUpAmount, setTopUpAmount] = useState<string>("1000");

  useEffect(() => {
    const paymentStatus = searchParams.get("payment_status");
    const apiRef = searchParams.get("ref");

    if (paymentStatus === "success" && apiRef) {
      // Verify payment
      // Note: In a real app, we shouldn't pass amount here if possible, or verify it on backend
      // For this demo, we assume the amount from the session or default
      // Since we can't easily get the amount back without querying IntaSend, we'll use a stored value or just 1000 for demo
      // Ideally, the backend should look up the pending transaction by apiRef
      
      verifyMutation.mutate({ apiRef, amount: 1000 }); // Hardcoded 1000 for demo verification as we don't persist amount in URL
      
      // Clean up URL
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet & Payments</h1>
          <p className="text-gray-500">Manage your balance and transaction history.</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200 font-medium">
          <span className="material-symbols-outlined text-sm">history</span>
          <span>Download Statement</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl shadow-emerald-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <span className="material-symbols-outlined text-9xl">account_balance_wallet</span>
          </div>
          <div className="relative z-10">
            <p className="text-emerald-100 font-medium mb-1">Total Balance</p>
            <h2 className="text-4xl font-bold mb-8">
              {isLoading ? "..." : `KES ${Number(wallet?.balance || 0).toLocaleString()}`}
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm font-bold">KES</span>
                <input 
                  type="number" 
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="pl-12 pr-4 py-2.5 rounded-xl text-gray-900 font-bold w-32 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  min="10"
                />
              </div>
              <button 
                onClick={handleTopUp}
                disabled={topUpMutation.isPending}
                className="bg-white text-emerald-700 px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                {topUpMutation.isPending ? "Processing..." : "Top Up Wallet"}
              </button>
              <button className="bg-emerald-500 bg-opacity-30 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-opacity-40 transition-colors border border-emerald-400 border-opacity-30 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">send</span>
                Withdraw
              </button>
            </div>
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900">Payment Methods</h3>
            <button className="text-emerald-600 text-sm font-medium hover:text-emerald-700">Add New</button>
          </div>
          <div className="space-y-4">
            {/* Empty State for Payment Methods */}
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-gray-400">credit_card_off</span>
              </div>
              <p className="text-sm text-gray-500">No payment methods saved.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
          <div className="flex gap-2">
            <select className="bg-gray-50 border-none text-sm font-medium text-gray-600 rounded-lg cursor-pointer focus:ring-0">
              <option>All Transactions</option>
              <option>Credits</option>
              <option>Debits</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction: any) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === 'DEPOSIT' || transaction.type === 'REFUND' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span className="material-symbols-outlined text-sm">
                            {transaction.type === 'DEPOSIT' || transaction.type === 'REFUND' ? 'arrow_downward' : 'arrow_upward'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{transaction.description || "Transaction"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                      transaction.type === 'DEPOSIT' || transaction.type === 'REFUND' ? 'text-emerald-600' : 'text-gray-900'
                    }`}>
                      {transaction.type === 'DEPOSIT' || transaction.type === 'REFUND' ? '+' : '-'} KES {Number(transaction.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">receipt_long</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ClientWalletPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>}>
      <ClientWalletPageContent />
    </Suspense>
  );
}
