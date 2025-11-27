'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  ChevronLeft, 
  ChevronRight,
  Download,
  User,
  Shield,
  Briefcase,
  MoreVertical
} from 'lucide-react';

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
  totalPages 
}: EnhancedWalletsTableProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const handleExport = () => {
    console.log('Exporting wallets...');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/30">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">User Wallets</h2>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Wallet Info
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                User Details
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Current Balance
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
                      <Wallet className="w-5 h-5 text-violet-700" />
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
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {(wallet.user.name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{wallet.user.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{wallet.user.email}</p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {wallet.user.role === 'PROVIDER' ? (
                      <Briefcase className="w-4 h-4 text-purple-500" />
                    ) : (
                      <User className="w-4 h-4 text-blue-500" />
                    )}
                    <span className={`text-xs font-semibold ${
                      wallet.user.role === 'PROVIDER' ? 'text-purple-700' : 'text-blue-700'
                    }`}>
                      {wallet.user.role}
                    </span>
                  </div>
                </td>

                {/* Balance */}
                <td className="px-6 py-4">
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(Number(wallet.balance))}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
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
        <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{wallets.length}</span> of{' '}
              <span className="font-semibold text-slate-900">{total.toLocaleString()}</span> wallets
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(`?tab=wallets&page=${currentPage - 1}`)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => router.push(`?tab=wallets&page=${pageNum}`)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => router.push(`?tab=wallets&page=${currentPage + 1}`)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
