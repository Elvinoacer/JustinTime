import {
  getBackgroundChecks,
  getIdentityVerificationRequestsForAdmin,
} from "@/app/actions/admin";
import { getExpiringChecks } from "@/app/actions/verification";
import { prisma } from "@/lib/prisma";
import VerificationsGrid from "@/components/admin/VerificationsGrid";
import BackgroundChecksList from "@/components/admin/BackgroundChecksList";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Filter,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getVerificationStats() {
  const [statusCounts, totalProviders] = await Promise.all([
    prisma.identityVerificationRequest.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.user.count({
      where: {
        OR: [{ role: "PROVIDER" }, { roles: { has: "PROVIDER" } }],
      },
    }),
  ]);

  let pending = 0;
  let verified = 0;
  let rejected = 0;

  statusCounts.forEach((entry) => {
    if (entry.status === "SUBMITTED" || entry.status === "UNDER_REVIEW") {
      pending += entry._count;
    }

    if (entry.status === "VERIFIED") {
      verified += entry._count;
    }

    if (entry.status === "REJECTED") {
      rejected += entry._count;
    }
  });

  return { pending, verified, rejected, totalProviders };
}

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const search = params.search || "";
  const requestedStatus = [
    "PENDING",
    "VERIFIED",
    "REJECTED",
    "EXPIRING",
  ].includes(params.status || "")
    ? (params.status as "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRING")
    : "PENDING";
  const view = params.view === "BACKGROUND" ? "BACKGROUND" : "IDENTITY";
  const status =
    view === "IDENTITY" && requestedStatus === "EXPIRING"
      ? "PENDING"
      : requestedStatus;
  const identityStatus =
    status === "PENDING" || status === "VERIFIED" || status === "REJECTED"
      ? status
      : "PENDING";

  const mappedBackgroundStatus =
    status === "PENDING"
      ? "PENDING"
      : status === "VERIFIED"
        ? "APPROVED"
        : status === "REJECTED"
          ? "REJECTED"
          : undefined;

  const [identityRequests, stats, backgroundChecks, expiringCount] =
    await Promise.all([
      view === "IDENTITY"
        ? getIdentityVerificationRequestsForAdmin(
            page,
            12,
            search,
            identityStatus,
          )
        : Promise.resolve({
            requests: [],
            total: 0,
            totalPages: 1,
            currentPage: 1,
          }),
      getVerificationStats(),
      view === "BACKGROUND"
        ? status === "EXPIRING"
          ? getExpiringChecks()
          : getBackgroundChecks(mappedBackgroundStatus)
        : Promise.resolve([]),
      prisma.backgroundCheck.count({
        where: {
          status: "APPROVED",
          expiresAt: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            not: null,
          },
        },
      }),
    ]);

  const buildFilterHref = (
    nextStatus: "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRING",
  ) => {
    const query = new URLSearchParams();
    const nextView = nextStatus === "EXPIRING" ? "BACKGROUND" : view;
    query.set("view", nextView);
    query.set("status", nextStatus);
    if (search) {
      query.set("search", search);
    }
    return `/admin/verifications?${query.toString()}`;
  };

  const identityViewHref = (() => {
    const query = new URLSearchParams();
    query.set("view", "IDENTITY");
    query.set("status", status === "EXPIRING" ? "PENDING" : status);
    if (search) {
      query.set("search", search);
    }
    return `/admin/verifications?${query.toString()}`;
  })();

  const backgroundViewHref = (() => {
    const query = new URLSearchParams();
    query.set("view", "BACKGROUND");
    query.set("status", status);
    if (search) {
      query.set("search", search);
    }
    return `/admin/verifications?${query.toString()}`;
  })();

  const activeTotal =
    view === "IDENTITY" ? identityRequests.total : backgroundChecks.length;

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
    {
      status: "EXPIRING",
      label: "Expiring Soon",
      count: expiringCount,
      color: "orange",
      activeBg: "bg-orange-600",
      inactiveBg: "bg-orange-50",
      activeText: "text-white",
      inactiveText: "text-orange-700",
      hoverBg: "hover:bg-orange-100",
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
              className={`bg-[linear-gradient(to_bottom_right,var(--tw-gradient-stops))] ${stat.gradient} p-4 sm:p-5 rounded-xl sm:rounded-2xl border ${stat.border} shadow-xs sm:shadow-sm transition-all hover:shadow-md`}
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
                  className={`w-8 h-8 sm:w-10 sm:h-10 ${stat.iconColor} flex-none`}
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
                className="flex-none w-36 bg-white p-3 rounded-lg border border-slate-200 shadow-xs"
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
                  href={buildFilterHref(
                    filter.status as
                      | "PENDING"
                      | "VERIFIED"
                      | "REJECTED"
                      | "EXPIRING",
                  )}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    (
                      filter.status === "EXPIRING"
                        ? status === "EXPIRING" && view === "BACKGROUND"
                        : status === filter.status
                    )
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
            Showing {activeTotal} {view === "IDENTITY" ? "request" : "check"}
            {activeTotal !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Toggle View */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <a
            href={identityViewHref}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${view === "IDENTITY" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            <UserCheck className="w-4 h-4" />
            Identity
          </a>
          <a
            href={backgroundViewHref}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${view === "BACKGROUND" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            <ShieldCheck className="w-4 h-4" />
            Background Checks
          </a>
        </div>
      </div>

      {view === "IDENTITY" ? (
        <>
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {identityRequests.total} identity verification requests
            </p>
          </div>
          <VerificationsGrid
            requests={identityRequests.requests}
            total={identityRequests.total}
            currentPage={identityRequests.currentPage}
            totalPages={identityRequests.totalPages}
            currentStatus={identityStatus}
          />
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {backgroundChecks.length} background check requests
            </p>
          </div>
          <BackgroundChecksList checks={backgroundChecks} />
        </>
      )}

      {/* Mobile Summary Footer */}
      <div className="block sm:hidden bg-slate-50 rounded-lg p-3 border border-slate-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">
            {stats.totalProviders.toLocaleString()} providers total
          </span>
          <span className="text-slate-500">{stats.pending} pending review</span>
        </div>
      </div>
    </div>
  );
}
