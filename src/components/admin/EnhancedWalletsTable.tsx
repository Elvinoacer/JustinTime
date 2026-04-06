"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  User,
  Wallet,
  Eye,
  Mail,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface WalletData {
  id: string;
  balance: any;
  user: {
    name: string | null;
    email: string | null;
    role: string;
  };
}

interface EnhancedWalletsTableProps {
  wallets: WalletData[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function EnhancedWalletsTable({
  wallets,
  total,
  currentPage,
  totalPages,
}: EnhancedWalletsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "wallets");
    params.set("page", String(page));
    return `?${params.toString()}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `KES ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `KES ${(amount / 1000).toFixed(1)}K`;
    }
    return `KES ${amount}`;
  };

  const handleExport = () => {
    console.log("Exporting wallets...");
  };

  // Mobile Card View Component
  const MobileWalletCard = ({
    wallet,
    index,
  }: {
    wallet: WalletData;
    index: number;
  }) => {
    return (
      <motion.div
        key={wallet.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:shadow-lg transition-all duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-violet-100 rounded-lg flex-none">
              <Wallet className="w-4 h-4 text-violet-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-slate-500 mb-1">
                #{wallet.id.slice(-6).toUpperCase()}
              </p>
              <p className="text-sm font-medium text-slate-900 truncate">
                {wallet.user.name || "Unknown"}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 flex-none">
            ACTIVE
          </span>
        </div>

        {/* User Details */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[linear-gradient(to_bottom_right,var(--tw-gradient-stops))] from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-none">
            {(wallet.user.name || "U")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {wallet.user.role === "PROVIDER" ? (
                <Briefcase className="w-3.5 h-3.5 text-purple-500" />
              ) : (
                <User className="w-3.5 h-3.5 text-blue-500" />
              )}
              <span
                className={`text-xs font-semibold ${
                  wallet.user.role === "PROVIDER"
                    ? "text-purple-700"
                    : "text-blue-700"
                }`}
              >
                {wallet.user.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {wallet.user.email}
            </p>
          </div>
        </div>

        {/* Balance & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500 mb-1">Balance</p>
            <span className="text-lg font-bold text-slate-900">
              {formatCompactCurrency(Number(wallet.balance))}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-violet-100 rounded-lg transition-colors">
              <Eye className="w-4 h-4 text-slate-400" />
            </button>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm sm:shadow-lg border border-slate-100 sm:border-slate-100 overflow-hidden">
      {/* Table Header */}
      <div className="px-3 xs:px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-[linear-gradient(to_right,var(--tw-gradient-stops))] from-slate-50 to-violet-50/30">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base xs:text-lg font-bold text-slate-900">
              User Wallets
            </h2>
            <span className="bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full font-medium">
              {total.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 xs:px-4 xs:py-2 bg-white border border-slate-200 rounded-lg text-xs xs:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex-none self-start xs:self-auto"
          >
            <Download className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
            <span className="hidden xs:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="block lg:hidden p-3 xs:p-4 space-y-3">
        {wallets.map((wallet, index) => (
          <MobileWalletCard key={wallet.id} wallet={wallet} index={index} />
        ))}

        {wallets.length === 0 && (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
              <Wallet className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium text-sm">
              No wallets found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Wallet Info
              </th>
              <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                User Details
              </th>
              <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Current Balance
              </th>
              <th className="px-4 xl:px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {wallets.map((wallet, index) => (
              <motion.tr
                key={wallet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group hover:bg-violet-50/30 transition-all duration-200"
              >
                {/* Wallet Info */}
                <td className="px-4 xl:px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors flex-none">
                      <Wallet className="w-4 h-4 text-violet-700" />
                    </div>
                    <div>
                      <p className="font-mono text-xs text-slate-500 mb-1">
                        #{wallet.id.slice(-8).toUpperCase()}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                </td>

                {/* User Details */}
                <td className="px-4 xl:px-6 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-[linear-gradient(to_bottom_right,var(--tw-gradient-stops))] from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-none">
                      {(wallet.user.name || "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {wallet.user.name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {wallet.user.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 xl:px-6 py-3">
                  <div className="flex items-center gap-2">
                    {wallet.user.role === "PROVIDER" ? (
                      <Briefcase className="w-4 h-4 text-purple-500" />
                    ) : (
                      <User className="w-4 h-4 text-blue-500" />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        wallet.user.role === "PROVIDER"
                          ? "text-purple-700"
                          : "text-blue-700"
                      }`}
                    >
                      {wallet.user.role}
                    </span>
                  </div>
                </td>

                {/* Balance */}
                <td className="px-4 xl:px-6 py-3">
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(Number(wallet.balance))}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 xl:px-6 py-3">
                  <div className="flex items-center justify-center">
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors group/btn">
                      <MoreVertical className="w-4 h-4 text-slate-400 group-hover/btn:text-violet-600" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {wallets.length === 0 && (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <Wallet className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No wallets found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-3 xs:px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-[linear-gradient(to_right,var(--tw-gradient-stops))] from-slate-50 to-violet-50/30">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-0">
            <p className="text-xs xs:text-sm text-slate-600 text-center xs:text-left">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {wallets.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {total.toLocaleString()}
              </span>{" "}
              wallets
            </p>

            <div className="flex items-center justify-center gap-1 xs:gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(buildPageUrl(currentPage - 1))}
                className="flex items-center gap-1 px-3 py-1.5 xs:px-4 xs:py-2 text-xs xs:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline">Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage <= 2) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 1) {
                    pageNum = totalPages - 2 + i;
                  } else {
                    pageNum = currentPage - 1 + i;
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => router.push(buildPageUrl(pageNum))}
                      className={`w-8 h-8 xs:w-10 xs:h-10 rounded-lg text-xs xs:text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => router.push(buildPageUrl(currentPage + 1))}
                className="flex items-center gap-1 px-3 py-1.5 xs:px-4 xs:py-2 text-xs xs:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <span className="hidden xs:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
