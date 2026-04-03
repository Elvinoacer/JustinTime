"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma, type ExpenseStatus } from "@/generated/prisma/client";

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
    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" };
    }

    if (data.jobId) {
      const linkedJob = await prisma.job.findFirst({
        where: {
          id: data.jobId,
          OR: [
            { clientId: session.user.id },
            { bookings: { some: { providerId: session.user.id } } },
            {
              proposals: {
                some: {
                  providerId: session.user.id,
                  status: "ACCEPTED",
                },
              },
            },
          ],
        },
        select: { id: true },
      });

      if (!linkedJob) {
        return {
          success: false,
          error: "Invalid job reference for this account",
        };
      }
    }

    const requestedStatus = data.status;
    let normalizedStatus: ExpenseStatus = "PENDING_SCAN";

    if (requestedStatus === "REJECTED") {
      normalizedStatus = "REJECTED";
    } else if (requestedStatus === "SCANNED" && data.receiptUrl) {
      normalizedStatus = "SCANNED";
    } else if (requestedStatus === "VERIFIED" && data.receiptUrl) {
      normalizedStatus = "VERIFIED";
    }

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
        status: normalizedStatus,
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
export async function getExpenses(filters?: {
  jobId?: string;
  category?: string;
  status?: "PENDING_SCAN" | "SCANNED" | "VERIFIED" | "REJECTED";
  search?: string;
  page?: number;
  limit?: number;
  fromDate?: Date;
  toDate?: Date;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    const page = Math.max(1, Number(filters?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(filters?.limit || 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = { userId: session.user.id };
    if (filters?.jobId) where.jobId = filters.jobId;
    if (filters?.category && filters.category !== "All")
      where.category = filters.category;
    if (filters?.status) where.status = filters.status;

    if (filters?.search) {
      where.OR = [
        { merchant: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { category: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.fromDate || filters?.toDate) {
      where.date = {};
      if (filters.fromDate) where.date.gte = filters.fromDate;
      if (filters.toDate) where.date.lte = filters.toDate;
    }

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const [
      expenses,
      totalCount,
      totalAgg,
      monthlyAgg,
      categoryGroups,
      statusGroups,
      withReceiptCount,
    ] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
        include: { job: { select: { id: true, title: true } } },
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          ...where,
          date: {
            gte: thisMonthStart,
          },
        },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ["category"],
        where,
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
        take: 5,
      }),
      prisma.expense.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      prisma.expense.count({
        where: {
          ...where,
          receiptUrl: {
            not: null,
          },
        },
      }),
    ]);
    const totalAmount = Number(totalAgg._sum.amount || 0);
    const monthlyAmount = Number(monthlyAgg._sum.amount || 0);
    const statusSummary = Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count._all]),
    );

    return {
      success: true,
      expenses,
      totalAmount,
      monthlyAmount,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      insights: {
        withReceiptCount,
        withoutReceiptCount: Math.max(totalCount - withReceiptCount, 0),
        byCategory: categoryGroups.map((group) => ({
          category: group.category,
          count: group._count._all,
          amount: Number(group._sum.amount || 0),
        })),
        byStatus: statusSummary,
      },
    };
  } catch (error) {
    console.error("Get Expenses Error:", error);
    return { success: false, error: "Failed to fetch expenses" };
  }
}

function parseReceiptDate(rawText: string): Date | null {
  const patterns = [
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/,
  ];

  for (const pattern of patterns) {
    const match = rawText.match(pattern);
    if (!match) continue;

    if (pattern === patterns[0]) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const candidate = new Date(year, month, day);
      if (!Number.isNaN(candidate.getTime())) return candidate;
      continue;
    }

    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const candidate = new Date(year, month, day);
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }

  return null;
}

function parseReceiptAmount(rawText: string): number {
  const amountRegex =
    /(?:kes|ksh|usd|eur|total|amount)?\s*[:=-]?\s*(\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2}))/gi;
  const matches = Array.from(rawText.matchAll(amountRegex));

  if (matches.length === 0) return 0;

  const parseCurrencyToken = (token: string) => {
    const normalized =
      token.includes(",") && token.includes(".")
        ? token.replace(/,/g, "")
        : token.replace(",", ".");
    return Number(normalized);
  };

  const values = matches
    .map((match) => parseCurrencyToken(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) return 0;
  return Math.max(...values);
}

