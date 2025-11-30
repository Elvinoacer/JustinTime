import { getUsers } from "@/app/actions/admin";
import UsersFilters from "@/components/admin/UsersFilters";
import UsersTable from "@/components/admin/UsersTable";
import { prisma } from "@/lib/prisma";
import { Ban, Clock, Shield, Users } from "lucide-react";

export const dynamic = "force-dynamic";

async function getUserStats() {
  const [
    totalUsers,
    totalClients,
    totalProviders,
    bannedUsers,
    pendingVerifications,
    verifiedProviders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "PROVIDER" } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.profile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.profile.count({ where: { verificationStatus: "VERIFIED" } }),
  ]);

  return {
    totalUsers,
    totalClients,
    totalProviders,
    bannedUsers,
    pendingVerifications,
    verifiedProviders,
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    role?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const role = params.role || "";
  const status = params.status || "";

  const [{ users, total, totalPages, currentPage }, stats] = await Promise.all([
    getUsers(page, 10, search, role, status),
    getUserStats(),
  ]);

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "slate",
      gradient: "from-slate-500 to-slate-600",
    },
    {
      label: "Clients",
      value: stats.totalClients,
      icon: Users,
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      label: "Providers",
      value: stats.totalProviders,
      icon: Users,
      color: "purple",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      label: "Pending",
      value: stats.pendingVerifications,
      icon: Clock,
      color: "amber",
      gradient: "from-amber-500 to-amber-600",
    },
    {
      label: "Verified",
      value: stats.verifiedProviders,
      icon: Shield,
      color: "emerald",
      gradient: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Banned",
      value: stats.bannedUsers,
      icon: Ban,
      color: "red",
      gradient: "from-red-500 to-red-600",
    },
  ];

  const getColorClasses = (color: string) => {
    const classes = {
      slate: {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
        value: "text-slate-900",
      },
      blue: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200",
        value: "text-blue-900",
      },
      purple: {
        bg: "bg-purple-100",
        text: "text-purple-700",
        border: "border-purple-200",
        value: "text-purple-900",
      },
      amber: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        border: "border-amber-200",
        value: "text-amber-900",
      },
      emerald: {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        border: "border-emerald-200",
        value: "text-emerald-900",
      },
      red: {
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-200",
        value: "text-red-900",
      },
    };
    return classes[color as keyof typeof classes] || classes.slate;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            User Management
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Manage and moderate platform users
          </p>
        </div>
        {/* Add any action buttons here if needed */}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = getColorClasses(stat.color);

          return (
            <div
              key={stat.label}
              className={`bg-white p-3 sm:p-4 rounded-lg sm:rounded-xl border ${colorClasses.border} shadow-xs sm:shadow-sm transition-all hover:shadow-md group cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[10px] xs:text-xs font-medium uppercase tracking-wide ${colorClasses.text} truncate`}
                  >
                    {stat.label}
                  </p>
                  <p
                    className={`text-lg sm:text-2xl font-bold ${colorClasses.value} mt-1 sm:mt-2 leading-tight`}
                  >
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`p-1.5 sm:p-2 rounded-lg ${colorClasses.bg} group-hover:scale-110 transition-transform`}
                >
                  <Icon
                    className={`w-3 h-3 sm:w-4 sm:h-4 ${colorClasses.text}`}
                  />
                </div>
              </div>

              {/* Progress bar for visual interest */}
              <div className="mt-2 sm:mt-3 w-full bg-slate-100 rounded-full h-1">
                <div
                  className={`h-1 rounded-full bg-gradient-to-r ${stat.gradient} transition-all duration-500`}
                  style={{
                    width: `${Math.min(
                      (stat.value / Math.max(stats.totalUsers, 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Alternative Mobile Stats - Horizontal Scroll */}
      <div className="block sm:hidden">
        <div className="flex space-x-2 overflow-x-auto pb-2 -mx-2 px-2">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            const colorClasses = getColorClasses(stat.color);

            return (
              <div
                key={stat.label}
                className="flex-shrink-0 w-32 bg-white p-3 rounded-lg border border-slate-200 shadow-xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${colorClasses.bg}`}>
                    <Icon className={`w-3 h-3 ${colorClasses.text}`} />
                  </div>
                  <span
                    className={`text-[10px] font-medium uppercase ${colorClasses.text}`}
                  >
                    {stat.label}
                  </span>
                </div>
                <p className={`text-lg font-bold ${colorClasses.value}`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <UsersFilters
        currentRole={role}
        currentStatus={status}
        currentSearch={search}
      />

      {/* Users Table */}
      <UsersTable
        users={users}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      {/* Mobile Summary */}
      <div className="block sm:hidden bg-slate-50 rounded-lg p-3 border border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 font-medium">
            {total.toLocaleString()} users total
          </span>
          <span className="text-slate-500 text-xs">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      </div>
    </div>
  );
}
