"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useProviderEarnings } from "@/lib/api/hooks/useProvider";

const EarningsPage = () => {
  const [dateRange, setDateRange] = useState("this-month");
  const { data: earningsData, isLoading } = useProviderEarnings(dateRange);

  const earnings = earningsData?.data || {
    total: "KES 0",
    breakdown: [],
    payouts: [],
  };

  // Calculate summary metrics
  const totalEarnings = earnings.total;
  const totalPayouts = earnings.payouts.reduce((sum: number, payout: any) => {
    const amount = parseFloat(payout.amount.replace(/[^0-9.-]+/g, ""));
    return sum + amount;
  }, 0);
  
  const numericTotalEarnings = parseFloat(totalEarnings.replace(/[^0-9.-]+/g, ""));
  const pendingAmount = numericTotalEarnings - totalPayouts;

  const handleExport = () => {
    // Placeholder for export functionality
    alert("Export functionality would be implemented here");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" aria-label="Loading earnings" className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-gray-800 text-3xl font-bold leading-tight mb-2">
            Earnings
          </h1>
          <p className="text-gray-500 text-sm font-normal leading-normal">
            Track your income and payout history
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-medium text-gray-700"
            aria-label="Select date range"
          >
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors flex items-center gap-2"
            aria-label="Export earnings data"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          {
            label: "Total Earnings",
            amount: totalEarnings,
            icon: "payments",
            color: "emerald",
            trend: "+12.5%",
          },
          {
            label: "Total Payouts",
            amount: `KES ${totalPayouts.toLocaleString()}`,
            icon: "account_balance",
            color: "blue",
            trend: "+8.2%",
          },
          {
            label: "Pending",
            amount: `KES ${pendingAmount.toLocaleString()}`,
            icon: "schedule",
            color: "yellow",
            trend: "—",
          },
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  metric.color === "emerald"
                    ? "bg-emerald-100"
                    : metric.color === "blue"
                    ? "bg-blue-100"
                    : "bg-yellow-100"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    metric.color === "emerald"
                      ? "text-emerald-600"
                      : metric.color === "blue"
                      ? "text-blue-600"
                      : "text-yellow-600"
                  }`}
                >
                  {metric.icon}
                </span>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  metric.trend.startsWith("+")
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {metric.trend}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">
              {metric.label}
            </h3>
            <p className="text-3xl font-bold text-gray-900">{metric.amount}</p>
          </motion.div>
        ))}
      </div>

      {/* Breakdown and Payouts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Earnings Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Earnings Breakdown
            </h2>
            <span className="material-symbols-outlined text-gray-400">
              pie_chart
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 space-y-4">
              {earnings.breakdown.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No earnings data for this period
                </div>
              ) : (
                earnings.breakdown.map((item: any, index: number) => (
                  <motion.div
                    key={item.service}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.3 + index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary-600 text-sm">
                          construction
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium text-sm">
                          {item.service}
                        </p>
                        <p className="text-gray-500 text-xs">Service income</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">{item.amount}</p>
                  </motion.div>
                ))
              )}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-900">Total Earnings</p>
                <p className="font-bold text-2xl text-primary-600">
                  {earnings.total}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Payout History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Payout History</h2>
            <span className="material-symbols-outlined text-gray-400">
              history
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 space-y-4">
              {earnings.payouts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-gray-400 text-3xl">
                      account_balance_wallet
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">No payouts yet</p>
                </div>
              ) : (
                earnings.payouts.map((payout: any, index: number) => (
                  <motion.div
                    key={payout.date}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.3 + index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-green-600 text-sm">
                          check_circle
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium text-sm">
                          Payout Completed
                        </p>
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">
                            calendar_today
                          </span>
                          {payout.date}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-green-600">{payout.amount}</p>
                  </motion.div>
                ))
              )}
            </div>
            {earnings.payouts.length > 0 && (
              <div className="border-t border-gray-200 px-6 py-4">
                <button className="w-full text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center justify-center gap-1 transition-colors">
                  View All Payouts
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-blue-600">
              info
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Payout Information
            </h3>
            <p className="text-blue-700 text-sm leading-relaxed">
              Payouts are processed weekly on Fridays. Pending earnings will be
              transferred to your registered bank account within 2-3 business
              days.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EarningsPage;
