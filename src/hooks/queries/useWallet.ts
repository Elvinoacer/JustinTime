export {
  useWalletBalance,
  useWalletTransactions as useTransactions,
} from "@/lib/api/hooks/useWallet";

export type {
  WalletBalance,
  WalletTransaction,
  WalletTransactionsResponse,
} from "@/lib/api/hooks/useWallet";
