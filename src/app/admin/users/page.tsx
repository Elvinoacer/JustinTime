import { getUsers } from '@/app/actions/admin';
import UsersTable from '@/components/admin/UsersTable';
import { prisma } from '@/lib/prisma';
import UsersFilters from '@/components/admin/UsersFilters';

export const dynamic = 'force-dynamic';

async function getUserStats() {
  const [totalUsers, totalClients, totalProviders, bannedUsers, pendingVerifications, verifiedProviders] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({ where: { role: 'PROVIDER' } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.profile.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.profile.count({ where: { verificationStatus: 'VERIFIED' } }),
  ]);

  return { totalUsers, totalClients, totalProviders, bannedUsers, pendingVerifications, verifiedProviders };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; role?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const role = params.role || '';
  const status = params.status || '';

  const [{ users, total, totalPages, currentPage }, stats] = await Promise.all([
    getUsers(page, 10, search, role, status),
    getUserStats()
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and moderate platform users</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-xs font-medium uppercase">Total Users</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
          <p className="text-blue-700 text-xs font-medium uppercase">Clients</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalClients}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm">
          <p className="text-purple-700 text-xs font-medium uppercase">Providers</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">{stats.totalProviders}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm">
          <p className="text-amber-700 text-xs font-medium uppercase">Pending</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats.pendingVerifications}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-sm">
          <p className="text-emerald-700 text-xs font-medium uppercase">Verified</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.verifiedProviders}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
          <p className="text-red-700 text-xs font-medium uppercase">Banned</p>
          <p className="text-2xl font-bold text-red-900 mt-1">{stats.bannedUsers}</p>
        </div>
      </div>

      {/* Filters */}
      <UsersFilters currentRole={role} currentStatus={status} currentSearch={search} />

      {/* Users Table */}
      <UsersTable 
        users={users} 
        total={total} 
        currentPage={currentPage} 
        totalPages={totalPages} 
      />
    </div>
  );
}
