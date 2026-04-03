import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type SettingsScope = "global" | "client";

function settingsEndpoint(scope: SettingsScope) {
  return scope === "client" ? "/api/client/settings" : "/api/settings";
}

function settingsQueryKey(scope: SettingsScope) {
  return scope === "client"
    ? (["client", "settings"] as const)
    : (["settings"] as const);
}

interface Settings {
  account: {
    name: string;
    email: string;
    phone?: string;
    role: string;
    createdAt: string;
    onboardingCompleted: boolean;
    deletionScheduledAt?: string | null;
    deletionReason?: string | null;
  };
  subscription: {
    plan: string;
    isActive: boolean;
    endDate?: string;
  } | null;
  notifications: {
    emailJobAlerts: boolean;
    emailMessages: boolean;
    emailBookings: boolean;
    emailReviews: boolean;
    emailMarketing: boolean;
    pushNotifications: boolean;
    allowMarketing: boolean;
    allowMessages: boolean;
    allowBookingUpdates: boolean;
  };
  privacy: {
    profileVisible: boolean;
    searchable: boolean;
    showLocation: boolean;
    allowMessages: boolean;
  };
  activeSessions: {
    id: string;
    expires: string | null;
    isCurrent: boolean;
  }[];
}

interface UpdateSettingsParams {
  phone?: string;
  notifications?: Partial<Settings["notifications"]>;
  privacy?: Partial<Settings["privacy"]>;
}

interface UpdateSettingsResponse {
  message: string;
  settings: {
    phone?: string | null;
    notifications?: Settings["notifications"];
    privacy?: Settings["privacy"];
  };
}

// Fetch user settings
export const useSettings = (scope: SettingsScope = "global") => {
  const endpoint = settingsEndpoint(scope);

  return useQuery<{
    settings: Settings;
    twoFactorEnabled: boolean;
    serverTime?: string;
  }>({
    queryKey: settingsQueryKey(scope),
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      return response.json();
    },
    // Ensure session-related UI stays fresh after refresh/focus/reconnect.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

// Update settings
export const useUpdateSettings = (scope: SettingsScope = "global") => {
  const queryClient = useQueryClient();
  const endpoint = settingsEndpoint(scope);
  const queryKey = settingsQueryKey(scope);

  return useMutation<UpdateSettingsResponse, Error, UpdateSettingsParams>({
    mutationFn: async (data) => {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update settings");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (scope === "client") {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      }
    },
  });
};
