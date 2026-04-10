import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  assignMembersToJob,
  createJob,
  getMyTeam,
  getTeamJobsPageData,
  markJobAsCollected,
  respondToAssignmentAction,
  unassignMemberFromJobAction,
  updateJobStatusAction,
} from "@/app/actions/team";
import {
  ArrowLeft,
  Plus,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Check,
  Play,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface TeamJobsPageProps {
  searchParams?: Promise<{
    teamId?: string;
    page?: string;
    notice?: string;
    error?: string;
  }>;
}

export default async function TeamJobsPage({
  searchParams,
}: TeamJobsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const params = (await searchParams) ?? {};
  const requestedTeamId =
    typeof params.teamId === "string" && params.teamId.trim().length > 0
      ? params.teamId
      : undefined;
  const notice = typeof params.notice === "string" ? params.notice : null;
  const error = typeof params.error === "string" ? params.error : null;
  const currentPage =
    typeof params.page === "string" && Number(params.page) > 0
      ? Math.floor(Number(params.page))
      : 1;

  const teamResult = await getMyTeam(requestedTeamId);
  if (!teamResult.success || !teamResult.team) {
    redirect("/dashboard/team");
  }

  const teamId = teamResult.activeTeamId || teamResult.team.id;
  const teamBasePath = `/dashboard/team/${teamId}`;

  const buildJobsPath = (extra?: Record<string, string>) => {
    const query = new URLSearchParams({ page: String(currentPage) });
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        query.set(key, value);
      }
    }

    const queryString = query.toString();
    return queryString.length > 0
      ? `${teamBasePath}/jobs?${queryString}`
      : `${teamBasePath}/jobs`;
  };

  const jobsResult = await getTeamJobsPageData(teamId, currentPage, 20);
  if (!jobsResult.success) {
    return <div className="p-8 text-red-600">Failed to load jobs</div>;
  }

  const jobs = jobsResult.jobs ?? [];
  const availableMembers = jobsResult.availableMembers ?? [];
  const nearestSuggestions = jobsResult.nearestSuggestions ?? {};
  const bookingOptions = jobsResult.bookingOptions ?? [];
  const page = jobsResult.page ?? currentPage;
  const totalPages = jobsResult.totalPages ?? 1;
  const isOwner = jobsResult.isOwner ?? false;
  const role = jobsResult.role ?? null;

  const canManage = isOwner || role === "ADMIN";

  const myPendingAssignments = jobs.flatMap((job) =>
    job.assignments
      .filter(
        (assignment) =>
          assignment.member.userId === session.user.id &&
          assignment.status === "PENDING",
      )
      .map((assignment) => ({
        assignmentId: assignment.id,
        role: assignment.role,
        jobTitle: job.title,
        scheduledAt: job.scheduledAt,
      })),
  );

  const formatAmount = (
    amount: number | string | Prisma.Decimal | null | undefined,
  ) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  const getLocationAddress = (location: unknown) => {
    if (!location || typeof location !== "object") {
      return null;
    }

    const address = (location as Record<string, unknown>).address;
    return typeof address === "string" && address.trim().length > 0
      ? address
      : null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-gray-100 text-gray-700";
      case "ASSIGNED":
        return "bg-blue-100 text-blue-700";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-700";
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getAssignmentStatusColor = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-100 text-green-700";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-700";
      case "DECLINED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const methodLabels: Record<string, string> = {
    CASH: "Collected via Cash",
    MPESA: "Collected via External M-Pesa",
    CARD: "Collected via External Card",
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={teamBasePath}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Dispatch</h1>
            <p className="text-gray-600">Create, assign, and track team jobs</p>
          </div>
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

      {canManage && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Plus className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Create New Job
            </h2>
          </div>

          <form
            action={async (formData: FormData) => {
              "use server";
              const result = await createJob({
                teamId: formData.get("teamId") as string,
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                location: { address: formData.get("address") as string },
                scheduledAt: new Date(formData.get("scheduledAt") as string),
                amount: parseFloat(formData.get("amount") as string),
                clientName: formData.get("clientName") as string,
                clientPhone: formData.get("clientPhone") as string,
                bookingId: (formData.get("bookingId") as string) || undefined,
              });

              if (result.success) {
                redirect(buildJobsPath({ notice: "Job created successfully." }));
              }

              redirect(
                buildJobsPath({
                  error: result.error || "Failed to create job.",
                }),
              );
            }}
          >
            <input type="hidden" name="teamId" value={teamId} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g., Kitchen Plumbing Repair"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KES) *
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="0"
                  placeholder="5000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Linked Booking
                </label>
                <select
                  name="bookingId"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">No linked booking</option>
                  {bookingOptions.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {new Date(booking.date).toLocaleDateString("en-KE")} -{" "}
                      {booking.clientName} - {formatAmount(booking.totalAmount)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  name="clientName"
                  placeholder="Client name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Phone
                </label>
                <input
                  type="tel"
                  name="clientPhone"
                  placeholder="0712345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location/Address
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="Westlands, Nairobi"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="Job details..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Create Job
            </button>
          </form>
        </div>
      )}

      {myPendingAssignments.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">
            My Pending Assignments
          </h2>
          <div className="space-y-3">
            {myPendingAssignments.map((assignment) => (
              <div
                key={assignment.assignmentId}
                className="rounded-lg border border-blue-200 bg-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{assignment.jobTitle}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(assignment.scheduledAt).toLocaleString("en-KE")} -{" "}
                    {assignment.role}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <form
                    action={async () => {
                      "use server";
                      const result = await respondToAssignmentAction(
                        assignment.assignmentId,
                        true,
                      );

                      if (result.success) {
                        redirect(buildJobsPath({ notice: "Assignment accepted." }));
                      }

                      redirect(
                        buildJobsPath({
                          error: result.error || "Failed to accept assignment.",
                        }),
                      );
                    }}
                  >
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                    >
                      Accept
                    </button>
                  </form>

                  <form
                    action={async () => {
                      "use server";
                      const result = await respondToAssignmentAction(
                        assignment.assignmentId,
                        false,
                      );

                      if (result.success) {
                        redirect(buildJobsPath({ notice: "Assignment declined." }));
                      }

                      redirect(
                        buildJobsPath({
                          error: result.error || "Failed to decline assignment.",
                        }),
                      );
                    }}
                  >
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">All Jobs</h2>

        {jobs.map((job) => {
          const suggestedOrder = nearestSuggestions[job.id] || [];
          const suggestedSet = new Set(suggestedOrder);
          const locationAddress = getLocationAddress(job.location);
          const sortedMembers = [...availableMembers].sort((a, b) => {
            const aScore = suggestedSet.has(a.id) ? 0 : 1;
            const bScore = suggestedSet.has(b.id) ? 0 : 1;
            if (aScore !== bScore) {
              return aScore - bScore;
            }
            return (a.user.name || "").localeCompare(b.user.name || "");
          });

          return (
            <div
              key={job.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}
                  >
                    {job.status}
                  </div>
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-600">
                    {formatAmount(job.amount)}
                  </p>
                  {job.collected && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {methodLabels[job.paymentMethod || "CASH"] || "Collected"}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  {new Date(job.scheduledAt).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                {job.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {locationAddress || "Location set"}
                  </div>
                )}

                {job.clientName && (
                  <div className="text-gray-600">
                    <span className="font-medium">Client:</span> {job.clientName}
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-4 w-4" />
                  {job.assignments.length} assigned
                </div>
              </div>

              {job.assignments.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {job.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1"
                      >
                        <div className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden">
                          {assignment.member.user.image ? (
                            <Image
                              src={assignment.member.user.image}
                              alt=""
                              width={24}
                              height={24}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                              {assignment.member.user.name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-700">
                          {assignment.member.user.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({assignment.role})
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getAssignmentStatusColor(assignment.status)}`}
                        >
                          {assignment.status}
                        </span>

                        {canManage &&
                          !["IN_PROGRESS", "COMPLETED"].includes(
                            assignment.status,
                          ) && (
                            <form
                              action={async () => {
                                "use server";
                                const result = await unassignMemberFromJobAction(
                                  job.id,
                                  assignment.memberId,
                                );

                                if (result.success) {
                                  redirect(
                                    buildJobsPath({ notice: "Member unassigned." }),
                                  );
                                }

                                redirect(
                                  buildJobsPath({
                                    error:
                                      result.error || "Failed to unassign member.",
                                  }),
                                );
                              }}
                            >
                              <button
                                type="submit"
                                className="text-xs rounded-full border border-red-200 px-2 py-0.5 text-red-600 hover:bg-red-50"
                                title="Unassign"
                              >
                                Remove
                              </button>
                            </form>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canManage && (
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {job.status === "PENDING" && (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const memberIds = formData
                          .getAll("memberIds")
                          .filter(
                            (value): value is string =>
                              typeof value === "string" && value.length > 0,
                          );

                        if (memberIds.length === 0) {
                          redirect(
                            buildJobsPath({
                              error:
                                "Select at least one member before assigning.",
                            }),
                          );
                        }

                        const result = await assignMembersToJob(
                          formData.get("jobId") as string,
                          memberIds,
                        );

                        if (result.success) {
                          redirect(
                            buildJobsPath({
                              notice:
                                memberIds.length > 1
                                  ? "Members assigned."
                                  : "Member assigned.",
                            }),
                          );
                        }

                        redirect(
                          buildJobsPath({
                            error: result.error || "Failed to assign members.",
                          }),
                        );
                      }}
                      className="flex-1"
                    >
                      <input type="hidden" name="jobId" value={job.id} />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          name="memberIds"
                          multiple
                          size={Math.min(Math.max(sortedMembers.length, 3), 8)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          {sortedMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.user.name}
                              {suggestedSet.has(member.id) ? " (near)" : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Assign Selected
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        Tip: hold Ctrl/Cmd to select multiple members before
                        assigning.
                      </p>
                    </form>
                  )}

                  {job.status === "ASSIGNED" && (
                    <form
                      action={async () => {
                        "use server";
                        const result = await updateJobStatusAction(
                          job.id,
                          "IN_PROGRESS",
                        );

                        if (result.success) {
                          redirect(
                            buildJobsPath({ notice: "Job started successfully." }),
                          );
                        }

                        redirect(
                          buildJobsPath({
                            error: result.error || "Failed to start job.",
                          }),
                        );
                      }}
                    >
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium">
                        <Play className="h-4 w-4" /> Start Job
                      </button>
                    </form>
                  )}

                  {(job.status === "ASSIGNED" ||
                    job.status === "IN_PROGRESS") && (
                    <form
                      action={async () => {
                        "use server";
                        const result = await updateJobStatusAction(
                          job.id,
                          "CANCELLED",
                        );

                        if (result.success) {
                          redirect(buildJobsPath({ notice: "Job cancelled." }));
                        }

                        redirect(
                          buildJobsPath({
                            error: result.error || "Failed to cancel job.",
                          }),
                        );
                      }}
                    >
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                        <XCircle className="h-4 w-4" /> Cancel
                      </button>
                    </form>
                  )}

                  {job.status === "IN_PROGRESS" && (
                    <form
                      action={async () => {
                        "use server";
                        const result = await updateJobStatusAction(
                          job.id,
                          "COMPLETED",
                        );

                        if (result.success) {
                          redirect(
                            buildJobsPath({ notice: "Job marked as completed." }),
                          );
                        }

                        redirect(
                          buildJobsPath({
                            error: result.error || "Failed to complete job.",
                          }),
                        );
                      }}
                    >
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                        <Check className="h-4 w-4" /> Complete
                      </button>
                    </form>
                  )}

                  {job.status === "COMPLETED" && !job.collected && (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const result = await markJobAsCollected(
                          formData.get("jobId") as string,
                          formData.get("method") as "CASH" | "MPESA" | "CARD",
                        );

                        if (result.success) {
                          redirect(
                            buildJobsPath({ notice: "Collection recorded." }),
                          );
                        }

                        redirect(
                          buildJobsPath({
                            error: result.error || "Failed to mark collection.",
                          }),
                        );
                      }}
                      className="flex gap-2"
                    >
                      <input type="hidden" name="jobId" value={job.id} />
                      <select
                        name="method"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="CASH">Collected via Cash</option>
                        <option value="MPESA">
                          Collected via External M-Pesa
                        </option>
                        <option value="CARD">Collected via External Card</option>
                      </select>
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                        <DollarSign className="h-4 w-4" /> Mark Collected
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {jobs.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No jobs yet. Create one above.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <Link
            href={buildJobsPath({ page: String(Math.max(1, page - 1)) })}
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
            href={buildJobsPath({ page: String(Math.min(totalPages, page + 1)) })}
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
