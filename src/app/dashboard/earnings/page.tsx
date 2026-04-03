"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  useProviderEarnings,
  useProviderEarningsChart,
  useProviderStats,
} from "@/lib/api/hooks/useProvider";
import { toast } from "sonner";

const EarningsPage = () => {
  const [dateRange, setDateRange] = useState("this-month");
  const { data: earningsData, isLoading } = useProviderEarnings(dateRange);
  const { data: chartResponse } = useProviderEarningsChart();
  const { data: statsResponse } = useProviderStats();

  const earnings = earningsData?.data || {
    total: 0,
    totalDisplay: "KES 0",
    breakdown: [],
    payouts: [],
  };

  const formatKes = (amount: number) =>
    `KES ${Math.round(amount).toLocaleString()}`;

  // Calculate summary metrics
  const totalEarnings = Number(earnings.total || 0);
  const totalEarningsDisplay =
    earnings.totalDisplay || formatKes(totalEarnings);
  const totalPayouts = earnings.payouts.reduce((sum: number, payout: any) => {
    return sum + Number(payout.amount || 0);
  }, 0);

  const pendingAmount = totalEarnings - totalPayouts;
  const chartData = Array.isArray(chartResponse?.data)
    ? chartResponse.data
    : [];
  const maxChartEarnings = Math.max(
    1,
    ...chartData.map((item: any) => Number(item.earnings || 0)),
  );
  const stats = Array.isArray(statsResponse?.stats) ? statsResponse.stats : [];

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
        [`Total Earnings: ${totalEarningsDisplay}`],
        [`Total Payouts: KES ${totalPayouts.toLocaleString()}`],
        [],
        ["Breakdown"],
        ["Service", "Amount"],
        ...earnings.breakdown.map((item: any) => [
          item.service,
          formatKes(Number(item.amount || 0)),
        ]),
        [],
        ["Payout History"],
        ["Date", "Amount"],
        ...earnings.payouts.map((item: any) => [
          new Date(item.date).toLocaleString(),
          formatKes(Number(item.amount || 0)),
        ]),
      ];

      const csvContent =
        "data:text/csv;charset=utf-8," +
        rows.map((e) => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `earnings_report_${new Date().toISOString().split("T")[0]}.csv`,
      );
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
      <div className="flex flex-col items-center justify-center min-h-75 sm:min-h-100">
        <div
          role="status"
          aria-label="Loading earnings"
          className="w-10 h-10 sm:w-12 sm:h-12 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3 sm:mb-4"
        />
        <p className="text-gray-700 font-medium text-sm sm:text-base">
          Loading financial data...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-gray-900 text-xl sm:text-2xl md:text-3xl font-bold leading-tight mb-1 sm:mb-2 truncate">
            Earnings
          </h1>
          <p className="text-gray-700 text-xs sm:text-sm font-normal leading-normal">
            Track your income and payout history
          </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full md:w-auto">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs sm:text-sm font-semibold text-gray-900 bg-white shadow-sm cursor-pointer hover:border-emerald-500 transition-colors w-full md:w-auto"
            aria-label="Select date range"
          >
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
          </select>
          <button
            onClick={handleExport}
            className="px-3 py-2 sm:px-5 sm:py-2.5 bg-gray-900 text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm w-full md:w-auto whitespace-nowrap"
            aria-label="Export earnings data"
          >
            <span className="material-symbols-outlined text-xs sm:text-sm">
              download
            </span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        {[
          {
            label: "Total Earnings",
            amount: totalEarningsDisplay,
            icon: "payments",
            color: "emerald",
            gradient: "from-emerald-500 to-emerald-600",
            trend: "+12.5%",
          },
          {
            label: "Total Payouts",
            amount: formatKes(totalPayouts),
            icon: "account_balance",
            color: "blue",
            gradient: "from-blue-500 to-blue-600",
            trend: "+8.2%",
          },
          {
            label: "Pending Balance",
            amount: formatKes(Math.max(0, pendingAmount)),
            icon: "schedule",
            color: "amber",
            gradient: "from-amber-500 to-amber-600",
            trend: "—",
          },
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-xs sm:shadow-sm hover:shadow-sm sm:hover:shadow-md p-4 sm:p-5 md:p-6 border border-gray-200 transition-all"
            whileHover={{ y: -2 }}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-linear-to-br ${metric.gradient} flex items-center justify-center shadow-md sm:shadow-lg`}
              >
                <span className="material-symbols-outlined text-white text-lg sm:text-xl md:text-2xl">
                  {metric.icon}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border ${
                  metric.trend.startsWith("+")
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-gray-50 text-gray-600 border-gray-100"
                }`}
              >
                {metric.trend}
              </span>
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm font-semibold mb-1 uppercase tracking-wide truncate">
              {metric.label}
            </h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight truncate">
              {metric.amount}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Activity Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-xs sm:shadow-sm border border-gray-200 p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-3">
            Last 7 Days
          </h2>
          {chartData.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500">
              No chart data available yet.
            </p>
          ) : (
            <div className="space-y-2">
              {chartData.map((entry: any) => {
                const amount = Number(entry.earnings || 0);
                const width = Math.max(8, (amount / maxChartEarnings) * 100);
                return (
                  <div
                    key={entry.name}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <span className="w-10 text-gray-600 font-medium">
                      {entry.name}
                    </span>
                    <div className="h-2.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-emerald-500 to-teal-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-gray-700 font-semibold">
                      {Math.round(amount).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-xs sm:shadow-sm border border-gray-200 p-4 sm:p-5">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-3">
            Provider Stats
          </h2>
          {stats.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500">
              No provider stats available.
            </p>
          ) : (
            <div className="space-y-2.5">
              {stats.slice(0, 4).map((item: any) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between text-xs sm:text-sm"
                >
                  <span className="text-gray-600">{item.title}</span>
                  <span className="font-bold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Breakdown and Payouts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* Earnings Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="min-w-0"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                pie_chart
              </span>
              <span>Earnings Breakdown</span>
            </h2>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-xs sm:shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3 md:space-y-4">
              {earnings.breakdown.length === 0 ? (
                <div className="text-center py-6 sm:py-8 md:py-12">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <span className="material-symbols-outlined text-gray-400 text-xl sm:text-2xl md:text-3xl">
                      bar_chart
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium text-sm sm:text-base">
                    No earnings data
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Earnings for this period will appear here
                  </p>
                </div>
              ) : (
                earnings.breakdown.map((item: any, index: number) => (
                  <motion.div
                    key={item.service}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: 0.2 + index * 0.02 }}
                    className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-emerald-50/50 transition-colors border border-transparent hover:border-emerald-100"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <span className="material-symbols-outlined text-emerald-600 text-base sm:text-lg md:text-xl">
                          construction
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-900 font-bold text-xs sm:text-sm truncate">
                          {item.service}
                        </p>
                        <p className="text-gray-500 text-xs font-medium truncate">
                          Service Income
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900 text-xs sm:text-sm md:text-base truncate ml-2">
                      {formatKes(Number(item.amount || 0))}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-700 text-sm sm:text-base">
                  Total Earnings
                </p>
                <p className="font-bold text-lg sm:text-xl md:text-2xl text-emerald-600 truncate">
                  {totalEarningsDisplay}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Payout History */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="min-w-0"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="material-symbols-outlined text-blue-600 text-sm sm:text-base">
                history
              </span>
              <span>Payout History</span>
            </h2>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-xs sm:shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3 md:space-y-4">
              {earnings.payouts.length === 0 ? (
                <div className="text-center py-6 sm:py-8 md:py-12">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <span className="material-symbols-outlined text-gray-400 text-xl sm:text-2xl md:text-3xl">
                      account_balance_wallet
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium text-sm sm:text-base">
                    No payouts yet
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Your payout history will appear here
                  </p>
                </div>
              ) : (
                earnings.payouts.map((payout: any, index: number) => (
                  <motion.div
                    key={payout.id || payout.date}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: 0.2 + index * 0.02 }}
                    className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-blue-50/50 transition-colors border border-transparent hover:border-blue-100"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-green-100 rounded-full flex items-center justify-center shadow-sm border border-green-200 shrink-0">
                        <span className="material-symbols-outlined text-green-600 text-base sm:text-lg">
                          check
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-900 font-bold text-xs sm:text-sm truncate">
                          Payout Completed
                        </p>
                        <p className="text-gray-500 text-xs font-medium flex items-center gap-0.5 sm:gap-1 truncate">
                          <span className="material-symbols-outlined text-[10px]">
                            calendar_today
                          </span>
                          {new Date(payout.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-green-600 text-xs sm:text-sm md:text-base truncate ml-2">
                      {formatKes(Number(payout.amount || 0))}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
            {earnings.payouts.length > 0 && (
              <div className="border-t border-gray-200 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 bg-gray-50">
                <button className="w-full text-gray-900 hover:text-blue-600 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-colors py-1.5 sm:py-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200">
                  <span>View All Payouts</span>
                  <span className="material-symbols-outlined text-xs sm:text-sm">
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.2 }}
        className="mt-4 sm:mt-6 md:mt-8 bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-xs"
      >
        <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
            <span className="material-symbols-outlined text-blue-600 text-lg sm:text-xl md:text-2xl">
              info
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 mb-1 text-sm sm:text-base md:text-lg truncate">
              Payout Information
            </h3>
            <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
              Payouts are automatically processed weekly on{" "}
              <span className="font-semibold text-gray-900">Fridays</span>.
              Pending earnings will be transferred to your registered bank
              account within
              <span className="font-semibold text-gray-900">
                {" "}
                2-3 business days
              </span>
              . Ensure your payment details are up to date in Settings.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EarningsPage;
