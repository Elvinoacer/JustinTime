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
import { maskPhoneForDisplay } from "@/lib/utils/phone";

const TOPUP_STORAGE_KEY = "jt.wallet.topup.pending";
const TOPUP_STORAGE_TTL_MS = 15 * 60 * 1000;

export type WalletTransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "REVERSED"
  | "CANCELLED";

export interface WalletTopUpReference {
  id: string;
  apiRef: string;
  status: WalletTransactionStatus;
  amountExpected: number | string;
  amountReceived: number | string | null;
  gatewaySessionId: string | null;
  gatewayInvoiceId: string | null;
  failureReason: string | null;
}

export interface WalletTransaction {
  id: string;
  description: string | null;
  amount: number | string;
  type: string;
  status: WalletTransactionStatus;
  direction?: "CREDIT" | "DEBIT" | null;
  category?: string | null;
  currency?: string | null;
  providerRef?: string | null;
  gatewayReference?: string | null;
  gatewaySessionId?: string | null;
  failureReason?: string | null;
  createdAt: string;
  settledAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  reversedAt?: string | null;
  topUp?: WalletTopUpReference | null;
}

export interface WalletSummary {
  id: string;
  userId: string;
  currency: string;
  balance: number | string;
  availableBalance: number | string;
  pendingBalance: number | string;
  pendingIncoming: number | string;
  pendingOutgoing: number | string;
  creditBalance: number;
  monthlyStats: {
    startOfMonth: string;
    spent: number;
    transactionCount: number;
    averageSpent: number;
  };
  topUpStats: {
    pendingCount: number;
    processingCount: number;
    failedCount: number;
  };
  recentSettledTransactions: WalletTransaction[];
  recentPendingTransactions: WalletTransaction[];
  transactions: WalletTransaction[];
}

export interface WalletBalance {
  balance: number | string;
  availableBalance: number | string;
  pendingBalance: number | string;
  pendingIncoming: number | string;
  currency: string;
}

export type WalletTransactionsResponse = PaginatedResponse<WalletTransaction>;

export interface WalletTopUpPayload {
  amount: number;
  returnUrl?: string;
  phoneNumber?: string;
}

export interface WalletTopUpResponse {
  checkoutUrl?: string;
  sessionId?: string;
  apiRef?: string;
  topUpId?: string;
  status?: WalletTransactionStatus;
  error?: string;
}

export interface WalletTopUpStatusResponse {
  topUpId: string;
  apiRef: string;
  status: WalletTransactionStatus;
  initiatedPhoneNumber: string | null;
  currency: string;
  amountExpected: number | string;
  amountReceived: number | string | null;
  gateway: string;
  gatewaySessionId: string | null;
  gatewayInvoiceId: string | null;
  checkoutUrl: string | null;
  initiatedAt: string;
  confirmedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  reversedAt: string | null;
  failureReason: string | null;
  reconciliationError: string | null;
  isTerminal: boolean;
  transaction: WalletTransaction | null;
}

export const useWallet = (
  options?: Omit<UseQueryOptions<WalletSummary, Error>, "queryKey" | "queryFn">,
) => {
  const queryClient = useQueryClient();
  const cachedWallet = queryClient.getQueryData<WalletSummary>(
    queryKeys.wallet.all,
  );
  const hasPendingTopUps =
    (cachedWallet?.topUpStats?.pendingCount ?? 0) > 0 ||
    (cachedWallet?.topUpStats?.processingCount ?? 0) > 0;

  return useQuery<WalletSummary, Error>({
    queryKey: queryKeys.wallet.all,
    queryFn: async () => {
      const response = await apiClient.get<WalletSummary>("/wallet");
      return response.data;
    },
    staleTime: hasPendingTopUps ? 10_000 : 60_000,
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
  filters?: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    direction?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  },
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

export const useWalletTopUpStatus = (
  params: {
    apiRef?: string;
    topUpId?: string;
    trackingId?: string;
    checkoutId?: string;
  },
  options?: Omit<
    UseQueryOptions<WalletTopUpStatusResponse, Error>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery<WalletTopUpStatusResponse, Error>({
    queryKey: queryKeys.wallet.topUpStatus(params),
    queryFn: async () => {
      const response = await apiClient.get<WalletTopUpStatusResponse>(
        "/wallet/topup/status",
        { params },
      );
      return response.data;
    },
    enabled: Boolean(params.apiRef || params.topUpId),
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

      if (!response.data?.checkoutUrl) {
        throw new Error(
          response.data?.error ||
            "Unable to start secure checkout. Please try again.",
        );
      }

      return response.data;
    },
    onSuccess: (data, variables, onMutateResult, context) => {
      if (typeof window !== "undefined" && (data.apiRef || data.topUpId)) {
        const payload = {
          apiRef: data.apiRef || null,
          topUpId: data.topUpId || null,
          initiatedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(TOPUP_STORAGE_KEY, JSON.stringify(payload));
      }

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

      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.wallet.transactions(),
      });

      onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      clearStoredPendingTopUp();
      const message = error?.message || "Failed to initiate top-up";
      toast.error(message);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restOptions,
  });
};

export function getStoredPendingTopUp(): {
  apiRef?: string;
  topUpId?: string;
} | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(TOPUP_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const initiatedAtRaw =
      typeof parsed.initiatedAt === "string" ? parsed.initiatedAt : null;
    if (initiatedAtRaw) {
      const initiatedAtMs = new Date(initiatedAtRaw).getTime();
      if (
        Number.isFinite(initiatedAtMs) &&
        Date.now() - initiatedAtMs > TOPUP_STORAGE_TTL_MS
      ) {
        window.localStorage.removeItem(TOPUP_STORAGE_KEY);
        return null;
      }
    }

    const apiRef =
      typeof parsed.apiRef === "string" ? parsed.apiRef : undefined;
    const topUpId =
      typeof parsed.topUpId === "string" ? parsed.topUpId : undefined;

    if (!apiRef && !topUpId) {
      return null;
    }

    return { apiRef, topUpId };
  } catch {
    return null;
  }
}

export function clearStoredPendingTopUp() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOPUP_STORAGE_KEY);
}
