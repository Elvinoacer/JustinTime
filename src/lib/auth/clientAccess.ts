type RoleLike = {
  role?: unknown;
  roles?: unknown;
};

function toRole(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function normalizeRoleList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(toRole).filter((role): role is string => Boolean(role));
}

export function hasClientAccess(source?: RoleLike | null): boolean {
  if (!source) {
    return false;
  }

  const primaryRole = toRole(source.role);
  if (primaryRole === "CLIENT") {
    return true;
  }

  const roles = normalizeRoleList(source.roles);
  return roles.includes("CLIENT");
}
