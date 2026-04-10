import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getMyTeam,
  getTeamMembersPageData,
  inviteTeamMember,
  removeTeamMember,
  revokeTeamInvitationAction,
  updateMemberPermissions,
  updateMemberRole,
} from "@/app/actions/team";
import { Users, ArrowLeft, UserPlus, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { TeamPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface TeamMembersPageProps {
  searchParams?: Promise<{
    teamId?: string;
    notice?: string;
    error?: string;
  }>;
}

export default async function TeamMembersPage({
  searchParams,
}: TeamMembersPageProps) {
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

  const teamResult = await getMyTeam(requestedTeamId);
  if (!teamResult.success || !teamResult.team) {
    redirect("/dashboard/team");
  }

  const teamId = teamResult.activeTeamId || teamResult.team.id;
  const teamBasePath = `/dashboard/team/${teamId}`;

  const membersResult = await getTeamMembersPageData(teamId);
  if (!membersResult.success) {
    return <div className="p-8 text-red-600">Failed to load members</div>;
  }

  const team = membersResult.team;
  const members = membersResult.members ?? [];
  const pendingInvitations = membersResult.pendingInvitations ?? [];
  const payoutStatsByMember = membersResult.payoutStatsByMember ?? {};
  const isOwner = membersResult.isOwner ?? false;
  const role = membersResult.role ?? null;

  if (!team) {
    return <div className="p-8 text-red-600">Failed to load team details</div>;
  }
  const canManageMembers = isOwner || role === "ADMIN";

  const permissionOptions = Object.values(TeamPermission);

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
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600">
            {team.name} • {members.length} active members
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

      {canManageMembers && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Add Team Member
            </h2>
          </div>

          <form
            action={async (formData: FormData) => {
              "use server";
              const email = formData.get("email") as string;
              const memberRole = formData.get("role") as "ADMIN" | "MEMBER";
              const targetTeamId = formData.get("teamId") as string;
              const result = await inviteTeamMember(
                targetTeamId,
                email,
                memberRole,
              );
              const query = new URLSearchParams();
              if (result.success) {
                query.set("notice", "Invitation sent successfully.");
              } else {
                query.set(
                  "error",
                  result.error || "Failed to send invitation.",
                );
              }
              redirect(
                `/dashboard/team/${targetTeamId}/members?${query.toString()}`,
              );
            }}
          >
            <input type="hidden" name="teamId" value={team.id} />

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="worker@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="w-full md:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  name="role"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </form>

          <p className="text-sm text-gray-500 mt-3">
            The user must accept the invitation before joining the team.
          </p>
        </div>
      )}

      {canManageMembers && pendingInvitations.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">
            Pending Invitations
          </h2>
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {invitation.invitedEmail}
                  </p>
                  <p className="text-sm text-gray-600">
                    Role: {invitation.role} • Expires{" "}
                    {new Date(invitation.expiresAt).toLocaleString("en-KE")}
                  </p>
                </div>

                <form
                  action={async () => {
                    "use server";
                    const result = await revokeTeamInvitationAction(
                      invitation.id,
                    );
                    const query = new URLSearchParams({ teamId });
                    if (result.success) {
                      query.set("notice", "Invitation revoked.");
                    } else {
                      query.set(
                        "error",
                        result.error || "Failed to revoke invitation.",
                      );
                    }
                    redirect(
                      `/dashboard/team/${teamId}/members?${query.toString()}`,
                    );
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 text-sm"
                  >
                    Revoke
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-linear-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-purple-200 overflow-hidden flex items-center justify-center">
              {team.owner.image ? (
                <Image
                  src={team.owner.image}
                  alt=""
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-purple-600">
                  {team.owner.name?.charAt(0) || "O"}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {team.owner.name || "Team Owner"}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-200 text-purple-700">
                  OWNER
                </span>
              </div>
              <p className="text-gray-600 text-sm">
                {team.owner.email || "No email available"}
              </p>
            </div>
          </div>
        </div>

        {members.map((member) => {
          const isTeamOwner =
            member.userId === team.ownerId || member.role === "OWNER";

          return (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                  {member.user.image ? (
                    <Image
                      src={member.user.image}
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium">
                      {member.user.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {member.user.name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        member.role === "ADMIN"
                          ? "bg-blue-100 text-blue-700"
                          : member.role === "OWNER"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {member.role}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {member.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{member.user.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {member.permissions.length} permissions
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Paid total: KES{" "}
                    {Number(
                      payoutStatsByMember[member.id]?.paidTotal ?? 0,
                    ).toLocaleString()}
                    {(() => {
                      const lastPaidAt =
                        payoutStatsByMember[member.id]?.lastPaidAt;

                      if (!lastPaidAt) {
                        return " • No payouts yet";
                      }

                      return ` • Last payout ${new Date(lastPaidAt).toLocaleDateString("en-KE")}`;
                    })()}
                  </p>
                </div>

                <div className="text-right text-sm text-gray-500">
                  <p>{member.totalJobsCompleted} jobs</p>
                  <p className="text-emerald-600 font-medium">
                    KES {Number(member.totalEarnings).toLocaleString()}
                  </p>
                </div>

                {canManageMembers && !isTeamOwner && (
                  <div className="flex flex-col gap-3 min-w-[320px]">
                    <div className="flex items-center gap-2">
                      <form
                        action={async (formData: FormData) => {
                          "use server";
                          const result = await updateMemberRole(
                            formData.get("memberId") as string,
                            formData.get("role") as "ADMIN" | "MEMBER",
                          );
                          const query = new URLSearchParams({ teamId });
                          if (result.success) {
                            query.set("notice", "Member role updated.");
                          } else {
                            query.set(
                              "error",
                              result.error || "Failed to update role.",
                            );
                          }
                          redirect(
                            `/dashboard/team/${teamId}/members?${query.toString()}`,
                          );
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="memberId"
                          value={member.id}
                        />
                        <select
                          name="role"
                          defaultValue={member.role}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <button
                          type="submit"
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Save Role
                        </button>
                      </form>

                      <form
                        action={async () => {
                          "use server";
                          const result = await removeTeamMember(member.id);
                          const query = new URLSearchParams({ teamId });
                          if (result.success) {
                            query.set("notice", "Member access removed.");
                          } else {
                            query.set(
                              "error",
                              result.error || "Failed to remove member.",
                            );
                          }
                          redirect(
                            `/dashboard/team/${teamId}/members?${query.toString()}`,
                          );
                        }}
                      >
                        <button
                          type="submit"
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </form>
                    </div>

                    <details className="rounded-lg border border-gray-200 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        Edit Permissions
                      </summary>
                      <form
                        action={async (formData: FormData) => {
                          "use server";
                          const selectedPermissions = formData
                            .getAll("permissions")
                            .filter(
                              (value): value is string =>
                                typeof value === "string",
                            );
                          const result = await updateMemberPermissions(
                            formData.get("memberId") as string,
                            selectedPermissions,
                          );
                          const query = new URLSearchParams({ teamId });
                          if (result.success) {
                            query.set("notice", "Member permissions updated.");
                          } else {
                            query.set(
                              "error",
                              result.error || "Failed to update permissions.",
                            );
                          }
                          redirect(
                            `/dashboard/team/${teamId}/members?${query.toString()}`,
                          );
                        }}
                        className="mt-3"
                      >
                        <input
                          type="hidden"
                          name="memberId"
                          value={member.id}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {permissionOptions.map((permission) => (
                            <label
                              key={permission}
                              className="inline-flex items-center gap-2 text-xs text-gray-700"
                            >
                              <input
                                type="checkbox"
                                name="permissions"
                                value={permission}
                                defaultChecked={member.permissions.includes(
                                  permission,
                                )}
                                className="rounded border-gray-300"
                              />
                              {permission}
                            </label>
                          ))}
                        </div>
                        <button
                          type="submit"
                          className="mt-3 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Save Permissions
                        </button>
                      </form>
                    </details>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No active members yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
