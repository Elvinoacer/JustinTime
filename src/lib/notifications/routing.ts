type NotificationRole = string | null | undefined;

function normalizeRole(
  role: NotificationRole,
): "CLIENT" | "PROVIDER" | "ADMIN" {
  const normalized = (role || "").toUpperCase();

  if (normalized === "CLIENT") {
    return "CLIENT";
  }

  if (normalized === "ADMIN") {
    return "ADMIN";
  }

  return "PROVIDER";
}

export function getNotificationCenterPath(role: NotificationRole): string {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "CLIENT") {
    return "/client/notifications";
  }

  if (normalizedRole === "ADMIN") {
    return "/admin";
  }

  return "/dashboard/notifications";
}

export function getNotificationActionUrl(
  type: string,
  role: NotificationRole,
  explicitActionUrl?: string | null,
): string {
  if (explicitActionUrl) {
    return explicitActionUrl;
  }

  const normalizedRole = normalizeRole(role);
  const normalizedType = (type || "").toUpperCase();

  if (
    normalizedType.includes("MESSAGE") ||
    normalizedType.includes("CHAT") ||
    normalizedType.includes("CONVERSATION")
  ) {
    if (normalizedRole === "CLIENT") {
      return "/client/messages";
    }

    if (normalizedRole === "ADMIN") {
      return "/admin/support";
    }

    return "/dashboard/messages";
  }

  if (
    normalizedType.includes("BOOKING") ||
    normalizedType.includes("NEGOTIATION")
  ) {
    if (normalizedRole === "CLIENT") {
      return "/client/bookings";
    }

    if (normalizedRole === "ADMIN") {
      return "/admin/bookings";
    }

    return "/dashboard/bookings";
  }

  if (
    normalizedType.includes("PROPOSAL") ||
    normalizedType.includes("JOB") ||
    normalizedType.includes("APPLICATION")
  ) {
    if (normalizedRole === "CLIENT") {
      return normalizedType.includes("PROPOSAL")
        ? "/client/proposals"
        : "/client/jobs";
    }

    if (normalizedRole === "ADMIN") {
      return "/admin/jobs";
    }

    return "/dashboard/jobs";
  }

  if (
    normalizedType.includes("PAYMENT") ||
    normalizedType.includes("SUBSCRIPTION") ||
    normalizedType.includes("EARNING")
  ) {
    if (normalizedRole === "CLIENT") {
      return "/client/wallet";
    }

    if (normalizedRole === "ADMIN") {
      return "/admin/finance";
    }

    return "/dashboard/earnings";
  }

  if (normalizedType.includes("REVIEW")) {
    if (normalizedRole === "CLIENT") {
      return "/client/profile";
    }

    if (normalizedRole === "ADMIN") {
      return "/admin/users";
    }

    return "/dashboard/reviews";
  }

  return getNotificationCenterPath(normalizedRole);
}
