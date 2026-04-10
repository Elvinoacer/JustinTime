import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { maskPhoneForDisplay } from "@/lib/utils/phone";

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
  phoneNumber?: string;
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
  return useMutation<
    InitiateSubscriptionResponse,
    Error,
    InitiateSubscriptionParams
  >({
    mutationFn: async ({ plan, phoneNumber }) => {
      const response = await fetch("/api/subscription/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          phoneNumber,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initiate subscription");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Redirect to completion page while M-Pesa STK push is processed
      if (data.checkoutUrl) {
        if (variables.phoneNumber) {
          toast.success(
            `STK push sent to ${maskPhoneForDisplay(variables.phoneNumber)}. Redirecting...`,
          );
        } else {
          toast.success("STK push sent. Redirecting...");
        }

        window.setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 600);
      }
    },
  });
};
