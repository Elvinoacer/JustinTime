"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useProviderEarnings } from "@/lib/api/hooks/useProvider";
import { toast } from "sonner";

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
    if (earnings.breakdown.length === 0 && earnings.payouts.length === 0) {
      toast.error("No earnings data available to export");
      return;
    }

    try {
      // Prepare CSV content
      const rows = [
        ["Earnings Report"],
        [`Date Range: ${dateRange}`],
        [`Total Earnings: ${totalEarnings}`],
        [`Total Payouts: KES ${totalPayouts.toLocaleString()}`],
        [],
        ["Breakdown"],
        ["Service", "Amount"],
        ...earnings.breakdown.map((item: any) => [item.service, item.amount]),
        [],
        ["Payout History"],
        ["Date", "Amount"],
        ...earnings.payouts.map((item: any) => [item.date, item.amount]),
      ];

      const csvContent = "data:text/csv;charset=utf-8," 
        + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `earnings_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Earnings report exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export earnings report");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div role="status" aria-label="Loading earnings" className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-gray-700 font-medium">Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-gray-900 text-3xl font-bold leading-tight mb-2">
            Earnings
          </h1>
          <p className="text-gray-700 text-base font-normal leading-normal">
            Track your income and payout history
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-semibold text-gray-900 bg-white shadow-sm cursor-pointer hover:border-emerald-500 transition-colors"
            aria-label="Select date range"
          >
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
          </select>
          <button
            onClick={handleExport}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm"
            aria-label="Export earnings data"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
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
            gradient: "from-emerald-500 to-emerald-600",
            trend: "+12.5%",
          },
          {
            label: "Total Payouts",
            amount: `KES ${totalPayouts.toLocaleString()}`,
            icon: "account_balance",
            color: "blue",
            gradient: "from-blue-500 to-blue-600",
            trend: "+8.2%",
          },
          {
            label: "Pending Balance",
            amount: `KES ${pendingAmount.toLocaleString()}`,
            icon: "schedule",
            color: "amber",
            gradient: "from-amber-500 to-amber-600",
            trend: "—",
          },
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-md hover:shadow-lg p-6 border border-gray-200 transition-all"
            whileHover={{ y: -4 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${metric.gradient} flex items-center justify-center shadow-lg`}
              >
                <span className="material-symbols-outlined text-white text-2xl">
                  {metric.icon}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                  metric.trend.startsWith("+")
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-gray-50 text-gray-600 border-gray-100"
                }`}
              >
                {metric.trend}
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-semibold mb-1 uppercase tracking-wide">
              {metric.label}
            </h3>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{metric.amount}</p>
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
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600">pie_chart</span>
              Earnings Breakdown
            </h2>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-6 space-y-4">
              {earnings.breakdown.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-gray-400 text-3xl">bar_chart</span>
                  </div>
                  <p className="text-gray-900 font-medium">No earnings data</p>
                  <p className="text-gray-500 text-sm">Earnings for this period will appear here</p>
                </div>
              ) : (
                earnings.breakdown.map((item: any, index: number) => (
                  <motion.div
                    key={item.service}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.3 + index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-emerald-50/50 transition-colors border border-transparent hover:border-emerald-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-emerald-600 text-xl">
                          construction
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-900 font-bold text-sm">
                          {item.service}
                        </p>
                        <p className="text-gray-500 text-xs font-medium">Service Income</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">{item.amount}</p>
                  </motion.div>
                ))
              )}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-700">Total Earnings</p>
                <p className="font-bold text-2xl text-emerald-600">
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
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">history</span>
              Payout History
            </h2>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-6 space-y-4">
              {earnings.payouts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-gray-400 text-3xl">
                      account_balance_wallet
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium">No payouts yet</p>
                  <p className="text-gray-500 text-sm">Your payout history will appear here</p>
                </div>
              ) : (
                earnings.payouts.map((payout: any, index: number) => (
                  <motion.div
                    key={payout.date}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.3 + index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-blue-50/50 transition-colors border border-transparent hover:border-blue-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shadow-sm border border-green-200">
                        <span className="material-symbols-outlined text-green-600 text-lg">
                          check
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-900 font-bold text-sm">
                          Payout Completed
                        </p>
                        <p className="text-gray-500 text-xs font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">
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
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <button className="w-full text-gray-900 hover:text-blue-600 font-semibold text-sm flex items-center justify-center gap-2 transition-colors py-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200">
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
        className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-100">
            <span className="material-symbols-outlined text-blue-600 text-2xl">
              info
            </span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1 text-lg">
              Payout Information
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed max-w-3xl">
              Payouts are automatically processed weekly on <span className="font-semibold text-gray-900">Fridays</span>. 
              Pending earnings will be transferred to your registered bank account within 
              <span className="font-semibold text-gray-900"> 2-3 business days</span>. 
              Ensure your payment details are up to date in Settings.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EarningsPage;
