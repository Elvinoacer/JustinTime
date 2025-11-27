import { getUsers } from '@/app/actions/admin';
import { prisma } from '@/lib/prisma';
import VerificationsGrid from '@/components/admin/VerificationsGrid';

export const dynamic = 'force-dynamic';

async function getVerificationStats() {
  const [pending, verified, rejected, totalProviders] = await Promise.all([
    prisma.profile.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.profile.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.profile.count({ where: { verificationStatus: 'REJECTED' } }),
    prisma.user.count({ where: { role: 'PROVIDER' } }),
  ]);

  return { pending, verified, rejected, totalProviders };
}

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const status = params.status || 'PENDING';
  
  const [{ users, total, totalPages, currentPage }, stats] = await Promise.all([
    getUsers(page, 12, search, 'PROVIDER', status),
    getVerificationStats()
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Provider Verifications</h1>
        <p className="text-slate-500 text-sm mt-1">Review and manage provider verification requests</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-xl border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700 text-xs font-medium uppercase">Pending Review</p>
              <p className="text-3xl font-bold text-amber-900 mt-1">{stats.pending}</p>
            </div>
            <span className="material-symbols-outlined text-5xl text-amber-300">pending_actions</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-xl border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-700 text-xs font-medium uppercase">Verified</p>
              <p className="text-3xl font-bold text-emerald-900 mt-1">{stats.verified}</p>
            </div>
            <span className="material-symbols-outlined text-5xl text-emerald-300">verified</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-700 text-xs font-medium uppercase">Rejected</p>
              <p className="text-3xl font-bold text-red-900 mt-1">{stats.rejected}</p>
            </div>
            <span className="material-symbols-outlined text-5xl text-red-300">cancel</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-xs font-medium uppercase">Total Providers</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{stats.totalProviders}</p>
            </div>
            <span className="material-symbols-outlined text-5xl text-purple-300">group</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Filter:</span>
          <a
            href="/admin/verifications?status=PENDING"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              status === 'PENDING'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-600 ring-offset-1'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pending ({stats.pending})
          </a>
          <a
            href="/admin/verifications?status=VERIFIED"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              status === 'VERIFIED'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600 ring-offset-1'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Verified ({stats.verified})
          </a>
          <a
            href="/admin/verifications?status=REJECTED"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              status === 'REJECTED'
                ? 'bg-red-600 text-white shadow-md ring-2 ring-red-600 ring-offset-1'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Rejected ({stats.rejected})
          </a>
        </div>
        
        <p className="text-sm text-slate-600">
          Showing {total} provider{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Providers Grid */}
      <VerificationsGrid 
        users={users} 
        total={total} 
        currentPage={currentPage} 
        totalPages={totalPages}
        currentStatus={status}
      />
    </div>
  );
}
