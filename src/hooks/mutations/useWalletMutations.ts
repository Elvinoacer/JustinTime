import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queryKeys";
import { ApiResponse } from "@/types/api";
import { PaymentMethod } from "../queries/useWallet";

// Top up wallet mutation
export function useTopUpWallet(
  options?: Omit<
    UseMutationOptions<void, Error, { amount: number; paymentMethodId: string }>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { amount: number; paymentMethodId: string }>({
    mutationFn: async (data) => {
      await apiClient.post(API_ENDPOINTS.wallet.topUp, data);
    },
    onSuccess: () => {
      // Invalidate balance and transactions
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    },
    ...options,
  });
}

// Withdraw funds mutation
export function useWithdrawFunds(
  options?: Omit<
    UseMutationOptions<void, Error, { amount: number; paymentMethodId: string }>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { amount: number; paymentMethodId: string }>({
    mutationFn: async (data) => {
      await apiClient.post(API_ENDPOINTS.wallet.withdraw, data);
    },
    onSuccess: () => {
      // Invalidate balance and transactions
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    },
    ...options,
  });
}

// Add payment method mutation
export function useAddPaymentMethod(
  options?: Omit<
    UseMutationOptions<PaymentMethod, Error, Omit<PaymentMethod, "id">>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation<PaymentMethod, Error, Omit<PaymentMethod, "id">>({
    mutationFn: async (paymentMethodData) => {
      const { data } = await apiClient.post<ApiResponse<PaymentMethod>>(
        API_ENDPOINTS.wallet.addPaymentMethod,
        paymentMethodData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.paymentMethods() });
    },
    ...options,
  });
}

// Delete payment method mutation
export function useDeletePaymentMethod(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (paymentMethodId) => {
      await apiClient.delete(API_ENDPOINTS.wallet.deletePaymentMethod(paymentMethodId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.paymentMethods() });
    },
    ...options,
  });
}
