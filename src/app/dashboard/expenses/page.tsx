import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getExpenses } from "@/app/actions/expenses";
import { Receipt, TrendingUp, FileCheck, Clock3 } from "lucide-react";
import { ExpenseList } from "@/components/expenses/ExpenseList"; // Client component for better interactivity

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Expense Management | JustinTime",
  description: "Track your business expenses",
};

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const result = await getExpenses({ page: 1, limit: 20 });

  const expenses = result.success ? result.expenses || [] : [];
  const totalAmount = result.success ? result.totalAmount || 0 : 0;
  const monthlyAmount = result.success ? result.monthlyAmount || 0 : 0;
  const withReceiptCount = result.success
    ? result.insights?.withReceiptCount || 0
    : 0;
  const pendingCount = result.success
    ? (result.insights?.byStatus?.PENDING_SCAN || 0) +
      (result.insights?.byStatus?.SCANNED || 0)
    : 0;
  const totalCount = result.success ? result.pagination?.totalCount || 0 : 0;
  const normalizedExpenses = expenses.map((expense) => ({
    ...expense,
    amount: Number(expense.amount),
    job: expense.job ? { id: expense.job.id, title: expense.job.title } : null,
  }));

  return (
    <div className="container mx-auto py-8 space-y-8 px-4 md:px-6 max-w-6xl pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Expenses
          </h1>
          <p className="text-gray-500 mt-1">
            Track job costs and receipt scans.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Spend</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                KES {Number(totalAmount).toLocaleString()}
              </h3>
            </div>
            <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">This Month</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                KES {Number(monthlyAmount).toLocaleString()}
              </h3>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">With Receipts</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {withReceiptCount} / {totalCount}
              </h3>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Pending Review
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {pendingCount}
              </h3>
            </div>
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock3 className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <ExpenseList
        initialData={{
          expenses: normalizedExpenses,
          pagination: result.success ? result.pagination : undefined,
          insights: result.success ? result.insights : undefined,
        }}
      />
    </div>
  );
}
