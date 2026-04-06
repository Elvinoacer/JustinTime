"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Info,
  Search,
  X,
} from "lucide-react";

interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetId: string | null;
  details: any;
  createdAt: Date;
  admin: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface AuditLogTableProps {
  logs: AdminLog[];
  total: number;
  currentPage: number;
  totalPages: number;
  accessType:
    | "ALL"
    | "PAID"
    | "WAIVED"
    | "VERIFICATION"
    | "FINANCE"
    | "SUPPORT"
    | "USERS"
    | "SETTINGS";
  filters: {
    search?: string;
    action?: string;
    admin?: string;
    targetId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export default function AuditLogTable({
  logs,
  total,
  currentPage,
  totalPages,
  accessType,
  filters,
}: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailsPreview, setDetailsPreview] = useState<{
    id: string;
    payload: string;
  } | null>(null);
  const [copiedDetails, setCopiedDetails] = useState(false);

  const advancedFilterKeys = [
    "search",
    "action",
    "admin",
    "targetId",
    "dateFrom",
    "dateTo",
  ] as const;

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    if (accessType === "ALL") {
      params.delete("access");
    } else {
      params.set("access", accessType);
    }
    return `?${params.toString()}`;
  };

  const accessFilters: Array<{
    value: AuditLogTableProps["accessType"];
    label: string;
    activeClass: string;
  }> = [
    {
      value: "ALL",
      label: "All Actions",
      activeClass: "bg-slate-900 text-white border-slate-900",
    },
    {
      value: "PAID",
      label: "Paid Access",
      activeClass: "bg-emerald-600 text-white border-emerald-600",
    },
    {
      value: "WAIVED",
      label: "Waived Access",
      activeClass: "bg-amber-600 text-white border-amber-600",
    },
    {
      value: "VERIFICATION",
      label: "Verification",
      activeClass: "bg-blue-600 text-white border-blue-600",
    },
    {
      value: "FINANCE",
      label: "Finance",
      activeClass: "bg-violet-600 text-white border-violet-600",
    },
    {
      value: "SUPPORT",
      label: "Support",
      activeClass: "bg-cyan-600 text-white border-cyan-600",
    },
    {
      value: "USERS",
      label: "Users",
      activeClass: "bg-rose-600 text-white border-rose-600",
    },
    {
      value: "SETTINGS",
      label: "Settings",
      activeClass: "bg-lime-600 text-white border-lime-600",
    },
  ];

  const onAccessTypeChange = (nextAccess: AuditLogTableProps["accessType"]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (nextAccess === "ALL") {
      params.delete("access");
    } else {
      params.set("access", nextAccess);
    }
    router.push(`?${params.toString()}`);
  };

  const applyAdvancedFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams(searchParams.toString());

    advancedFilterKeys.forEach((key) => {
      const value = String(formData.get(key) || "").trim();
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    params.set("page", "1");
    if (accessType === "ALL") {
      params.delete("access");
    } else {
      params.set("access", accessType);
    }

    router.push(`?${params.toString()}`);
  };

  const clearAdvancedFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    advancedFilterKeys.forEach((key) => params.delete(key));
    params.set("page", "1");
    if (accessType === "ALL") {
      params.delete("access");
    } else {
      params.set("access", accessType);
    }
    router.push(`?${params.toString()}`);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes("BANNED"))
      return "bg-red-50 text-red-700 border-red-100";
    if (action.includes("REFUND"))
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (action.includes("VERIFIED"))
      return "bg-blue-50 text-blue-700 border-blue-100";
    if (action.includes("DELETED"))
      return "bg-red-50 text-red-700 border-red-100 text-bold";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  const formatDetailsPayload = (details: unknown) => {
    if (details === null || details === undefined) {
      return "{}";
    }

    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  };

  const openDetailsPreview = (log: AdminLog) => {
    setCopiedDetails(false);
    setDetailsPreview({
      id: log.id,
      payload: formatDetailsPayload(log.details),
    });
  };

  const copyDetails = async () => {
    if (!detailsPreview) return;

    try {
      await navigator.clipboard.writeText(detailsPreview.payload);
      setCopiedDetails(true);
      window.setTimeout(() => setCopiedDetails(false), 2000);
    } catch {
      setCopiedDetails(false);
    }
  };

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-xs sm:shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-2">
          {accessFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onAccessTypeChange(filter.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                accessType === filter.value
                  ? filter.activeClass
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={applyAdvancedFilters}
          className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2"
        >
          <label className="relative md:col-span-2 xl:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              name="search"
              defaultValue={filters.search || ""}
              placeholder="Search action/admin/target"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            />
          </label>
          <input
            name="action"
            defaultValue={filters.action || ""}
            placeholder="Action contains"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          />
          <input
            name="admin"
            defaultValue={filters.admin || ""}
            placeholder="Admin name/email/id"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          />
          <input
            name="targetId"
            defaultValue={filters.targetId || ""}
            placeholder="Target id"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          />
          <input
            type="date"
            name="dateFrom"
            defaultValue={filters.dateFrom || ""}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          />
          <input
            type="date"
            name="dateTo"
            defaultValue={filters.dateTo || ""}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-3 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={clearAdvancedFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden divide-y divide-slate-100">
        {logs.map((log) => (
          <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getActionColor(
                  log.action,
                )}`}
              >
                {log.action.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {formatDate(log.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                {log.admin.image ? (
                  <img
                    src={log.admin.image}
                    alt=""
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {log.admin.name || "System"}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {log.admin.email}
                </p>
              </div>
            </div>
            {log.targetId && (
              <p className="text-[10px] text-slate-500 mb-2 font-mono">
                Target: {log.targetId}
              </p>
            )}
            {log.details && (
              <button
                type="button"
                onClick={() => openDetailsPreview(log)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1"
              >
                <Info className="w-3 h-3" />
                View Details
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Admin</th>
              <th className="px-6 py-4">Target ID</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getActionColor(
                      log.action,
                    )}`}
                  >
                    {log.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-none">
                      {log.admin.image ? (
                        <img
                          src={log.admin.image}
                          alt=""
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-slate-900 truncate">
                        {log.admin.name || "System"}
                      </span>
                      <span className="text-slate-500 text-xs truncate">
                        {log.admin.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-mono text-slate-500">
                    {log.targetId || "—"}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-6 py-4">
                  {log.details ? (
                    <button
                      type="button"
                      onClick={() => openDetailsPreview(log)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1"
                    >
                      <Info className="w-3 h-3" />
                      View Details
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-900">{logs.length}</span>{" "}
              of <span className="font-medium text-slate-900">{total}</span>{" "}
              actions
            </p>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(buildPageUrl(1))}
                className="p-1.5 text-slate-400 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(buildPageUrl(currentPage - 1))}
                className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) pageNum = currentPage - 2 + i;
                    if (currentPage > totalPages - 2)
                      pageNum = totalPages - 4 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => router.push(buildPageUrl(pageNum))}
                      className={`w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm rounded-lg transition-all ${
                        currentPage === pageNum
                          ? "bg-slate-900 text-white font-semibold"
                          : "border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => router.push(buildPageUrl(currentPage + 1))}
                className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => router.push(buildPageUrl(totalPages))}
                className="p-1.5 text-slate-400 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {logs.length === 0 && (
        <div className="py-20 text-center">
          <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-slate-900 font-semibold mb-1">
            No actions found
          </h3>
          <p className="text-slate-500 text-sm">
            There are no administrative actions logged yet.
          </p>
        </div>
      )}

      {detailsPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Log Details
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {detailsPreview.id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyDetails}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border border-slate-200 text-slate-700 bg-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedDetails ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsPreview(null)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border border-slate-200 text-slate-700 bg-white"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-72px)] bg-slate-950">
              <pre className="text-xs text-emerald-300 whitespace-pre-wrap wrap-break-word font-mono">
                {detailsPreview.payload}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
