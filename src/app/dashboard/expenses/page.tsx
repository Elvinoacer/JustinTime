import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getExpenses } from "@/app/actions/expenses";
import { Plus, Receipt, TrendingUp, Filter } from "lucide-react";
import { format } from "date-fns";
import { ExpenseList } from "@/components/expenses/ExpenseList"; // Client component for better interactivity

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Expense Management | JustinTime",
  description: "Track your business expenses",
};

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { expenses, totalAmount } = await getExpenses();

  return (
    <div className="container mx-auto py-8 space-y-8 px-4 md:px-6 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-gray-900">Expenses</h1>
           <p className="text-gray-500 mt-1">Track job costs and receipt scans.</p>
        </div>
        <ExpenseList initialExpenses={expenses || []} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">Total Spend</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">KES {totalAmount?.toLocaleString() ?? "0"}</h3>
                </div>
                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
            </div>
        </div>
        
        {/* Placeholder for future stats */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm opacity-60">
             <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">Materials (Est.)</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">---</h3>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-blue-600" />
                </div>
            </div>
        </div>
      </div>

      {/* List handled by Client Component for Modal state */}
      
    </div>
  );
}
