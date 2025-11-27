'use client';

import { updateSupportTicket } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  adminNotes: string | null;
  resolution: string | null;
  createdAt: Date;
  user: { name: string | null; email: string | null; role: string };
}

interface SupportTicketsTableProps {
  tickets: SupportTicket[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function SupportTicketsTable({ tickets, total, currentPage, totalPages }: SupportTicketsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [status, setStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenEdit = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.adminNotes || '');
    setResolution(ticket.resolution || '');
    setStatus(ticket.status);
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedTicket) return;

    startTransition(async () => {
      const result = await updateSupportTicket(selectedTicket.id, {
        status,
        adminNotes,
        resolution,
      });

      if (result.success) {
        setIsModalOpen(false);
        setSelectedTicket(null);
        router.refresh();
      } else {
        alert('Failed to update ticket');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Ticket ID</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-500">
                  {ticket.id.slice(-6)}
                  <div className="text-xs">{new Date(ticket.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-900 font-medium">{ticket.user.name || 'Unknown'}</span>
                    <span className="text-slate-500 text-xs">{ticket.user.email}</span>
                    <span className="text-slate-400 text-[10px] uppercase">{ticket.user.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-900 font-medium block">{ticket.subject}</span>
                  <p className="text-slate-500 text-xs line-clamp-1 max-w-[200px]">{ticket.description}</p>
                </td>
                <td className="px-6 py-4 text-slate-600">{ticket.category}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    ticket.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                    ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    ticket.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    ticket.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' :
                    ticket.status === 'CLOSED' ? 'bg-gray-50 text-gray-700' :
                    ticket.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleOpenEdit(ticket)}
                    className="text-indigo-600 hover:text-indigo-900 font-medium text-xs"
                  >
                    Manage
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
          Showing <span className="font-medium">{tickets.length}</span> of <span className="font-medium">{total}</span> tickets
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

      {/* Edit Modal */}
      {isModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">Manage Ticket #{selectedTicket.id.slice(-6)}</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-100 whitespace-pre-wrap">
                {selectedTicket.description}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Admin Notes (Internal)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[80px] text-sm"
                placeholder="Internal notes..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Resolution (Visible to User)</label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[80px] text-sm"
                placeholder="Resolution details..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isPending}
                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
