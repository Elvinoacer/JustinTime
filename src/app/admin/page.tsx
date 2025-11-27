import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  const [
    totalUsers,
    totalProviders,
    totalClients,
    pendingVerifications,
    totalBookings,
    completedBookings,
    activeDisputes,
    openTickets,
    totalRevenue,
    recentUsers,
    recentBookings,
    recentDisputes
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'PROVIDER' } }),
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.profile.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
    prisma.dispute.count({ where: { status: 'OPEN' } }),
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    prisma.booking.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalAmount: true }
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    }),
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true } },
        service: { select: { title: true } }
      }
    }),
    prisma.dispute.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { name: true } },
        booking: { select: { id: true } }
      }
    })
  ]);

  return {
    totalUsers,
    totalProviders,
    totalClients,
    pendingVerifications,
    totalBookings,
    completedBookings,
    activeDisputes,
    openTickets,
    totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
    recentUsers,
    recentBookings,
    recentDisputes
  };
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Monitor your platform's key metrics and activities</p>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-blue-700 text-sm font-medium">Total Users</h3>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalUsers}</p>
              <p className="text-blue-600 text-xs mt-1">
                {stats.totalClients} clients · {stats.totalProviders} providers
              </p>
            </div>
            <span className="material-symbols-outlined text-5xl text-blue-300">group</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl shadow-sm border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-amber-700 text-sm font-medium">Pending Verifications</h3>
              <p className="text-3xl font-bold text-amber-900 mt-2">{stats.pendingVerifications}</p>
              <Link href="/admin/verifications" className="text-amber-600 text-xs mt-1 hover:underline">
                Review now →
              </Link>
            </div>
            <span className="material-symbols-outlined text-5xl text-amber-300">pending_actions</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl shadow-sm border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-emerald-700 text-sm font-medium">Total Bookings</h3>
              <p className="text-3xl font-bold text-emerald-900 mt-2">{stats.totalBookings}</p>
              <p className="text-emerald-600 text-xs mt-1">
                {stats.completedBookings} completed
              </p>
            </div>
            <span className="material-symbols-outlined text-5xl text-emerald-300">calendar_month</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-sm border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-purple-700 text-sm font-medium">Total Revenue</h3>
              <p className="text-2xl font-bold text-purple-900 mt-2">KES {stats.totalRevenue.toLocaleString()}</p>
              <p className="text-purple-600 text-xs mt-1">
                Platform fees: KES {(stats.totalRevenue * 0.10).toLocaleString()}
              </p>
            </div>
            <span className="material-symbols-outlined text-5xl text-purple-300">payments</span>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(stats.activeDisputes > 0 || stats.openTickets > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.activeDisputes > 0 && (
            <Link href="/admin/disputes" className="bg-red-50 border border-red-200 p-4 rounded-lg hover:bg-red-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-red-600">warning</span>
                <div>
                  <h3 className="font-semibold text-red-900">{stats.activeDisputes} Active Disputes</h3>
                  <p className="text-sm text-red-600">Requires immediate attention</p>
                </div>
              </div>
            </Link>
          )}
          {stats.openTickets > 0 && (
            <Link href="/admin/support" className="bg-amber-50 border border-amber-200 p-4 rounded-lg hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-amber-600">support_agent</span>
                <div>
                  <h3 className="font-semibold text-amber-900">{stats.openTickets} Open Support Tickets</h3>
                  <p className="text-sm text-amber-600">Pending response</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent Users</h3>
            <Link href="/admin/users" className="text-sm text-emerald-600 hover:text-emerald-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{user.name || 'No name'}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === 'PROVIDER' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'CLIENT' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent Bookings</h3>
            <Link href="/admin/bookings" className="text-sm text-emerald-600 hover:text-emerald-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentBookings.map((booking) => (
              <div key={booking.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{booking.service?.title || 'Custom job'}</p>
                    <p className="text-sm text-slate-500">{booking.client.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    booking.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(booking.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/admin/users" className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
            <span className="material-symbols-outlined text-3xl text-blue-600">group</span>
            <span className="text-sm font-medium text-slate-700">Manage Users</span>
          </Link>
          <Link href="/admin/verifications" className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
            <span className="material-symbols-outlined text-3xl text-amber-600">verified</span>
            <span className="text-sm font-medium text-slate-700">Verifications</span>
          </Link>
          <Link href="/admin/finance" className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
            <span className="material-symbols-outlined text-3xl text-emerald-600">account_balance</span>
            <span className="text-sm font-medium text-slate-700">Finance</span>
          </Link>
          <Link href="/admin/settings" className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
            <span className="material-symbols-outlined text-3xl text-slate-600">settings</span>
            <span className="text-sm font-medium text-slate-700">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
