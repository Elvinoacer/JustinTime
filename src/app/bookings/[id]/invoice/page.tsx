import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/financials";
import { TAX_RATES } from "@/lib/etims/tax-calculator";
import { redirect } from "next/navigation";
import Link from "next/link";
import PrintInvoiceButton from "@/components/invoices/PrintInvoiceButton";

export default async function InvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const bookingId = params.id;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      invoice: true,
      provider: {
        select: {
          name: true,
          email: true,
          taxSettings: {
            select: {
              kraPin: true,
              businessName: true,
            },
          },
        },
      },
      client: {
        select: {
          name: true,
          email: true,
        },
      },
      service: {
        select: {
          title: true,
          description: true,
        },
      },
      job: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!booking) {
    return (
      <div className="p-8 text-center text-red-500">Booking not found</div>
    );
  }

  // Ensure user is authorized (client or provider or admin)
  if (
    booking.clientId !== session.user.id &&
    booking.providerId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    return <div className="p-8 text-center text-red-500">Unauthorized</div>;
  }

  const invoice = booking.invoice;

  if (!invoice) {
    return (
      <div className="p-8 text-center text-amber-500">
        Invoice not yet generated for this booking.
      </div>
    );
  }

  const sellerPin =
    invoice.sellerPin || booking.provider.taxSettings?.kraPin || "Not provided";
  const providerDisplayName =
    booking.provider.taxSettings?.businessName || booking.provider.name;
  const backHref =
    session.user.role === "ADMIN"
      ? "/admin/bookings"
      : session.user.role === "CLIENT"
        ? "/client/bookings"
        : "/dashboard/bookings";
  const exciseRateLabel = `${(TAX_RATES.EXCISE_DUTY * 100).toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-gray-100 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-600 px-4 py-5 text-white sm:px-8 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wide sm:text-2xl">
                Tax Invoice
              </h1>
              <p className="text-emerald-100 text-sm mt-1">
                JustInTime Systems Ltd
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-mono font-medium text-lg">{invoice.number}</p>
              <p className="text-emerald-100 text-sm">
                Date: {invoice.createdAt.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          {/* Parties */}
          <div className="flex flex-col sm:flex-row justify-between mb-8 gap-6">
            <div className="w-full sm:w-1/2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Billed To
              </h3>
              <div className="text-gray-800 font-medium">
                {booking.client.name}
              </div>
              <div className="text-gray-500 text-sm">
                {booking.client.email}
              </div>
              <div className="text-gray-500 text-sm">{booking.clientPhone}</div>
              <div className="text-gray-500 text-sm whitespace-pre-wrap">
                {booking.clientAddress}
              </div>
            </div>
            <div className="w-full sm:w-1/2 sm:text-right">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Professional
              </h3>
              <div className="text-gray-800 font-medium">
                {providerDisplayName}
              </div>
              <div className="text-gray-500 text-sm">
                {booking.provider.email}
              </div>
              <div className="text-gray-500 text-sm">PIN: {sellerPin}</div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <div className="border-b-2 border-gray-200 pb-2 mb-2 flex text-xs font-bold text-gray-500 uppercase tracking-wider">
              <div className="flex-1">Description</div>
              <div className="w-24 text-right sm:w-32">Amount</div>
            </div>
            <div className="flex py-2 border-b border-gray-100 text-gray-700">
              <div className="flex-1">
                <p className="font-medium">
                  {booking.service?.title || booking.job?.title || "Service"}
                </p>
                <p className="text-xs text-gray-500">
                  {booking.service?.description?.substring(0, 100)}
                </p>
              </div>
              <div className="w-24 text-right font-mono sm:w-32">
                {formatCurrency(Number(invoice.subtotal))}
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-12">
            <div className="w-full space-y-2 sm:w-64">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(Number(invoice.subtotal))}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>VAT (16%)</span>
                <span className="font-mono">
                  {formatCurrency(Number(invoice.vatAmount))}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Excise Duty ({exciseRateLabel})</span>
                <span className="font-mono">
                  {formatCurrency(Number(invoice.exciseDuty))}
                </span>
              </div>
              {Number(invoice.withholdingTax) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Withholding Tax (5%)</span>
                  <span className="font-mono">
                    {formatCurrency(Number(invoice.withholdingTax))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 border-t-2 border-gray-200 pt-2">
                <span>Total</span>
                <span className="font-mono">
                  {formatCurrency(Number(invoice.totalAmount))}
                </span>
              </div>
            </div>
          </div>

          {/* eTIMS Footer */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6">
            <div className="bg-white p-2 rounded border border-gray-200 shadow-sm shrink-0">
              {invoice.etimsQrUrl && (
                // Use standard img tag if external URL or Image if strictly internal
                <img
                  src={invoice.etimsQrUrl}
                  alt="eTIMS QR Code"
                  className="w-32 h-32 object-contain"
                />
              )}
            </div>
            <div className="flex-1 space-y-2 text-center md:text-left">
              <h4 className="font-bold text-gray-800 flex items-center justify-center md:justify-start gap-2">
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded">
                  VERIFIED
                </span>
                eTIMS Compliant
              </h4>
              <div className="space-y-1 text-xs font-mono text-gray-600">
                <p>
                  <span className="font-bold">CU Serial:</span>{" "}
                  {invoice.etimsCuNumber}
                </p>
                <p className="break-all">
                  <span className="font-bold">Signature:</span>{" "}
                  {invoice.etimsSignature}
                </p>
              </div>
              <p className="text-xs text-gray-500 italic mt-2">
                This invoice is generated automatically by JustInTime Systems.
              </p>
            </div>
          </div>

          <div className="mt-8 print:hidden flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            <Link
              href={backHref}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              &larr; Back to Bookings
            </Link>
            <PrintInvoiceButton />
          </div>
        </div>
      </div>
    </div>
  );
}
