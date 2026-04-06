"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Transaction {
  id: string;
  amount: any;
  type: string;
  description: string | null;
  createdAt: Date;
  wallet: {
    user: { name: string | null; email: string | null; role: string };
  };
}

interface TransactionsTableProps {
  transactions: Transaction[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function TransactionsTable({
  transactions,
  total,
  currentPage,
  totalPages,
}: TransactionsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `?${params.toString()}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "DEPOSIT":
      case "EARNING":
        return "bg-emerald-50 text-emerald-700";
      case "WITHDRAWAL":
        return "bg-red-50 text-red-700";
      case "PAYMENT":
        return "bg-blue-50 text-blue-700";
      case "REFUND":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Transaction ID</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                  {transaction.id.slice(-8)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-900 font-medium">
                      {transaction.wallet.user.name || "Unknown"}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {transaction.wallet.user.email}
                    </span>
                    <span className="text-slate-400 text-[10px] uppercase">
                      {transaction.wallet.user.role}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}
                  >
                    {transaction.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                  {transaction.description || "—"}
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td
                  className={`px-6 py-4 text-right font-semibold ${
                    transaction.type === "DEPOSIT" ||
                    transaction.type === "EARNING"
                      ? "text-emerald-600"
                      : "text-slate-900"
                  }`}
                >
                  {transaction.type === "DEPOSIT" ||
                  transaction.type === "EARNING"
                    ? "+"
                    : ""}
                  KES {Number(transaction.amount).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium">{transactions.length}</span> of{" "}
          <span className="font-medium">{total}</span> transactions
        </p>
        <div className="flex gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => router.push(buildPageUrl(currentPage - 1))}
            className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50"
          >
            Previous
          </button>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => router.push(buildPageUrl(currentPage + 1))}
            className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
