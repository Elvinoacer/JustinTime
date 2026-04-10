import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  createAnnouncement,
  createTeam,
  dismissTeamAnnouncementAction,
  getMyTeam,
  getMyTeamInvitationsAction,
  getTeamDashboard,
  leaveTeamAction,
  respondToTeamInvitationAction,
  updateMemberStatus,
} from "@/app/actions/team";
import { MemberCard } from "@/components/team/MemberCard";
import { EarningsOverview } from "@/components/team/EarningsOverview";
import { LocationHeartbeat } from "@/components/team/LocationHeartbeat";
import {
  Users,
  Briefcase,
  MapPin,
  DollarSign,
  Plus,
  Settings,
  Bell,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface TeamDashboardPageProps {
  searchParams?: Promise<{
    teamId?: string;
    inviteNotice?: string;
    inviteError?: string;
    notice?: string;
    error?: string;
  }>;
}

export default async function TeamDashboardPage({
  searchParams,
}: TeamDashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const params = (await searchParams) ?? {};
  const requestedTeamId =
    typeof params.teamId === "string" && params.teamId.trim().length > 0
      ? params.teamId
      : undefined;
  const inviteNotice =
    typeof params.inviteNotice === "string" ? params.inviteNotice : null;
  const inviteError =
    typeof params.inviteError === "string" ? params.inviteError : null;
  const notice = typeof params.notice === "string" ? params.notice : null;
  const error = typeof params.error === "string" ? params.error : null;

  const teamResult = await getMyTeam(requestedTeamId);

  if (!teamResult.success || !teamResult.team) {
    const invitationResult = await getMyTeamInvitationsAction(10);
    const invitations = invitationResult.success
      ? invitationResult.invitations
      : [];

    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-12">
        <div className="text-center">
          <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Create Your Team
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Lead a crew? Create your team to track jobs, manage workers, and
            handle payroll all in one place.
          </p>

          {inviteNotice && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {inviteNotice}
            </div>
          )}

          {inviteError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {inviteError}
            </div>
          )}

          {invitations.length > 0 && (
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
              <h2 className="mb-3 text-base font-semibold text-amber-900">
                Pending Team Invitations
              </h2>
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="rounded-lg border border-amber-200 bg-white p-3"
                  >
                    <p className="font-medium text-gray-900">
                      {invitation.team.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Invited by{" "}
                      {invitation.invitedBy.name || invitation.invitedBy.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Expires{" "}
                      {new Date(invitation.expiresAt).toLocaleString("en-KE")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form
                        action={async () => {
                          "use server";
                          const result = await respondToTeamInvitationAction(
                            invitation.id,
                            true,
                          );

                          const query = new URLSearchParams();
                          if (result.success) {
                            query.set("inviteNotice", "Invitation accepted.");
                          } else {
                            query.set(
                              "inviteError",
                              result.error || "Failed to accept invitation.",
                            );
                          }
                          redirect(`/dashboard/team?${query.toString()}`);
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
                          const result = await respondToTeamInvitationAction(
                            invitation.id,
                            false,
                          );

                          const query = new URLSearchParams();
                          if (result.success) {
                            query.set("inviteNotice", "Invitation declined.");
                          } else {
                            query.set(
                              "inviteError",
                              result.error || "Failed to decline invitation.",
                            );
                          }
                          redirect(`/dashboard/team?${query.toString()}`);
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

          <form
            action={async (formData: FormData) => {
              "use server";
              const result = await createTeam(
                formData.get("name") as string,
                formData.get("description") as string,
              );

              if (result.success) {
                redirect("/dashboard/team");
              }

              const query = new URLSearchParams({
                inviteError: result.error || "Failed to create team.",
              });
              redirect(`/dashboard/team?${query.toString()}`);
            }}
          >
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-left space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g., Nairobi Plumbers"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="What does your team specialize in?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
              >
                Create Team
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const { team, isOwner, role, teams, activeTeamId } = teamResult;
  const teamId = activeTeamId || team.id;
  const teamBasePath = `/dashboard/team/${teamId}`;
  const isManager = isOwner || role === "ADMIN";

  const buildTeamPath = (extra?: Record<string, string>) => {
    const query = new URLSearchParams(extra || {});
    const queryString = query.toString();
    return queryString.length > 0
      ? `${teamBasePath}?${queryString}`
      : teamBasePath;
  };

  const dashboardResult = await getTeamDashboard(teamId);
  if (!dashboardResult.success) {
    return <div className="p-8 text-red-600">Failed to load dashboard</div>;
  }

  const stats = dashboardResult.stats ?? {
    totalMembers: 0,
    onlineMembers: 0,
    busyMembers: 0,
    todaysJobCount: 0,
    todaysCollection: 0,
  };

  const members = dashboardResult.members ?? [];
  const collections = dashboardResult.collections ?? {
    totalCollected: 0,
    jobCount: 0,
    byMethod: {},
    byCollector: {},
    collectorNames: {},
  };

  const pendingPayroll = dashboardResult.pendingPayroll ?? {
    totalUnpaid: 0,
  };

  const announcements = dashboardResult.announcements ?? [];

  const myMember = members.find((member) => member.userId === session.user.id);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount);

  const announcementPriorityClass: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-700",
    NORMAL: "bg-blue-100 text-blue-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{team.name}</h1>
          <p className="text-gray-600">
            {isOwner ? "Team Owner" : `Role: ${role}`} - {stats.totalMembers}{" "}
            members
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {teams && teams.length > 1 && (
            <form
              method="get"
              action="/dashboard/team"
              className="flex items-center gap-2"
            >
              <select
                name="teamId"
                defaultValue={teamId}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {teams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Switch
              </button>
            </form>
          )}

          {myMember && (
            <form
              action={async (formData: FormData) => {
                "use server";
                const status = formData.get("status") as
                  | "ONLINE"
                  | "BUSY"
                  | "OFFLINE";
                await updateMemberStatus(status, teamId);
              }}
              className="flex items-center gap-2"
            >
              <select
                name="status"
                defaultValue={myMember.status}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="ONLINE">Online</option>
                <option value="BUSY">Busy</option>
                <option value="OFFLINE">Offline</option>
              </select>
              <button
                type="submit"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Update
              </button>
            </form>
          )}

          {myMember && <LocationHeartbeat teamId={teamId} />}

          {isManager && (
            <>
              <Link
                href={`${teamBasePath}/members`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </Link>
              <Link
                href={`${teamBasePath}/settings`}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </Link>
            </>
          )}

          {!isOwner && (
            <form
              action={async () => {
                "use server";
                const result = await leaveTeamAction(teamId);
                if (result.success) {
                  redirect(
                    "/dashboard/team?notice=" +
                      encodeURIComponent("You left the team successfully."),
                  );
                }

                redirect(
                  buildTeamPath({
                    error: result.error || "Failed to leave team.",
                  }),
                );
              }}
            >
              <button
                type="submit"
                className="px-3 py-2 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50"
              >
                Leave Team
              </button>
            </form>
          )}
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats.totalMembers}</span>
          </div>
          <p className="text-blue-100 text-sm font-medium">Total Members</p>
          <div className="mt-2 text-xs text-blue-200">
            {stats.onlineMembers} online - {stats.busyMembers} busy
          </div>
        </div>

        <div className="bg-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Briefcase className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats.todaysJobCount}</span>
          </div>
          <p className="text-purple-100 text-sm font-medium">
            Today&apos;s Jobs
          </p>
        </div>

        <div className="bg-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8" />
            <span className="text-xl font-bold">
              {formatAmount(stats.todaysCollection)}
            </span>
          </div>
          <p className="text-emerald-100 text-sm font-medium">
            Today&apos;s Collections
          </p>
        </div>

        <div className="bg-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="h-8 w-8" />
            <span className="text-xl font-bold">
              {formatAmount(pendingPayroll.totalUnpaid || 0)}
            </span>
          </div>
          <p className="text-orange-100 text-sm font-medium">Pending Payroll</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Team Members
            </h2>
            <Link
              href={`${teamBasePath}/jobs`}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Dispatch Job -&gt;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>

          {members.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl mt-4">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No team members yet</p>
              <Link
                href={`${teamBasePath}/members`}
                className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
              >
                Invite Members
              </Link>
            </div>
          )}

          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">
                Team Announcements
              </h3>
            </div>

            {isManager && (
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const result = await createAnnouncement(
                    teamId,
                    (formData.get("title") as string) || "Announcement",
                    (formData.get("content") as string) || "",
                    (formData.get("priority") as
                      | "LOW"
                      | "NORMAL"
                      | "HIGH"
                      | "URGENT") || "NORMAL",
                  );

                  if (!result.success) {
                    redirect(
                      buildTeamPath({
                        error: result.error || "Failed to post announcement.",
                      }),
                    );
                  }

                  redirect(buildTeamPath({ notice: "Announcement posted." }));
                }}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"
              >
                <input
                  type="text"
                  name="title"
                  placeholder="Announcement title"
                  required
                  className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  name="priority"
                  defaultValue="NORMAL"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Post
                </button>
                <textarea
                  name="content"
                  rows={2}
                  placeholder="Write announcement..."
                  required
                  className="md:col-span-4 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </form>
            )}

            <div className="space-y-3">
              {announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="border border-gray-100 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {announcement.title}
                      </h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${announcementPriorityClass[announcement.priority] || "bg-gray-100 text-gray-700"}`}
                      >
                        {announcement.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(announcement.createdAt).toLocaleString("en-KE")}
                    </p>

                    {isManager && (
                      <form
                        action={async () => {
                          "use server";
                          const result = await dismissTeamAnnouncementAction(
                            announcement.id,
                          );

                          if (!result.success) {
                            redirect(
                              buildTeamPath({
                                error:
                                  result.error ||
                                  "Failed to dismiss announcement.",
                              }),
                            );
                          }

                          redirect(
                            buildTeamPath({
                              notice: "Announcement dismissed.",
                            }),
                          );
                        }}
                        className="mt-2"
                      >
                        <button
                          type="submit"
                          className="text-xs rounded-md border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50"
                        >
                          Dismiss
                        </button>
                      </form>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No announcements yet.</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Collections
          </h2>
          <EarningsOverview
            totalCollected={collections.totalCollected || 0}
            jobCount={collections.jobCount || 0}
            byMethod={collections.byMethod || {}}
            byCollector={collections.byCollector || {}}
            members={collections.collectorNames || {}}
          />

          <div className="mt-6 space-y-3">
            <Link
              href={`${teamBasePath}/payroll`}
              className="block w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-center"
            >
              Process Payroll
            </Link>
            <Link
              href={`${teamBasePath}/jobs`}
              className="block w-full py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
            >
              View All Jobs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
