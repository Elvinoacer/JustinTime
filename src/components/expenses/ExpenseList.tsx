"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Receipt, Search, Trash2, Loader2 } from "lucide-react";
import { AddExpenseModal } from "./AddExpenseModal";
import { Button } from "@/components/ui/button";
import { deleteExpense, getExpenses } from "@/app/actions/expenses";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Expense {
  id: string;
  amount: number | string;
  merchant: string | null;
  category: string;
  date: Date | string;
  status: "PENDING_SCAN" | "SCANNED" | "VERIFIED" | "REJECTED";
  description: string | null;
  receiptUrl?: string | null;
  job?: { id: string; title: string } | null;
}

interface ExpenseListInitialData {
  expenses: Expense[];
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  insights?: {
    byCategory?: Array<{ category: string; amount: number; count: number }>;
  };
}

const STATUS_LABELS: Record<Expense["status"], string> = {
  PENDING_SCAN: "Pending Scan",
  SCANNED: "Scanned",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

function getStatusBadgeClass(status: Expense["status"]): string {
  if (status === "VERIFIED") return "bg-emerald-100 text-emerald-700";
  if (status === "SCANNED") return "bg-blue-100 text-blue-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export function ExpenseList({
  initialData,
}: {
  initialData: ExpenseListInitialData;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING_SCAN" | "SCANNED" | "VERIFIED" | "REJECTED"
  >("ALL");

  const [expenses, setExpenses] = useState<Expense[]>(
    initialData.expenses || [],
  );
  const [page, setPage] = useState(initialData.pagination?.page || 1);
  const [pagination, setPagination] = useState(
    initialData.pagination || {
      page: 1,
      limit: 20,
      totalCount: (initialData.expenses || []).length,
      totalPages: 1,
    },
  );
  const [isFetching, setIsFetching] = useState(false);

  const categoryOptions = useMemo(() => {
    const seeded =
      initialData.insights?.byCategory?.map((c) => c.category) || [];
    const fromData = Array.from(new Set(expenses.map((exp) => exp.category)));
    return ["All", ...Array.from(new Set([...seeded, ...fromData]))];
  }, [initialData.insights?.byCategory, expenses]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsFetching(true);
      const result = await getExpenses({
        page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        category: categoryFilter === "All" ? undefined : categoryFilter,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });

      if (!cancelled) {
        if (result.success) {
          const normalizedExpenses = (result.expenses || []).map((expense) => ({
            id: expense.id,
            amount: Number(expense.amount),
            merchant: expense.merchant,
            category: expense.category,
            date: expense.date,
            status: expense.status as Expense["status"],
            description: expense.description,
            receiptUrl: expense.receiptUrl,
            job: expense.job
              ? { id: expense.job.id, title: expense.job.title }
              : null,
          }));

          setExpenses(normalizedExpenses);
          if (result.pagination) {
            setPagination(result.pagination);
          }
        } else {
          toast.error(result.error || "Failed to load expenses");
        }
        setIsFetching(false);
      }
    };

    const timer = setTimeout(() => {
      void run();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, categoryFilter, statusFilter, page, pagination.limit]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const res = await deleteExpense(id);
    if (res.success) {
      toast.success("Deleted");
      setExpenses((prev) => prev.filter((expense) => expense.id !== id));
    } else {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 min-h-125 flex flex-col">
      <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search merchant, category, or description"
              className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-md border border-gray-200 px-3 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as
                  | "ALL"
                  | "PENDING_SCAN"
                  | "SCANNED"
                  | "VERIFIED"
                  | "REJECTED",
              )
            }
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING_SCAN">Pending Scan</option>
            <option value="SCANNED">Scanned</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isFetching ? (
          <div className="flex items-center justify-center h-48 text-gray-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-gray-50 p-4 rounded-full mb-4">
              <Receipt className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 font-medium">No expenses found</h3>
            <p className="text-sm text-gray-500 mt-1">
              Add a receipt to get started tracking your costs.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Merchant</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 text-gray-500">
                    {format(new Date(expense.date), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {expense.merchant || "Unknown"}
                    {expense.job?.title ? (
                      <div className="text-xs text-blue-600 font-normal truncate max-w-55">
                        Job: {expense.job.title}
                      </div>
                    ) : null}
                    {expense.description ? (
                      <div className="text-xs text-gray-400 font-normal truncate max-w-55">
                        {expense.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-0"
                    >
                      {expense.category}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                        expense.status,
                      )}`}
                    >
                      {STATUS_LABELS[expense.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                    KES {Number(expense.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-gray-400 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t border-gray-100 p-3 flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {expenses.length} of {pagination.totalCount} expense
          {pagination.totalCount === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || isFetching}
            className="px-3 py-1.5 rounded-md border border-gray-200 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs sm:text-sm">
            Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((prev) =>
                Math.min(Math.max(pagination.totalPages, 1), prev + 1),
              )
            }
            disabled={page >= Math.max(pagination.totalPages, 1) || isFetching}
            className="px-3 py-1.5 rounded-md border border-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
