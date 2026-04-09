"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionType } from "@/generated/prisma/client";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number | string | { toString(): string };
  description: string | null;
  status?: string;
  direction?: "CREDIT" | "DEBIT" | null;
  providerRef?: string | null;
  gatewayReference?: string | null;
  createdAt: Date;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">No transactions yet.</div>
    );
  }

  return (
    <>
      <div className="divide-y divide-gray-100 md:hidden">
        {transactions.map((tx) => {
          const debit = isDebit(tx);

          return (
            <div key={tx.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {formatType(tx.type)}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {tx.description || "-"}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(
                    tx.status,
                  )}`}
                >
                  {statusLabel(tx.status)}
                </span>
              </div>

              <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
                <span className="text-gray-500">Reference</span>
                <span className="truncate text-right text-gray-700">
                  {referenceFor(tx)}
                </span>
                <span className="text-gray-500">Date</span>
                <span className="text-right text-gray-700">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </span>
                <span className="text-gray-500">Amount</span>
                <span
                  className={`text-right font-semibold ${
                    debit ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {debit ? "-" : "+"} {Number(tx.amount).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const debit = isDebit(tx);

              return (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {formatType(tx.type)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(
                        tx.status,
                      )}`}
                    >
                      {statusLabel(tx.status)}
                    </span>
                  </TableCell>
                  <TableCell>{tx.description || "-"}</TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {referenceFor(tx)}
                  </TableCell>
                  <TableCell>
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell
                    className={`whitespace-nowrap text-right font-bold ${
                      debit ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {debit ? "-" : "+"} {Number(tx.amount).toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function formatType(type: string) {
  return type.replace(/_/g, " ");
}

function statusLabel(status?: string): string {
  if (!status) {
    return "Confirmed";
  }

  switch (status) {
    case "SETTLED":
      return "Confirmed";
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "FAILED":
      return "Failed";
    case "REVERSED":
      return "Reversed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function statusTone(status?: string): string {
  switch (status) {
    case "SETTLED":
    case undefined:
      return "bg-emerald-100 text-emerald-700";
    case "PENDING":
    case "PROCESSING":
      return "bg-amber-100 text-amber-700";
    case "FAILED":
    case "REVERSED":
      return "bg-red-100 text-red-700";
    case "CANCELLED":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function isDebit(transaction: Transaction) {
  if (transaction.direction) {
    return transaction.direction === "DEBIT";
  }

  return [
    "WITHDRAWAL",
    "PAYMENT",
    "CREDIT_PURCHASE",
    "PROMOTION_PAYMENT",
    "ONBOARDING_FEE",
  ].includes(transaction.type);
}

function referenceFor(transaction: Transaction) {
  if (transaction.gatewayReference) {
    return transaction.gatewayReference;
  }

  if (transaction.providerRef) {
    const parts = transaction.providerRef.split(":");
    return parts[parts.length - 1] || transaction.providerRef;
  }

  return "-";
}
