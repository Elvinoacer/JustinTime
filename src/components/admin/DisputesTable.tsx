'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  User,
  Scale,
  FileText,
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { resolveDispute } from '@/app/actions/admin';

interface Dispute {
  id: string;
  reason: string;
  status: string;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
  booking: {
    id: string;
    date: Date;
    service: { title: string } | null;
    totalAmount: any;
  };
  creator: { name: string | null; email: string | null; role: string };
  defendant: { name: string | null; email: string | null; role: string };
}

interface EnhancedDisputesTableProps {
  disputes: Dispute[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function EnhancedDisputesTable({ 
  disputes, 
  total, 
  currentPage, 
  totalPages 
}: EnhancedDisputesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: CheckCircle2,
        };
      case 'CLOSED':
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-200',
          icon: XCircle,
        };
      default:
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: AlertTriangle,
        };
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

  const handleOpenResolution = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolutionText(dispute.resolution || '');
  };

  const handleResolve = async (status: 'RESOLVED' | 'CLOSED') => {
    if (!selectedDispute) return;

    startTransition(async () => {
      const result = await resolveDispute(selectedDispute.id, resolutionText, status);
      if (result.success) {
        setSelectedDispute(null);
        setResolutionText('');
        router.refresh();
      } else {
        alert('Failed to resolve dispute');
      }
    });
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting disputes...');
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-red-50/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">All Disputes</h2>
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
                  Dispute Info
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Booking Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Parties
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {disputes.map((dispute, index) => {
                const statusConfig = getStatusConfig(dispute.status);
                const StatusIcon = statusConfig.icon;
                const daysSinceCreated = Math.floor(
                  (new Date().getTime() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <motion.tr
                    key={dispute.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-red-50/30 transition-all duration-200 cursor-pointer"
                    onClick={() => handleOpenResolution(dispute)}
                  >
                    {/* Dispute Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                          <Scale className="w-5 h-5 text-red-700" />
                        </div>
                        <div>
                          <p className="font-mono text-xs text-slate-500 mb-1">
                            #{dispute.id.slice(-8).toUpperCase()}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Calendar className="w-3 h-3" />
                            {formatDate(dispute.createdAt)}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {daysSinceCreated === 0 ? 'Today' : `${daysSinceCreated}d ago`}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Booking Details */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-600" />
                          {dispute.booking.service?.title || 'Custom Job'}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(dispute.booking.date)}
                        </p>
                        <p className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          KES {Number(dispute.booking.totalAmount).toLocaleString()}
                        </p>
                      </div>
                    </td>

                    {/* Parties */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {(dispute.creator.name || 'C')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-red-600">Complainant</p>
                            <p className="text-sm font-medium text-slate-900">{dispute.creator.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{dispute.creator.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {(dispute.defendant.name || 'D')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-600">Defendant</p>
                            <p className="text-sm font-medium text-slate-900">{dispute.defendant.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{dispute.defendant.role}</p>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-slate-700 line-clamp-3">
                          {dispute.reason}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {dispute.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenResolution(dispute);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {dispute.status === 'OPEN' ? 'Resolve' : 'View'}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {disputes.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <Scale className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No disputes found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-red-50/30">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{disputes.length}</span> of{' '}
                <span className="font-semibold text-slate-900">{total.toLocaleString()}</span> disputes
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => router.push(`?page=${currentPage - 1}`)}
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
                        onClick={() => router.push(`?page=${pageNum}`)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
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
                  onClick={() => router.push(`?page=${currentPage + 1}`)}
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

      {/* Dispute Resolution Modal */}
      <AnimatePresence>
        {selectedDispute && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDispute(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-red-600 to-rose-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="w-6 h-6" />
                      <h3 className="text-xl font-bold">Dispute Details</h3>
                    </div>
                    <p className="text-red-100 text-sm font-mono">
                      ID: {selectedDispute.id.slice(-12).toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDispute(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Parties */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Complainant
                    </p>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center text-white font-bold">
                        {(selectedDispute.creator.name || 'C')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{selectedDispute.creator.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-600">{selectedDispute.creator.email}</p>
                      </div>
                    </div>
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                      {selectedDispute.creator.role}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Defendant
                    </p>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white font-bold">
                        {(selectedDispute.defendant.name || 'D')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{selectedDispute.defendant.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-600">{selectedDispute.defendant.email}</p>
                      </div>
                    </div>
                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded">
                      {selectedDispute.defendant.role}
                    </span>
                  </div>
                </div>

                {/* Booking Info */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Related Booking</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Service</p>
                      <p className="font-semibold text-slate-900">{selectedDispute.booking.service?.title || 'Custom Job'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Date</p>
                      <p className="font-semibold text-slate-900">{formatDate(selectedDispute.booking.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Amount</p>
                      <p className="font-semibold text-emerald-700">KES {Number(selectedDispute.booking.totalAmount).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Dispute Reason */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-red-600" />
                    Reason for Dispute
                  </label>
                  <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-200 leading-relaxed">
                    {selectedDispute.reason}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Timeline</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Created:</span>
                      <span className="font-medium text-slate-900">{formatDate(selectedDispute.createdAt)} at {formatTime(selectedDispute.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Last Updated:</span>
                      <span className="font-medium text-slate-900">{formatDate(selectedDispute.updatedAt)} at {formatTime(selectedDispute.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Resolution */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Resolution / Admin Notes
                  </label>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none min-h-[120px] text-sm"
                    placeholder="Enter resolution details and any admin notes..."
                    disabled={selectedDispute.status !== 'OPEN'}
                  />
                </div>

                {/* Status & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div>
                    {(() => {
                      const statusConfig = getStatusConfig(selectedDispute.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${statusConfig.bg} ${statusConfig.text} border-2 ${statusConfig.border}`}>
                          <StatusIcon className="w-4 h-4" />
                          {selectedDispute.status}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedDispute(null)}
                      className="px-6 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium border border-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    {selectedDispute.status === 'OPEN' && (
                      <>
                        <button
                          onClick={() => handleResolve('CLOSED')}
                          disabled={isPending}
                          className="px-6 py-2.5 bg-slate-600 text-white hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Close Without Resolution
                        </button>
                        <button
                          onClick={() => handleResolve('RESOLVED')}
                          disabled={isPending || !resolutionText.trim()}
                          className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/30 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                        >
                          {isPending ? 'Resolving...' : 'Mark as Resolved'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
