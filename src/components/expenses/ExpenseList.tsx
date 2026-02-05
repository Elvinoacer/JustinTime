"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Receipt, Search, Trash2, Filter } from "lucide-react";
import { AddExpenseModal } from "./AddExpenseModal";
import { Button } from "@/components/ui/button";
import { deleteExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface Expense {
  id: string;
  amount: number | any; // Prisma Decimal
  merchant: string | null;
  category: string;
  date: Date;
  status: string;
  description: string | null;
  job?: { title: string } | null;
}

export function ExpenseList({ initialExpenses }: { initialExpenses: Expense[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const res = await deleteExpense(id);
    if (res.success) {
        toast.success("Deleted");
        router.refresh(); // Refresh list
    } else {
        toast.error("Failed to delete");
    }
  };

  const filteredExpenses = initialExpenses.filter(exp => 
    (exp.merchant?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    exp.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 min-h-[500px] flex flex-col">
       {/* Header / Actions */}
       <div className="p-4 border-b border-gray-100 flex justify-between items-center gap-4">
           <div className="relative flex-1 max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
               <input 
                   type="text" 
                   placeholder="Search expenses..." 
                   className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
               />
           </div>
           <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
               <Plus className="h-4 w-4" /> Add Expense
           </Button>
       </div>

       {/* List */}
       <div className="flex-1 overflow-auto">
           {filteredExpenses.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center p-8">
                   <div className="bg-gray-50 p-4 rounded-full mb-4">
                       <Receipt className="h-8 w-8 text-gray-400" />
                   </div>
                   <h3 className="text-gray-900 font-medium">No expenses found</h3>
                   <p className="text-sm text-gray-500 mt-1">Add a receipt to get started tracking your costs.</p>
               </div>
           ) : (
               <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                       <tr>
                           <th className="px-6 py-3">Date</th>
                           <th className="px-6 py-3">Merchant</th>
                           <th className="px-6 py-3">Category</th>
                           <th className="px-6 py-3 text-right">Amount</th>
                           <th className="px-6 py-3 text-center">Actions</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                       {filteredExpenses.map((expense) => (
                           <tr key={expense.id} className="hover:bg-gray-50/50 transition">
                               <td className="px-6 py-4 text-gray-500">
                                   {format(new Date(expense.date), "MMM d, yyyy")}
                               </td>
                               <td className="px-6 py-4 font-medium text-gray-900">
                                   {expense.merchant || "Unknown"}
                                   {expense.description && <div className="text-xs text-gray-400 font-normal truncate max-w-[150px]">{expense.description}</div>}
                               </td>
                               <td className="px-6 py-4">
                                   <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-0">
                                       {expense.category}
                                   </Badge>
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
       
       <AddExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
