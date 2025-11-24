import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Settings {
  account: {
    name: string;
    email: string;
    phone?: string;
    role: string;
    createdAt: string;
    onboardingCompleted: boolean;
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
}

interface UpdateSettingsParams {
  phone?: string;
  notifications?: Partial<Settings["notifications"]>;
  privacy?: Partial<Settings["privacy"]>;
}

// Fetch user settings
export const useSettings = () => {
  return useQuery<{ settings: Settings }>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      return response.json();
    },
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
