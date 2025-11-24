"use client";
import React from "react";
import { motion } from "framer-motion";

const transactions = [
  {
    id: 1,
    description: "Payment for Plumbing Service",
    date: "Oct 24, 2023",
    amount: "- KES 2,500",
    status: "Completed",
    type: "debit",
  },
  {
    id: 2,
    description: "Wallet Top Up",
    date: "Oct 20, 2023",
    amount: "+ KES 5,000",
    status: "Completed",
    type: "credit",
  },
  {
    id: 3,
    description: "Refund for Cancelled Job",
    date: "Oct 15, 2023",
    amount: "+ KES 1,500",
    status: "Pending",
    type: "credit",
  },
];

export default function ClientWalletPage() {
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
            <h2 className="text-4xl font-bold mb-8">KES 12,450.00</h2>
            <div className="flex gap-4">
              <button className="bg-white text-emerald-700 px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">add</span>
                Top Up Wallet
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
            <div className="flex items-center gap-4 p-3 border border-emerald-100 bg-emerald-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-emerald-600">credit_card</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Visa ending in 4242</p>
                <p className="text-xs text-gray-500">Expires 12/24</p>
              </div>
              <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
            </div>
            <div className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-600">smartphone</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">M-Pesa</p>
                <p className="text-xs text-gray-500">0712 *** 789</p>
              </div>
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
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {transaction.type === 'credit' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{transaction.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.date}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                    transaction.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'
                  }`}>
                    {transaction.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-400 hover:text-gray-600">
                      <span className="material-symbols-outlined">receipt_long</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
