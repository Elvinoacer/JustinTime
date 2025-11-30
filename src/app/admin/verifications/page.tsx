import { getUsers } from "@/app/actions/admin";
import { prisma } from "@/lib/prisma";
import VerificationsGrid from "@/components/admin/VerificationsGrid";
import { Clock, CheckCircle2, XCircle, Users, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

async function getVerificationStats() {
  const [pending, verified, rejected, totalProviders] = await Promise.all([
    prisma.profile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.profile.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.profile.count({ where: { verificationStatus: "REJECTED" } }),
    prisma.user.count({ where: { role: "PROVIDER" } }),
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
  const search = params.search || "";
  const status = params.status || "PENDING";

  const [{ users, total, totalPages, currentPage }, stats] = await Promise.all([
    getUsers(page, 12, search, "PROVIDER", status),
    getVerificationStats(),
  ]);

  const statCards = [
    {
      label: "Pending Review",
      value: stats.pending,
      color: "amber",
      icon: Clock,
      gradient: "from-amber-50 to-amber-100",
      border: "border-amber-200",
      text: "text-amber-700",
      valueColor: "text-amber-900",
      iconColor: "text-amber-300",
    },
    {
      label: "Verified",
      value: stats.verified,
      color: "emerald",
      icon: CheckCircle2,
      gradient: "from-emerald-50 to-emerald-100",
      border: "border-emerald-200",
      text: "text-emerald-700",
      valueColor: "text-emerald-900",
      iconColor: "text-emerald-300",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      color: "red",
      icon: XCircle,
      gradient: "from-red-50 to-red-100",
      border: "border-red-200",
      text: "text-red-700",
      valueColor: "text-red-900",
      iconColor: "text-red-300",
    },
    {
      label: "Total Providers",
      value: stats.totalProviders,
      color: "purple",
      icon: Users,
      gradient: "from-purple-50 to-purple-100",
      border: "border-purple-200",
      text: "text-purple-700",
      valueColor: "text-purple-900",
      iconColor: "text-purple-300",
    },
  ];

  const filterButtons = [
    {
      status: "PENDING",
      label: "Pending",
      count: stats.pending,
      color: "amber",
      activeBg: "bg-amber-600",
      inactiveBg: "bg-amber-50",
      activeText: "text-white",
      inactiveText: "text-amber-700",
      hoverBg: "hover:bg-amber-100",
    },
    {
      status: "VERIFIED",
      label: "Verified",
      count: stats.verified,
      color: "emerald",
      activeBg: "bg-emerald-600",
      inactiveBg: "bg-emerald-50",
      activeText: "text-white",
      inactiveText: "text-emerald-700",
      hoverBg: "hover:bg-emerald-100",
    },
    {
      status: "REJECTED",
      label: "Rejected",
      count: stats.rejected,
      color: "red",
      activeBg: "bg-red-600",
      inactiveBg: "bg-red-50",
      activeText: "text-white",
      inactiveText: "text-red-700",
      hoverBg: "hover:bg-red-100",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Provider Verifications
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Review and manage provider verification requests
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`bg-gradient-to-br ${stat.gradient} p-4 sm:p-5 rounded-xl sm:rounded-2xl border ${stat.border} shadow-xs sm:shadow-sm transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p
                    className={`${stat.text} text-xs font-medium uppercase tracking-wide truncate`}
                  >
                    {stat.label}
                  </p>
                  <p
                    className={`text-2xl sm:text-3xl font-bold ${stat.valueColor} mt-1`}
                  >
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <Icon
                  className={`w-8 h-8 sm:w-10 sm:h-10 ${stat.iconColor} flex-shrink-0`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Alternative Mobile Stats - Horizontal Scroll */}
      <div className="block sm:hidden">
        <div className="flex space-x-3 overflow-x-auto pb-2 -mx-1 px-1">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex-shrink-0 w-36 bg-white p-3 rounded-lg border border-slate-200 shadow-xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                  <span
                    className={`text-xs font-medium uppercase ${stat.text} truncate`}
                  >
                    {stat.label}
                  </span>
                </div>
                <p className={`text-xl font-bold ${stat.valueColor}`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs sm:shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          {/* Filter Buttons */}
          <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                Filter:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterButtons.map((filter) => (
                <a
                  key={filter.status}
                  href={`/admin/verifications?status=${filter.status}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    status === filter.status
                      ? `${filter.activeBg} ${filter.activeText} shadow-md ring-2 ring-opacity-20 ring-offset-1`
                      : `${filter.inactiveBg} ${filter.inactiveText} ${filter.hoverBg}`
                  }`}
                >
                  {filter.label} ({filter.count})
                </a>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <p className="text-xs sm:text-sm text-slate-600 whitespace-nowrap">
            Showing {total} provider{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Mobile Filter Summary */}
        <div className="block sm:hidden mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Current:{" "}
              <span className="font-semibold capitalize">
                {status.toLowerCase()}
              </span>
            </span>
            <span className="text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>
      </div>

      {/* Providers Grid */}
      <VerificationsGrid
        users={users}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        currentStatus={status}
      />

      {/* Mobile Summary Footer */}
      <div className="block sm:hidden bg-slate-50 rounded-lg p-3 border border-slate-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">
            {total.toLocaleString()} providers total
          </span>
          <span className="text-slate-500">{stats.pending} pending review</span>
        </div>
      </div>
    </div>
  );
}
