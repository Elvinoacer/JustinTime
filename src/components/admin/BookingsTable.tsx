'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  User,
  Briefcase
} from 'lucide-react';

interface Booking {
  id: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  status: string;
  totalAmount: any;
  location: string | null;
  notes: string | null;
  clientPhone: string | null;
  client: { name: string | null; email: string | null };
  provider: { name: string | null; email: string | null };
  service: { title: string } | null;
}

interface EnhancedBookingsTableProps {
  bookings: Booking[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function EnhancedBookingsTable({ 
  bookings, 
  total, 
  currentPage, 
  totalPages 
}: EnhancedBookingsTableProps) {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: CheckCircle2,
        };
      case 'CONFIRMED':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: CheckCircle2,
        };
      case 'IN_PROGRESS':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-700',
          border: 'border-purple-200',
          icon: Clock,
        };
      case 'CANCELLED':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: XCircle,
        };
      case 'DISPUTED':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-700',
          border: 'border-orange-200',
          icon: XCircle,
        };
      default:
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-700',
          border: 'border-amber-200',
          icon: Clock,
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

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting bookings...');
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        {/* Table Header with Export */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">All Bookings</h2>
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
                  Booking Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((booking, index) => {
                const statusConfig = getStatusColor(booking.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.tr
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-blue-50/30 transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    {/* Booking Details */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <Briefcase className="w-5 h-5 text-blue-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {booking.service?.title || 'Custom Job'}
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            ID: {booking.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {(booking.client.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{booking.client.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {booking.client.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Provider */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {(booking.provider.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{booking.provider.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {booking.provider.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(booking.date)}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {booking.startTime || '--:--'} {booking.endTime && `- ${booking.endTime}`}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {booking.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 text-right">
                      <p className="text-lg font-bold text-slate-900">
                        KES {Number(booking.totalAmount).toLocaleString()}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                          }}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors group/btn"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-slate-400 group-hover/btn:text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === booking.id ? null : booking.id);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {bookings.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No bookings found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{bookings.length}</span> of{' '}
                <span className="font-semibold text-slate-900">{total.toLocaleString()}</span> bookings
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
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
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

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Booking Details</h3>
                    <p className="text-blue-100 text-sm mt-1 font-mono">
                      ID: {selectedBooking.id.slice(-12).toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Service Info */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Service</p>
                  <p className="text-lg font-bold text-slate-900">{selectedBooking.service?.title || 'Custom Job'}</p>
                </div>

                {/* Client & Provider */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Client
                    </p>
                    <p className="font-semibold text-slate-900">{selectedBooking.client.name || 'Unknown'}</p>
                    <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3" />
                      {selectedBooking.client.email}
                    </p>
                    {selectedBooking.clientPhone && (
                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {selectedBooking.clientPhone}
                      </p>
                    )}
                  </div>

                  <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                    <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Provider
                    </p>
                    <p className="font-semibold text-slate-900">{selectedBooking.provider.name || 'Unknown'}</p>
                    <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3" />
                      {selectedBooking.provider.email}
                    </p>
                  </div>
                </div>

                {/* Date, Time & Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Date</p>
                      <p className="flex items-center gap-2 text-slate-900 font-medium">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        {formatDate(selectedBooking.date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Time</p>
                      <p className="flex items-center gap-2 text-slate-900 font-medium">
                        <Clock className="w-4 h-4 text-blue-600" />
                        {selectedBooking.startTime || '--:--'} {selectedBooking.endTime && `- ${selectedBooking.endTime}`}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Location</p>
                    <p className="flex items-start gap-2 text-slate-900">
                      <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>{selectedBooking.location || 'Not specified'}</span>
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {selectedBooking.notes && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Notes</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-4 border border-slate-200">
                      {selectedBooking.notes}
                    </p>
                  </div>
                )}

                {/* Amount & Status */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-slate-900">
                      KES {Number(selectedBooking.totalAmount).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    {(() => {
                      const statusConfig = getStatusColor(selectedBooking.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${statusConfig.bg} ${statusConfig.text} border-2 ${statusConfig.border}`}>
                          <StatusIcon className="w-4 h-4" />
                          {selectedBooking.status.replace('_', ' ')}
                        </span>
                      );
                    })()}
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
