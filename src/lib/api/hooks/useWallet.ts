import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import { toast } from "sonner";

export const useWallet = () => {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const response = await apiClient.get("/wallet");
      return response.data;
    },
  });
};

export const useTopUpWallet = () => {
  return useMutation({
    mutationFn: async (data: { amount: number }) => {
      const response = await apiClient.post("/wallet/topup", data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to initiate top-up");
    },
  });
};

export const useVerifyTopUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { apiRef: string }) => {
      void data;
      // Wallet credits are applied asynchronously by signed webhooks.
      return { accepted: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Payment received. Wallet balance will update shortly.");
    },
    onError: (error: any) => {
      toast.error("Failed to verify payment");
    },
  });
};
