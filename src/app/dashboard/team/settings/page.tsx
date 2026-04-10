import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getMyTeam,
  transferTeamOwnershipAction,
  updateTeamSettings,
} from "@/app/actions/team";
import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface TeamSettingsPageProps {
  searchParams?: Promise<{
    teamId?: string;
    notice?: string;
    error?: string;
  }>;
}

export default async function TeamSettingsPage({
  searchParams,
}: TeamSettingsPageProps) {
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

  if (!(teamResult.isOwner || teamResult.role === "ADMIN")) {
    redirect(teamBasePath);
  }

  const team = teamResult.team;
  const ownershipCandidates = (team.members || []).filter(
    (member) => member.userId !== team.ownerId,
  );

  const buildSettingsPath = (extra?: Record<string, string>) => {
    const query = new URLSearchParams();
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        query.set(key, value);
      }
    }
    const queryString = query.toString();
    return queryString.length > 0
      ? `${teamBasePath}/settings?${queryString}`
      : `${teamBasePath}/settings`;
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={teamBasePath}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Settings</h1>
          <p className="text-gray-600">
            Manage team profile, split, and payroll cycle
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

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            General Configuration
          </h2>
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            const targetTeamId = formData.get("teamId") as string;
            const name = formData.get("name") as string;
            const description = formData.get("description") as string;
            const defaultSplit = Number(formData.get("defaultSplit") as string);
            const payrollCycle = formData.get("payrollCycle") as string;

            const result = await updateTeamSettings(targetTeamId, {
              name,
              description,
              defaultSplit,
              payrollCycle,
            });

            if (result.success) {
              redirect(
                buildSettingsPath({
                  notice: "Team settings updated successfully.",
                }),
              );
            }

            redirect(
              buildSettingsPath({
                error: result.error || "Failed to update team settings.",
              }),
            );
          }}
          className="space-y-5"
        >
          <input type="hidden" name="teamId" value={teamId} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Name
            </label>
            <input
              type="text"
              name="name"
              defaultValue={team.name}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={team.description || ""}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Share (%)
              </label>
              <input
                type="number"
                name="defaultSplit"
                min={0}
                max={100}
                defaultValue={team.defaultSplit}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Remaining percentage is distributed to assigned workers.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payroll Cycle
              </label>
              <select
                name="payrollCycle"
                defaultValue={team.payrollCycle}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Biweekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
          >
            Save Settings
          </button>
        </form>
      </div>

      {teamResult.isOwner && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Transfer Ownership
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Transfer team ownership to another active member.
          </p>

          {ownershipCandidates.length === 0 ? (
            <p className="text-sm text-gray-500">
              Add at least one active member before transferring ownership.
            </p>
          ) : (
            <form
              action={async (formData: FormData) => {
                "use server";
                const targetMemberId = formData.get(
                  "newOwnerMemberId",
                ) as string;
                const result = await transferTeamOwnershipAction(
                  teamId,
                  targetMemberId,
                );

                if (result.success) {
                  redirect(
                    `/dashboard/team?notice=${encodeURIComponent("Ownership transferred successfully.")}`,
                  );
                }

                redirect(
                  buildSettingsPath({
                    error: result.error || "Failed to transfer ownership.",
                  }),
                );
              }}
              className="flex flex-col md:flex-row gap-3"
            >
              <select
                name="newOwnerMemberId"
                required
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select new owner</option>
                {ownershipCandidates.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.user.name || member.user.email || "Member"}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
              >
                Transfer Ownership
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
