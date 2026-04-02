export const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailJobAlerts: true,
  emailMessages: true,
  emailBookings: true,
  emailReviews: true,
  emailMarketing: false,
  pushNotifications: true,
  allowMarketing: true,
  allowMessages: true,
  allowBookingUpdates: true,
} as const;

export type NotificationPreferenceKey =
  keyof typeof DEFAULT_NOTIFICATION_PREFERENCES;

export type NotificationPreferences = {
  [K in NotificationPreferenceKey]: boolean;
};

const PREFERENCE_KEYS = Object.keys(
  DEFAULT_NOTIFICATION_PREFERENCES,
) as NotificationPreferenceKey[];

function parsePreferenceObject(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

export function normalizeNotificationPreferences(
  input: unknown,
): NotificationPreferences {
  const parsed = parsePreferenceObject(input);
  const normalized: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  };

  for (const key of PREFERENCE_KEYS) {
    if (typeof parsed[key] === "boolean") {
      normalized[key] = parsed[key] as boolean;
    }
  }

  return normalized;
}

export type NotificationPreferenceCategory =
  | "marketing"
  | "messages"
  | "bookingUpdates"
  | "general";

export function getNotificationPreferenceCategory(
  type?: string,
): NotificationPreferenceCategory {
  const normalizedType = (type || "").toUpperCase();

  if (
    normalizedType.includes("PROMO") ||
    normalizedType.includes("MARKETING") ||
    normalizedType.includes("CAMPAIGN") ||
    normalizedType.includes("NEWSLETTER")
  ) {
    return "marketing";
  }

  if (
    normalizedType.includes("MESSAGE") ||
    normalizedType.includes("CHAT") ||
    normalizedType.includes("CONVERSATION")
  ) {
    return "messages";
  }

  if (
    normalizedType.includes("BOOKING") ||
    normalizedType.includes("RESERVATION") ||
    normalizedType.includes("APPOINTMENT")
  ) {
    return "bookingUpdates";
  }

  return "general";
}

export function isNotificationCategoryEnabled(
  preferences: NotificationPreferences,
  type?: string,
): boolean {
  const category = getNotificationPreferenceCategory(type);

  if (category === "marketing") {
    return preferences.allowMarketing;
  }

  if (category === "messages") {
    return preferences.allowMessages;
  }

  if (category === "bookingUpdates") {
    return preferences.allowBookingUpdates;
  }

  return true;
}

export function shouldStoreInAppNotification(
  preferences: NotificationPreferences,
  type?: string,
): boolean {
  return isNotificationCategoryEnabled(preferences, type);
}

export function shouldSendPushNotification(
  preferences: NotificationPreferences,
  type?: string,
): boolean {
  return (
    preferences.pushNotifications &&
    isNotificationCategoryEnabled(preferences, type)
  );
}
