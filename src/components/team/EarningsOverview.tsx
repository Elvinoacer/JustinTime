"use client";

import { DollarSign, CreditCard, Banknote, Wallet } from "lucide-react";

interface EarningsOverviewProps {
  totalCollected: number;
  jobCount: number;
  byMethod: Record<string, number>;
  byCollector: Record<string, number>;
  members?: Record<string, { name: string }>;
}

export function EarningsOverview({
  totalCollected,
  jobCount,
  byMethod,
  byCollector,
  members = {},
}: EarningsOverviewProps) {
  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount);

  const methodIcons: Record<string, any> = {
    CASH: Banknote,
    MPESA: Wallet,
    CARD: CreditCard,
  };

  const methodColors: Record<string, string> = {
    CASH: "bg-green-100 text-green-700",
    MPESA: "bg-emerald-100 text-emerald-700",
    CARD: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 bg-linear-to-r from-emerald-500 to-teal-600 text-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Today&apos;s Collections</h2>
          <DollarSign className="h-6 w-6 opacity-80" />
        </div>
        <p className="text-3xl font-bold">{formatAmount(totalCollected)}</p>
        <p className="text-emerald-100 mt-1">
          {jobCount} job{jobCount !== 1 ? "s" : ""} completed
        </p>
      </div>

      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          By Payment Method
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(byMethod).map(([method, amount]) => {
            const Icon = methodIcons[method] || DollarSign;
            const colorClass =
              methodColors[method] || "bg-gray-100 text-gray-700";

            return (
              <div key={method} className={`rounded-lg p-3 ${colorClass}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{method}</span>
                </div>
                <p className="font-bold">{formatAmount(amount)}</p>
              </div>
            );
          })}
        </div>

        {Object.keys(byMethod).length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">
            No collections today
          </p>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          By Team Member
        </h3>
        <div className="space-y-2">
          {Object.entries(byCollector).map(([collectorId, amount]) => {
            const collectorName = members[collectorId]?.name || "Unknown";
            const percentage =
              totalCollected > 0
                ? Math.round((amount / totalCollected) * 100)
                : 0;

            return (
              <div key={collectorId} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {collectorName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium text-gray-900">
                      {collectorName}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatAmount(amount)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(byCollector).length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">
            No collections recorded
          </p>
        )}
      </div>
    </div>
  );
}
