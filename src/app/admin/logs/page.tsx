import { getAdminLogs } from "@/app/actions/admin";
import AuditLogTable from "@/components/admin/AuditLogTable";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
  access?: string;
  search?: string;
  action?: string;
  admin?: string;
  targetId?: string;
  dateFrom?: string;
  dateTo?: string;
}

type AdminAccessType =
  | "ALL"
  | "PAID"
  | "WAIVED"
  | "VERIFICATION"
  | "FINANCE"
  | "SUPPORT"
  | "USERS"
  | "SETTINGS";

const ADMIN_ACCESS_TYPES: AdminAccessType[] = [
  "ALL",
  "PAID",
  "WAIVED",
  "VERIFICATION",
  "FINANCE",
  "SUPPORT",
  "USERS",
  "SETTINGS",
];

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const accessType: AdminAccessType = ADMIN_ACCESS_TYPES.includes(
    (params.access || "").toUpperCase() as AdminAccessType,
  )
    ? ((params.access || "ALL").toUpperCase() as AdminAccessType)
    : "ALL";
  const filters = {
    search: params.search || "",
    action: params.action || "",
    admin: params.admin || "",
    targetId: params.targetId || "",
    dateFrom: params.dateFrom || "",
    dateTo: params.dateTo || "",
  };
  const data = await getAdminLogs(page, 20, accessType, filters);

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
        filters={filters}
      />
    </div>
  );
}
