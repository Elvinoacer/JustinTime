"use server";

import {
  createTeam as createTeamAction,
  getMyTeam as getMyTeamAction,
  inviteTeamMember,
  removeTeamMember,
  updateMemberPermissions as updateMemberPermissionsAction,
} from "@/app/actions/team";
import {
  ADMIN_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
  OWNER_PERMISSIONS,
} from "@/lib/permissions";

/**
 * Legacy wrapper kept for backward compatibility.
 * Canonical implementation is in src/app/actions/team.ts.
 */
export async function createTeam(name: string) {
  return createTeamAction(name);
}

/**
 * Legacy shape compatibility for older components.
 */
export async function getMyTeam() {
  const result = await getMyTeamAction();

  if (!result.success || !result.team) {
    return null;
  }

  const myRole = result.role || "MEMBER";
  const myPermissions =
    myRole === "OWNER"
      ? OWNER_PERMISSIONS
      : myRole === "ADMIN"
        ? ADMIN_PERMISSIONS
        : DEFAULT_MEMBER_PERMISSIONS;

  return {
    ...result.team,
    myRole,
    myPermissions,
  };
}

/**
 * Legacy wrapper that resolves team context and delegates to the canonical action.
 */
export async function addMember(
  email: string,
  role: string = "MEMBER",
  permissions: string[] = DEFAULT_MEMBER_PERMISSIONS,
) {
  const teamContext = await getMyTeamAction();
  if (!teamContext.success || !teamContext.team) {
    return { success: false, error: "No active team found" };
  }

  const normalizedRole = role === "ADMIN" ? "ADMIN" : "MEMBER";
  const invited = await inviteTeamMember(
    teamContext.team.id,
    email,
    normalizedRole,
    permissions,
  );
  if (!invited.success) {
    return invited;
  }

  return {
    success: true,
    message:
      invited.message ||
      "Invitation sent successfully. The user must accept to join.",
    invitation: invited.invitation,
  };
}

export async function removeMember(memberId: string) {
  return removeTeamMember(memberId);
}

export async function updateMemberPermissions(
  memberId: string,
  permissions: string[],
) {
  return updateMemberPermissionsAction(memberId, permissions);
}
