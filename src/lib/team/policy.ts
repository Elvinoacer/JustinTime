export type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

export function isTeamManager(
  role: TeamRole | null | undefined,
  isOwner: boolean,
) {
  return isOwner || role === "ADMIN";
}

export function canEditAdmin(
  actorRole: TeamRole | null | undefined,
  actorIsOwner: boolean,
  targetRole: TeamRole,
) {
  if (actorIsOwner) {
    return true;
  }

  if (targetRole === "ADMIN") {
    return false;
  }

  return actorRole === "ADMIN";
}

export function canTransitionTerminalJobState(
  status: string,
  isManager: boolean,
) {
  if (["PENDING", "ASSIGNED", "CANCELLED"].includes(status)) {
    return isManager;
  }

  return true;
}
