'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  Download,
  CreditCard,
  Wallet,
  RefreshCcw,
  DollarSign
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: any;
  type: string;
  status: string;
  createdAt: Date;
  wallet: {
    user: {
      name: string | null;
      email: string | null;
      role: string;
    };
  };
}

interface EnhancedTransactionsTableProps {
  transactions: Transaction[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function EnhancedTransactionsTable({ 
  transactions, 
  total, 
  currentPage, 
  totalPages 
}: EnhancedTransactionsTableProps) {
  const router = useRouter();

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return {
          icon: ArrowDownRight,
          bg: 'bg-emerald-100',
          text: 'text-emerald-700',
          amountClass: 'text-emerald-600',
          prefix: '+'
        };
      case 'WITHDRAWAL':
        return {
          icon: ArrowUpRight,
          bg: 'bg-red-100',
          text: 'text-red-700',
          amountClass: 'text-red-600',
          prefix: '-'
        };
      case 'PAYMENT':
        return {
          icon: CreditCard,
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          amountClass: 'text-slate-900',
          prefix: ''
        };
      case 'REFUND':
        return {
          icon: RefreshCcw,
          bg: 'bg-orange-100',
          text: 'text-orange-700',
          amountClass: 'text-orange-600',
          prefix: '+'
        };
      default:
        return {
          icon: DollarSign,
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          amountClass: 'text-slate-900',
          prefix: ''
        };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { icon: CheckCircle2, text: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'PENDING':
        return { icon: Clock, text: 'text-amber-600', bg: 'bg-amber-50' };
      case 'FAILED':
        return { icon: XCircle, text: 'text-red-600', bg: 'bg-red-50' };
      default:
        return { icon: Clock, text: 'text-slate-600', bg: 'bg-slate-50' };
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const handleExport = () => {
    console.log('Exporting transactions...');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
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
                Transaction ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction, index) => {
              const typeConfig = getTypeConfig(transaction.type);
              const statusConfig = getStatusConfig(transaction.status);
              const TypeIcon = typeConfig.icon;
              const StatusIcon = statusConfig.icon;

              return (
                <motion.tr
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group hover:bg-emerald-50/30 transition-all duration-200"
                >
                  {/* Transaction ID */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeConfig.bg}`}>
                        <TypeIcon className={`w-4 h-4 ${typeConfig.text}`} />
                      </div>
                      <span className="font-mono text-xs text-slate-500">
                        #{transaction.id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                  </td>

                  {/* User */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {(transaction.wallet.user.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{transaction.wallet.user.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{transaction.wallet.user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${typeConfig.bg} ${typeConfig.text}`}>
                      {transaction.type}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${typeConfig.amountClass}`}>
                      {typeConfig.prefix} {formatCurrency(Number(transaction.amount))}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {transaction.status}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-900">{formatDate(transaction.createdAt)}</span>
                      <span className="text-xs text-slate-500">{formatTime(transaction.createdAt)}</span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {transactions.length === 0 && (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <DollarSign className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No transactions found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{transactions.length}</span> of{' '}
              <span className="font-semibold text-slate-900">{total.toLocaleString()}</span> transactions
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(`?tab=transactions&page=${currentPage - 1}`)}
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
                      onClick={() => router.push(`?tab=transactions&page=${pageNum}`)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
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
                onClick={() => router.push(`?tab=transactions&page=${currentPage + 1}`)}
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
