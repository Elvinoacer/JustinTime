"use client";

import { useRouter } from "next/navigation";
import {
  History,
  User,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
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
}

export default function AuditLogTable({
  logs,
  total,
  currentPage,
  totalPages,
}: AuditLogTableProps) {
  const router = useRouter();

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
    if (action.includes("BANNED")) return "bg-red-50 text-red-700 border-red-100";
    if (action.includes("REFUND")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (action.includes("VERIFIED")) return "bg-blue-50 text-blue-700 border-blue-100";
    if (action.includes("DELETED")) return "bg-red-50 text-red-700 border-red-100 text-bold";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-xs sm:shadow-sm border border-slate-100 overflow-hidden">
      {/* Mobile Card View */}
      <div className="block lg:hidden divide-y divide-slate-100">
        {logs.map((log) => (
          <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getActionColor(
                  log.action
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
                  <img src={log.admin.image} alt="" className="w-full h-full rounded-full" />
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {log.admin.name || "System"}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{log.admin.email}</p>
              </div>
            </div>
            {log.targetId && (
              <p className="text-[10px] text-slate-500 mb-2 font-mono">
                Target: {log.targetId}
              </p>
            )}
            {log.details && (
              <div className="bg-slate-900 rounded p-2 overflow-x-auto">
                <pre className="text-[10px] text-emerald-400 font-mono">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
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
                      log.action
                    )}`}
                  >
                    {log.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                       {log.admin.image ? (
                         <img src={log.admin.image} alt="" className="w-full h-full rounded-full" />
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
                  <span className="text-xs font-mono text-slate-500">{log.targetId || "—"}</span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-6 py-4">
                  {log.details ? (
                    <button
                      onClick={() => console.log(log.details)}
                      className="group relative"
                      title={JSON.stringify(log.details, null, 2)}
                    >
                      <Info className="w-4 h-4 text-slate-400 hover:text-blue-500 transition-colors" />
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs font-mono whitespace-pre z-50">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
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
              Showing <span className="font-medium text-slate-900">{logs.length}</span> of{" "}
              <span className="font-medium text-slate-900">{total}</span> actions
            </p>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(`?page=1`)}
                className="p-1.5 text-slate-400 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage <= 1}
                onClick={() => router.push(`?page=${currentPage - 1}`)}
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
                    if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => router.push(`?page=${pageNum}`)}
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
                onClick={() => router.push(`?page=${currentPage + 1}`)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => router.push(`?page=${totalPages}`)}
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
          <h3 className="text-slate-900 font-semibold mb-1">No actions found</h3>
          <p className="text-slate-500 text-sm">There are no administrative actions logged yet.</p>
        </div>
      )}
    </div>
  );
}
