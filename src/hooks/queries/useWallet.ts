import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queryKeys";
import { ApiResponse } from "@/types/api";

// Wallet types
export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface Transaction {
 id: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  status: "PENDING" | "COMPLETED" | "FAILED";
  date: string;
  reference?: string;
}

export interface PaymentMethod {
  id: string;
  type: "CARD" | "MPESA" | "BANK_ACCOUNT";
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  phoneNumber?: string;
  isDefault: boolean;
}

// Get wallet balance
export function useWalletBalance(
  options?: Omit<UseQueryOptions<WalletBalance, Error>, "queryKey" | "queryFn">
) {
  return useQuery<WalletBalance, Error>({
    queryKey: queryKeys.wallet.balance(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<WalletBalance>>(
        API_ENDPOINTS.wallet.balance
      );
      return data.data;
    },
    ...options,
  });
}

// Get transaction history
export function useTransactions(
  filters?: { startDate?: string; endDate?: string; type?: string },
  options?: Omit<UseQueryOptions<Transaction[], Error>, "queryKey" | "queryFn">
) {
  return useQuery<Transaction[], Error>({
    queryKey: queryKeys.wallet.transactions(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Transaction[]>>(
        API_ENDPOINTS.wallet.transactions,
        { params: filters }
      );
      return data.data;
    },
    ...options,
  });
}

// Get payment methods
export function usePaymentMethods(
  options?: Omit<UseQueryOptions<PaymentMethod[], Error>, "queryKey" | "queryFn">
) {
  return useQuery<PaymentMethod[], Error>({
    queryKey: queryKeys.wallet.paymentMethods(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<PaymentMethod[]>>(
        API_ENDPOINTS.wallet.paymentMethods
      );
      return data.data;
    },
    ...options,
  });
}
