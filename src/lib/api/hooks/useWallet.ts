import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import apiClient from "../client";
import { toast } from "sonner";
import { queryKeys } from "@/lib/api/queryKeys";
import { PaginatedResponse } from "@/types/api";

export interface WalletTransaction {
  id: string;
  description: string | null;
  amount: number | string;
  type: string;
  createdAt: string;
}

export interface WalletResource {
  id: string;
  userId: string;
  balance: number | string;
  creditBalance: number;
  transactions: WalletTransaction[];
}

export interface WalletBalance {
  balance: number | string;
  currency: string;
}

export type WalletTransactionsResponse = PaginatedResponse<WalletTransaction>;

export interface WalletTopUpPayload {
  amount: number;
  returnUrl?: string;
}

export interface WalletTopUpResponse {
  checkoutUrl?: string;
  sessionId?: string;
  apiRef?: string;
}

export const useWallet = (
  options?: Omit<
    UseQueryOptions<WalletResource, Error>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery<WalletResource, Error>({
    queryKey: queryKeys.wallet.all,
    queryFn: async () => {
      const response = await apiClient.get<WalletResource>("/wallet");
      return response.data;
    },
    ...options,
  });
};

export const useWalletBalance = (
  options?: Omit<UseQueryOptions<WalletBalance, Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<WalletBalance, Error>({
    queryKey: queryKeys.wallet.balance(),
    queryFn: async () => {
      const response = await apiClient.get<WalletBalance>("/wallet/balance");
      return response.data;
    },
    ...options,
  });
};

export const useWalletTransactions = (
  filters?: { page?: number; pageSize?: number; type?: string },
  options?: Omit<
    UseQueryOptions<WalletTransactionsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery<WalletTransactionsResponse, Error>({
    queryKey: queryKeys.wallet.transactions(filters),
    queryFn: async () => {
      const response = await apiClient.get<WalletTransactionsResponse>(
        "/wallet/transactions",
        { params: filters },
      );
      return response.data;
    },
    ...options,
  });
};

export const useTopUpWallet = (
  options?: Omit<
    UseMutationOptions<WalletTopUpResponse, Error, WalletTopUpPayload>,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation<WalletTopUpResponse, Error, WalletTopUpPayload>({
    mutationFn: async (data) => {
      const response = await apiClient.post<WalletTopUpResponse>(
        "/wallet/topup",
        data,
      );
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });

      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      const message = error?.message || "Failed to initiate top-up";
      toast.error(message);
      onError?.(error, variables, context);
    },
    ...restOptions,
  });
};
