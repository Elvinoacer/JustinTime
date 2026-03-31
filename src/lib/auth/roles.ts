const truthy = new Set(["1", "true", "yes", "on"]);

function readFlag(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  return truthy.has(value.trim().toLowerCase());
}

export const multiRoleFeatureFlags = {
  readEnabled: readFlag(process.env.FF_MULTI_ROLE_READ_ENABLED, false),
  writeEnabled: readFlag(process.env.FF_MULTI_ROLE_WRITE_ENABLED, false),
  enforceEnabled: readFlag(process.env.FF_MULTI_ROLE_ENFORCE_ENABLED, false),
};

export type AppRole = "CLIENT" | "PROVIDER" | "ADMIN";

const APP_ROLES: AppRole[] = ["CLIENT", "PROVIDER", "ADMIN"];

function normalizeRole(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  return APP_ROLES.includes(upper as AppRole) ? (upper as AppRole) : null;
}

function normalizeRolesList(value: unknown): AppRole[] {
  if (!Array.isArray(value)) return [];

  const deduped = new Set<AppRole>();
  for (const role of value) {
    const normalized = normalizeRole(role);
    if (normalized) deduped.add(normalized);
  }

  return [...deduped];
}

type RoleSource = {
  role?: unknown;
  roles?: unknown;
};

export function normalizeRoles(source?: RoleSource | null): AppRole[] {
  if (!source) return [];

  const normalizedLegacyRole = normalizeRole(source.role);
  const normalizedRoles = normalizeRolesList(source.roles);

  if (!multiRoleFeatureFlags.readEnabled) {
    return normalizedLegacyRole ? [normalizedLegacyRole] : [];
  }

  const merged = new Set<AppRole>(normalizedRoles);
  if (normalizedLegacyRole) merged.add(normalizedLegacyRole);
  return [...merged];
}

export function hasRole(
  source: RoleSource | null | undefined,
  role: AppRole,
): boolean {
  const target = normalizeRole(role);
  if (!target || !source) return false;

  if (!multiRoleFeatureFlags.enforceEnabled) {
    return normalizeRole(source.role) === target;
  }

  return normalizeRoles(source).includes(target);
}

export function hasAnyRole(
  source: RoleSource | null | undefined,
  allowedRoles: AppRole[],
): boolean {
  if (!source || allowedRoles.length === 0) return false;
  return allowedRoles.some((role) => hasRole(source, role));
}

export function getDefaultRolesForPrimaryRole(role: unknown): AppRole[] {
  const normalized = normalizeRole(role);
  if (!normalized) return ["CLIENT"];

  if (normalized === "PROVIDER") {
    return ["CLIENT", "PROVIDER"];
  }

  return [normalized];
}

export function mergeRoles(
  existingRoles: unknown,
  primaryRole: unknown,
  extraRoles: AppRole[] = [],
): AppRole[] {
  const merged = new Set<AppRole>([
    ...normalizeRolesList(existingRoles),
    ...getDefaultRolesForPrimaryRole(primaryRole),
    ...extraRoles,
  ]);

  return [...merged];
}
