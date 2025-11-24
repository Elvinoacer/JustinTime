import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SubscriptionStatus {
  plan: "FREE" | "PRO" | "BUSINESS";
  isActive: boolean;
  startDate: string;
  endDate?: string;
  daysRemaining?: number;
  isPremium: boolean;
}

interface InitiateSubscriptionParams {
  plan: "PRO" | "BUSINESS";
}

interface InitiateSubscriptionResponse {
  checkoutUrl: string;
  sessionId: string;
  amount: number;
  plan: string;
}

// Fetch subscription status
export const useSubscriptionStatus = () => {
  return useQuery<{ subscription: SubscriptionStatus }>({
    queryKey: ["subscription", "status"],
    queryFn: async () => {
      const response = await fetch("/api/subscription/status");
      if (!response.ok) {
        throw new Error("Failed to fetch subscription status");
      }
      return response.json();
    },
  });
};

// Initiate subscription payment
export const useInitiateSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<InitiateSubscriptionResponse, Error, InitiateSubscriptionParams>({
    mutationFn: async ({ plan }) => {
      const response = await fetch("/api/subscription/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initiate subscription");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to IntaSend checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
  });
};
