import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

// Fetch user settings
export const useSettings = () => {
  return useQuery<{ settings: Settings; twoFactorEnabled: boolean }>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
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
export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdateSettingsParams>({
    mutationFn: async (data) => {
      const response = await fetch("/api/settings", {
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
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};
