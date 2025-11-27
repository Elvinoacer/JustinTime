'use client';

import { resolveDispute } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface Dispute {
  id: string;
  reason: string;
  status: string;
  resolution: string | null;
  createdAt: Date;
  booking: {
    id: string;
    service: { title: string } | null;
    totalAmount: any;
  };
  creator: { name: string | null; email: string | null; role: string };
  defendant: { name: string | null; email: string | null; role: string };
}

interface DisputesTableProps {
  disputes: Dispute[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function DisputesTable({ disputes, total, currentPage, totalPages }: DisputesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenResolution = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolutionText(dispute.resolution || '');
    setIsModalOpen(true);
  };

  const handleResolve = async (status: 'RESOLVED' | 'CLOSED') => {
    if (!selectedDispute) return;

    startTransition(async () => {
      const result = await resolveDispute(selectedDispute.id, resolutionText, status);
      if (result.success) {
        setIsModalOpen(false);
        setSelectedDispute(null);
        setResolutionText('');
        router.refresh();
      } else {
        alert('Failed to resolve dispute');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Dispute ID</th>
              <th className="px-6 py-4">Booking</th>
              <th className="px-6 py-4">Parties</th>
              <th className="px-6 py-4">Reason</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {disputes.map((dispute) => (
              <tr key={dispute.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-500">
                  {dispute.id.slice(-6)}
                  <div className="text-xs">{new Date(dispute.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-900">{dispute.booking.service?.title || 'Custom Job'}</span>
                  <div className="text-xs text-slate-500">KES {Number(dispute.booking.totalAmount).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs">
                      <span className="font-semibold text-red-600">Complainant:</span> {dispute.creator.name} ({dispute.creator.role})
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold text-slate-600">Defendant:</span> {dispute.defendant.name} ({dispute.defendant.role})
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="line-clamp-2 text-slate-600 max-w-xs" title={dispute.reason}>{dispute.reason}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    dispute.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' :
                    dispute.status === 'CLOSED' ? 'bg-gray-50 text-gray-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {dispute.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleOpenResolution(dispute)}
                    className="text-indigo-600 hover:text-indigo-900 font-medium text-xs"
                  >
                    View & Resolve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium">{disputes.length}</span> of <span className="font-medium">{total}</span> disputes
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

      {/* Resolution Modal */}
      {isModalOpen && selectedDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Resolve Dispute #{selectedDispute.id.slice(-6)}</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Reason for Dispute</label>
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-100">
                {selectedDispute.reason}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Resolution / Notes</label>
              <textarea
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[100px]"
                placeholder="Enter resolution details..."
                disabled={selectedDispute.status !== 'OPEN'}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              {selectedDispute.status === 'OPEN' && (
                <>
                  <button
                    onClick={() => handleResolve('CLOSED')}
                    disabled={isPending}
                    className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium"
                  >
                    Close (No Action)
                  </button>
                  <button
                    onClick={() => handleResolve('RESOLVED')}
                    disabled={isPending || !resolutionText.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {isPending ? 'Resolving...' : 'Resolve Dispute'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