function parseReceiptMerchant(rawText: string): string {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const blockedWords = [
    "receipt",
    "tax",
    "invoice",
    "total",
    "subtotal",
    "vat",
  ];

  const candidate = lines.find((line) => {
    const lower = line.toLowerCase();
    return (
      line.length >= 3 &&
      !blockedWords.some((blocked) => lower.includes(blocked))
    );
  });

  return candidate || "";
}

function inferFromFileName(fileName: string) {
  const amountMatch = fileName.match(
    /(?:kes|ksh|usd)?[_-]?(\d+(?:[.,]\d{2})?)/i,
  );
  const inferredAmount = amountMatch
    ? Number(amountMatch[1].replace(",", "."))
    : 0;

  const merchantCandidate = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/\d+/g, "")
    .replace(/[_-]+/g, " ")
    .trim();

  return {
    amount: inferredAmount,
    merchant: merchantCandidate || "",
  };
}

async function extractViaOcrProvider(fileUrl: string) {
  const ocrApiKey = process.env.OCR_SPACE_API_KEY;
  if (!ocrApiKey) return null;

  const requestBody = new URLSearchParams({
    url: fileUrl,
    language: "eng",
    isOverlayRequired: "false",
    OCREngine: "2",
  });

  const response = await fetch("https://api.ocr.space/parse/imageurl", {
    method: "POST",
    headers: {
      apikey: ocrApiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestBody.toString(),
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data || data.IsErroredOnProcessing) return null;

  const parsedText = Array.isArray(data.ParsedResults)
    ? data.ParsedResults.map(
        (result: { ParsedText?: string }) => result.ParsedText || "",
      )
        .join("\n")
        .trim()
    : "";

  if (!parsedText) return null;

  const amount = parseReceiptAmount(parsedText);
  const merchant = parseReceiptMerchant(parsedText);
  const date = parseReceiptDate(parsedText) || new Date();

  return {
    amount,
    merchant,
    date,
    rawText: parsedText,
  };
}

// Receipt scan with OCR provider integration and resilient fallback.
export async function scanReceipt(fileUrl: string) {
  try {
    if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) {
      return {
        success: false,
        error: "A valid uploaded receipt URL is required",
      };
    }

    const parsedUrl = new URL(fileUrl);
    const fileName = decodeURIComponent(
      parsedUrl.pathname.split("/").pop() || "receipt",
    );
    const fallback = inferFromFileName(fileName);
    let ocrResult: Awaited<ReturnType<typeof extractViaOcrProvider>> = null;

    try {
      ocrResult = await extractViaOcrProvider(fileUrl);
    } catch (ocrError) {
      console.warn(
        "Receipt OCR provider unavailable, using fallback:",
        ocrError,
      );
    }

    const amount =
      ocrResult && ocrResult.amount > 0 ? ocrResult.amount : fallback.amount;
    const merchant =
      ocrResult && ocrResult.merchant ? ocrResult.merchant : fallback.merchant;

    return {
      success: true,
      requiresReview: true,
      confidence:
        ocrResult && amount > 0 ? "HIGH" : amount > 0 ? "MEDIUM" : "LOW",
      data: {
        amount,
        merchant,
        date: ocrResult?.date || new Date(),
        category: "Uncategorized",
        description: ocrResult
          ? `Receipt analyzed via OCR (${fileName}). Please confirm extracted fields.`
          : `Receipt uploaded (${fileName}). OCR is unavailable, so metadata-based extraction was used. Please verify fields before saving.`,
        receiptUrl: fileUrl,
      },
    };
  } catch (error) {
    console.error("Scan Receipt Error:", error);
    return { success: false, error: "Unable to analyze receipt metadata" };
  }
}

export async function deleteExpense(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    await prisma.expense.delete({
      where: { id, userId: session.user.id },
    });
    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete" };
  }
}
