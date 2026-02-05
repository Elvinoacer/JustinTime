"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils"; // Assuming these exist, otherwise usage standard Intl
import { TransactionType } from "@prisma/client";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: any; // Decimal
  description: string | null;
  createdAt: Date;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
    if (transactions.length === 0) {
        return <div className="p-8 text-center text-gray-500">No transactions yet.</div>;
    }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="font-medium">
                {formatType(tx.type)}
            </TableCell>
            <TableCell>{tx.description || "-"}</TableCell>
            <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
            <TableCell className={`text-right font-bold ${isNegative(tx.type) ? 'text-red-600' : 'text-green-600'}`}>
              {isNegative(tx.type) ? "-" : "+"} {Number(tx.amount).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatType(type: string) {
    return type.replace(/_/g, " ");
}

function isNegative(type: TransactionType) {
    return ["WITHDRAWAL", "PAYMENT", "CREDIT_PURCHASE", "PROMOTION_PAYMENT", "ONBOARDING_FEE"].includes(type);
}
