import { getAdminLogs } from "@/app/actions/admin";
import AuditLogTable from "@/components/admin/AuditLogTable";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
  access?: string;
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const accessType: "ALL" | "PAID" | "WAIVED" =
    params.access === "PAID" || params.access === "WAIVED"
      ? params.access
      : "ALL";
  const data = await getAdminLogs(page, 20, accessType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-xl">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
            <p className="text-slate-500 text-sm">
              Track all administrative actions and security events
            </p>
          </div>
        </div>
      </div>

      <AuditLogTable
        logs={data.logs as any}
        total={data.total}
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        accessType={data.accessType}
      />
    </div>
  );
}
