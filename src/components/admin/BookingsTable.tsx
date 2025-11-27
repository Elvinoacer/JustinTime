'use client';

import { useRouter } from 'next/navigation';

interface Booking {
  id: string;
  date: Date;
  startTime: string | null;
  status: string;
  totalAmount: any; // Decimal
  client: { name: string | null; email: string | null };
  provider: { name: string | null; email: string | null };
  service: { title: string } | null;
}

interface BookingsTableProps {
  bookings: Booking[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function BookingsTable({ bookings, total, currentPage, totalPages }: BookingsTableProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Service</th>
              <th className="px-6 py-4">Client</th>
              <th className="px-6 py-4">Provider</th>
              <th className="px-6 py-4">Date & Time</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-900">{booking.service?.title || 'Custom Job'}</span>
                  <div className="text-xs text-slate-500">ID: {booking.id.slice(-6)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-900">{booking.client.name || 'Unknown'}</span>
                    <span className="text-slate-500 text-xs">{booking.client.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-900">{booking.provider.name || 'Unknown'}</span>
                    <span className="text-slate-500 text-xs">{booking.provider.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  <div>{new Date(booking.date).toLocaleDateString()}</div>
                  <div className="text-xs">{booking.startTime || '--:--'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    booking.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                    booking.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700' :
                    booking.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium text-slate-900">
                  KES {Number(booking.totalAmount).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium">{bookings.length}</span> of <span className="font-medium">{total}</span> bookings
        </p>
        <div className="flex gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => router.push(`?page=${currentPage - 1}`)}
            className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50"
          >
            Previous
          </button>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => router.push(`?page=${currentPage + 1}`)}
            className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
