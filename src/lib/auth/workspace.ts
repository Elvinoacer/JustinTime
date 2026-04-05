import { hasRole } from "@/lib/auth/roles";

type WorkspaceUser = {
  role?: unknown;
  roles?: unknown;
  onboardingCompleted?: boolean;
  providerSetupCompleted?: boolean;
  preferredWorkspace?: string | null;
};

const VALID_WORKSPACES = new Set(["CLIENT", "PROVIDER", "ADMIN"]);

/**
 * Returns the dashboard URL for the user's preferred workspace.
 * Falls back to role-based routing if no workspace preference is set.
 */
export function getPreferredDashboard(user?: WorkspaceUser | null): string {
  if (!user) return "/client/dashboard";

  // Admin always goes to admin dashboard
  if (hasRole(user as { role?: unknown; roles?: unknown }, "ADMIN")) {
    return "/admin/dashboard";
  }

  // If user hasn't completed onboarding, send to onboarding
  if (!user.onboardingCompleted) {
    return "/onboarding";
  }

  // Use preferred workspace if set and valid
  const preferred = user.preferredWorkspace?.toUpperCase();
  if (preferred && VALID_WORKSPACES.has(preferred)) {
    if (
      preferred === "PROVIDER" &&
      hasRole(user as { role?: unknown; roles?: unknown }, "PROVIDER")
    ) {
      return "/dashboard";
    }
    if (
      preferred === "ADMIN" &&
      hasRole(user as { role?: unknown; roles?: unknown }, "ADMIN")
    ) {
      return "/admin/dashboard";
    }
    // Default to client dashboard for CLIENT or if role doesn't match preference
    return "/client/dashboard";
  }

  // Legacy fallback: route by primary role
  if (hasRole(user as { role?: unknown; roles?: unknown }, "PROVIDER")) {
    return "/dashboard";
  }

  return "/client/dashboard";
}

/**
 * Returns the URL to switch to the opposite workspace.
 */
export function getWorkspaceSwitchUrl(
  currentWorkspace: "CLIENT" | "PROVIDER",
): string {
  return currentWorkspace === "PROVIDER" ? "/client/dashboard" : "/dashboard";
}

/**
 * Normalizes a workspace value to a valid workspace string.
 */
export function normalizeWorkspace(
  value: unknown,
): "CLIENT" | "PROVIDER" | "ADMIN" {
  if (typeof value !== "string") return "CLIENT";
  const upper = value.trim().toUpperCase();
  if (upper === "PROVIDER") return "PROVIDER";
  if (upper === "ADMIN") return "ADMIN";
  return "CLIENT";
}

/**
 * Determines if a user can access the provider workspace.
 */
export function canAccessProviderWorkspace(
  user?: WorkspaceUser | null,
): boolean {
  if (!user) return false;
  return (
    hasRole(user as { role?: unknown; roles?: unknown }, "PROVIDER") &&
    Boolean(user.providerSetupCompleted)
  );
}
