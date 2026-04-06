import {
  getFinanceSummary,
  getTransactions,
  getWallets,
} from "@/app/actions/admin";
import FinanceClient from "@/components/admin/FinanceClient";

export const dynamic = "force-dynamic";

interface SearchParams {
  tab?: string;
  page?: string;
  type?: string;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const activeTab = params.tab || "overview";
  const page = Number(params.page) > 0 ? Number(params.page) : 1;

  // Prepare filters for transactions
  const transactionFilters = {
    type: params.type || "ALL",
    status: params.status || "ALL",
    search: params.search || "",
    dateFrom: params.dateFrom || "",
    dateTo: params.dateTo || "",
    minAmount: params.minAmount || "",
    maxAmount: params.maxAmount || "",
  };

  // Fetch data based on active tab
  // We fetch summary always as it might be used in the header or overview tab
  const summary = await getFinanceSummary();

  const transactions =
    activeTab === "transactions"
      ? await getTransactions(page, 15, transactionFilters)
      : null;

  const wallets =
    activeTab === "wallets"
      ? await getWallets(page, 15, params.search || "")
      : null;

  const initialData = {
    summary,
    transactions,
    wallets,
    activeTab,
  };

  return <FinanceClient initialData={initialData} />;
}
