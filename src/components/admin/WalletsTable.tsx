'use client';

import { useRouter } from 'next/navigation';

interface Wallet {
  id: string;
  balance: any;
  updatedAt: Date;
  user: { name: string | null; email: string | null; role: string };
}

interface WalletsTableProps {
  wallets: Wallet[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function WalletsTable({ wallets, total, currentPage, totalPages }: WalletsTableProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Last Updated</th>
              <th className="px-6 py-4 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {wallets.map((wallet) => (
              <tr key={wallet.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-900 font-medium">{wallet.user.name || 'Unknown'}</span>
                    <span className="text-slate-500 text-xs">{wallet.user.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    wallet.user.role === 'PROVIDER' ? 'bg-indigo-50 text-indigo-700' :
                    wallet.user.role === 'CLIENT' ? 'bg-blue-50 text-blue-700' :
                    'bg-slate-50 text-slate-700'
                  }`}>
                    {wallet.user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(wallet.updatedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric'
                  })}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`font-bold text-lg ${
                    Number(wallet.balance) > 0 ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    KES {Number(wallet.balance).toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium">{wallets.length}</span> of <span className="font-medium">{total}</span> wallets
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
