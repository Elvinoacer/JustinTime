import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInvoiceHistory, getInvoiceStats } from "@/app/actions/invoice";
import { InvoiceCard } from "@/components/invoices/InvoiceCard";
import { FileText, TrendingUp, Receipt, AlertCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface InvoiceSearchParams {
  page?: string;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<InvoiceSearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page || "1") || 1);

  const [historyResult, statsResult] = await Promise.all([
    getInvoiceHistory(currentPage, 20),
    getInvoiceStats(),
  ]);

  if (!historyResult.success || !statsResult.success) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-red-600">Failed to load invoice data</p>
      </div>
    );
  }

  const { invoices, total, pages } = historyResult;
  const stats = statsResult;
  const totalPages = pages || 1;

  const formatAmount = (amount: number | undefined) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount || 0);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📄 Tax-Compliant Invoices
        </h1>
        <p className="text-gray-600">
          All your eTIMS-compliant invoices for KRA tax deductions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <FileText className="h-8 w-8" />
            <span className="text-2xl font-bold">
              {stats.totalInvoices || 0}
            </span>
          </div>
          <p className="text-emerald-100 text-sm font-medium">Total Invoices</p>
        </div>

        <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8" />
            <span className="text-xl font-bold">
              {formatAmount(stats.totalAmount)}
            </span>
          </div>
          <p className="text-blue-100 text-sm font-medium">Total Invoiced</p>
        </div>

        <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Receipt className="h-8 w-8" />
            <span className="text-xl font-bold">
              {formatAmount(stats.totalVAT)}
            </span>
          </div>
          <p className="text-purple-100 text-sm font-medium">Total VAT</p>
        </div>

        <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="h-8 w-8" />
            <span className="text-xl font-bold">
              {formatAmount(stats.totalExcise)}
            </span>
          </div>
          <p className="text-orange-100 text-sm font-medium">Excise Duty</p>
        </div>
      </div>

      {/* Tax Settings Banner */}
      <div className="bg-linear-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Configure Your Tax Settings
            </h3>
            <p className="text-sm text-gray-600">
              Add your KRA PIN and TCC to enable verified tax-compliant
              invoicing
            </p>
          </div>
          <Link
            href="/dashboard/settings/tax"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            Configure Tax Settings
          </Link>
        </div>
      </div>

      {/* Invoice List */}
      {invoices && invoices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invoices.map((invoice: any) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              viewerUserId={session.user.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Invoices Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Complete your first booking to generate a tax-compliant invoice
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            Browse Jobs
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-sm text-gray-600">
          <p>
            Showing page {currentPage} of {totalPages} ({total} invoices)
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={
                currentPage > 1
                  ? `/dashboard/invoices?page=${currentPage - 1}`
                  : "#"
              }
              aria-disabled={currentPage <= 1}
              className={`rounded-lg border px-4 py-2 font-medium transition-colors ${
                currentPage > 1
                  ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                  : "cursor-not-allowed border-gray-200 text-gray-400"
              }`}
            >
              Previous
            </Link>
            <Link
              href={
                currentPage < totalPages
                  ? `/dashboard/invoices?page=${currentPage + 1}`
                  : "#"
              }
              aria-disabled={currentPage >= totalPages}
              className={`rounded-lg border px-4 py-2 font-medium transition-colors ${
                currentPage < totalPages
                  ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                  : "cursor-not-allowed border-gray-200 text-gray-400"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
