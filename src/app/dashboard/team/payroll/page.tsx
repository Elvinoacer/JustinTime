import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  cancelPayrollAction,
  generatePayrollAction,
  getMyTeam,
  getTeamPayrollPageData,
  processPayrollAction,
} from "@/app/actions/team";
import {
  ArrowLeft,
  DollarSign,
  Users,
  Calendar,
  Check,
  Clock,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface TeamPayrollPageProps {
  searchParams?: Promise<{
    teamId?: string;
    page?: string;
    notice?: string;
    error?: string;
  }>;
}

function getDefaultPeriod(payrollCycle?: string) {
  const end = new Date();
  const start = new Date(end);

  if (payrollCycle === "MONTHLY") {
    start.setMonth(start.getMonth() - 1);
  } else if (payrollCycle === "BIWEEKLY") {
    start.setDate(start.getDate() - 14);
  } else {
    start.setDate(start.getDate() - 7);
  }

  return { start, end };
}

export default async function TeamPayrollPage({
  searchParams,
}: TeamPayrollPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const params = (await searchParams) ?? {};
  const requestedTeamId =
    typeof params.teamId === "string" && params.teamId.trim().length > 0
      ? params.teamId
      : undefined;
  const currentPage =
    typeof params.page === "string" && Number(params.page) > 0
      ? Math.floor(Number(params.page))
      : 1;
  const notice = typeof params.notice === "string" ? params.notice : null;
  const error = typeof params.error === "string" ? params.error : null;

  const teamResult = await getMyTeam(requestedTeamId);
  if (!teamResult.success || !teamResult.team) {
    redirect("/dashboard/team");
  }

  const teamId = teamResult.activeTeamId || teamResult.team.id;
  const teamBasePath = `/dashboard/team/${teamId}`;

  const payrollResult = await getTeamPayrollPageData(teamId, currentPage, 20);
  if (!payrollResult.success) {
    return <div className="p-8 text-red-600">Failed to load payroll data</div>;
  }

  const pending = payrollResult.pending ?? {
    totalUnpaid: 0,
    unpaidCount: 0,
    byMember: [],
  };
  const payrolls = payrollResult.payrolls ?? [];
  const page = payrollResult.page ?? 1;
  const totalPages = payrollResult.totalPages ?? 1;
  const isOwner = payrollResult.isOwner ?? false;
  const role = payrollResult.role ?? "MEMBER";
  const canManage = isOwner || role === "ADMIN";
  const buildPayrollPath = (extras?: Record<string, string>) => {
    const query = new URLSearchParams({
      page: String(currentPage),
    });
    if (extras) {
      for (const [key, value] of Object.entries(extras)) {
        query.set(key, value);
      }
    }
    return `${teamBasePath}/payroll?${query.toString()}`;
  };

  const formatAmount = (
    amount: number | string | bigint | { toString(): string },
  ) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(
      Number(typeof amount === "object" ? amount.toString() : amount) || 0,
    );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "PROCESSING":
        return "bg-blue-100 text-blue-700";
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-700";
      case "FAILED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const { start: periodStart, end: periodEnd } = getDefaultPeriod(
    teamResult.team.payrollCycle,
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={teamBasePath}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Payroll Management
          </h1>
          <p className="text-gray-600">
            Generate, review, and process payroll batches
          </p>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-linear-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Unpaid Earnings</h2>
          <DollarSign className="h-8 w-8 opacity-80" />
        </div>
        <p className="text-4xl font-bold mb-2">
          {formatAmount(pending.totalUnpaid || 0)}
        </p>
        <p className="text-purple-200">
          {pending.unpaidCount || 0} earnings pending •{" "}
          {pending.byMember?.length || 0} members
        </p>
      </div>

      {pending.byMember && pending.byMember.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">
            Pending by Member
          </h3>
          <div className="space-y-3">
            {pending.byMember.map(
              (member: {
                memberId: string;
                memberImage?: string | null;
                memberName?: string;
                amount: number;
              }) => (
                <div
                  key={member.memberId}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                    {member.memberImage ? (
                      <Image
                        src={member.memberImage}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium">
                        {member.memberName?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {member.memberName}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-purple-600">
                    {formatAmount(member.amount)}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {canManage && (pending.totalUnpaid || 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">
            Generate Payroll Batch
          </h3>

          <form
            action={async (formData: FormData) => {
              "use server";
              const targetTeamId = formData.get("teamId") as string;
              const start = new Date(formData.get("periodStart") as string);
              const end = new Date(formData.get("periodEnd") as string);
              const result = await generatePayrollAction(
                targetTeamId,
                start,
                end,
              );
              redirect(
                buildPayrollPath(
                  result.success
                    ? { notice: "Payroll batch generated." }
                    : { error: result.error || "Failed to generate payroll." },
                ),
              );
            }}
          >
            <input type="hidden" name="teamId" value={teamId} />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Start
                </label>
                <input
                  type="date"
                  name="periodStart"
                  defaultValue={periodStart.toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period End
                </label>
                <input
                  type="date"
                  name="periodEnd"
                  defaultValue={periodEnd.toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Generate Pending Payroll ({formatAmount(pending.totalUnpaid || 0)}
              )
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-3 text-center">
            Payroll is generated as PENDING for review before processing.
          </p>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Payroll History</h3>

        <div className="space-y-3">
          {payrolls.map((payroll) => (
            <div
              key={payroll.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payroll.status)}`}
                  >
                    {payroll.status === "COMPLETED" && (
                      <Check className="h-4 w-4 inline mr-1" />
                    )}
                    {payroll.status === "PENDING" && (
                      <Clock className="h-4 w-4 inline mr-1" />
                    )}
                    {payroll.status}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(payroll.periodStart).toLocaleDateString(
                        "en-KE",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      )}
                      {" - "}
                      {new Date(payroll.periodEnd).toLocaleDateString("en-KE", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {payroll.memberCount} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {payroll._count.earnings} earnings
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {formatAmount(payroll.totalAmount)}
                  </p>
                  {payroll.processedAt && (
                    <p className="text-xs text-gray-500">
                      Paid{" "}
                      {new Date(payroll.processedAt).toLocaleDateString(
                        "en-KE",
                      )}
                    </p>
                  )}
                </div>
              </div>

              {canManage && payroll.status === "PENDING" && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <form
                    action={async () => {
                      "use server";
                      const result = await processPayrollAction(payroll.id);
                      redirect(
                        buildPayrollPath(
                          result.success
                            ? { notice: "Payroll processed successfully." }
                            : {
                                error:
                                  result.error || "Failed to process payroll.",
                              },
                        ),
                      );
                    }}
                  >
                    <button className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                      Process This Payroll
                    </button>
                  </form>

                  <form
                    action={async () => {
                      "use server";
                      const result = await cancelPayrollAction(payroll.id);
                      redirect(
                        buildPayrollPath(
                          result.success
                            ? { notice: "Payroll batch cancelled." }
                            : {
                                error:
                                  result.error || "Failed to cancel payroll.",
                              },
                        ),
                      );
                    }}
                  >
                    <button className="w-full py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium inline-flex items-center justify-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Cancel Pending Payroll
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}

          {payrolls.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No payroll history yet</p>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <Link
            href={buildPayrollPath({ page: String(Math.max(1, page - 1)) })}
            className={`px-4 py-2 rounded-lg border ${
              page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-gray-50"
            }`}
          >
            Previous
          </Link>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Link
            href={buildPayrollPath({
              page: String(Math.min(totalPages, page + 1)),
            })}
            className={`px-4 py-2 rounded-lg border ${
              page >= totalPages
                ? "pointer-events-none opacity-50"
                : "hover:bg-gray-50"
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
