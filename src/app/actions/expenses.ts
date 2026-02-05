"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Create Expense
export async function createExpense(data: {
  amount: number;
  merchant?: string;
  category: string;
  date: Date;
  receiptUrl?: string; // Optional URL from upload
  description?: string;
  jobId?: string;
  status?: "PENDING_SCAN" | "SCANNED" | "VERIFIED" | "REJECTED"; // Type-safe string
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    const expense = await prisma.expense.create({
      data: {
        userId: session.user.id,
        amount: data.amount,
        merchant: data.merchant,
        category: data.category,
        date: data.date,
        receiptUrl: data.receiptUrl,
        description: data.description,
        jobId: data.jobId,
        status: (data.status as any) || "VERIFIED", // Default or passed status
      },
    });

    revalidatePath("/dashboard/expenses");
    return { success: true, expense };
  } catch (error) {
    console.error("Create Expense Error:", error);
    return { success: false, error: "Failed to create expense" };
  }
}

// Get Expenses
export async function getExpenses(filters?: { jobId?: string; category?: string; }) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const where: any = { userId: session.user.id };
        if (filters?.jobId) where.jobId = filters.jobId;
        if (filters?.category && filters.category !== "All") where.category = filters.category;

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' },
            include: { job: { select: { title: true } } }
        });

        const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
        
        return { success: true, expenses, totalAmount };
    } catch (error) {
        return { success: false, error: "Failed to fetch expenses" };
    }
}


// Mock AI Scan Receipt
// In a real app, this would send 'fileUrl' to OpenAI Vision or FormRecogniser
export async function scanReceipt(fileUrl: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock data
    // Randomize slightly for demo feel
    const randomAmount = (Math.random() * 100 + 10).toFixed(2);
    const categories = ["Materials", "Food", "Travel", "Equipment"];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    return {
        success: true,
        data: {
            amount: Number(randomAmount),
            merchant: "Hardware Store Ltd",
            date: new Date(),
            category: randomCategory,
            description: "Scanned receipt item"
        }
    };
}

export async function deleteExpense(id: string) {
     const session = await auth();
     if (!session?.user?.id) return { success: false, error: "Unauthorized" };
     
     try {
         await prisma.expense.delete({
             where: { id, userId: session.user.id }
         });
         revalidatePath("/dashboard/expenses");
         return { success: true };
     } catch (e) {
         return { success: false, error: "Failed to delete" };
     }
}
