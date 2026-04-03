"use client";

import { useState } from "react";
import { formatTaxAmount } from "@/lib/etims/tax-calculator";
import {
  FileText,
  RefreshCw,
  Check,
  X,
  Clock,
  ExternalLink,
} from "lucide-react";
import { retryInvoiceSubmission } from "@/app/actions/invoice";
import { toast } from "sonner";

interface InvoiceCardProps {
  invoice: {
    id: string;
    bookingId: string;
    number: string;
    status: string;
    subtotal: any;
    vatAmount: any;
    exciseDuty: any;
    totalAmount: any;
    etimsCuNumber?: string | null;
    etimsQrUrl?: string | null;
    createdAt: Date | string;
    submissions?: Array<{
      id: string;
      success: boolean;
      errorMessage?: string | null;
      submittedAt: Date | string;
      submissionType: string;
    }>;
    _count?: {
      submissions: number;
    };
    booking?: {
      id: string;
      providerId: string;
      clientId: string;
      service?: { title: string } | null;
      client?: { name: string | null } | null;
      provider?: { name: string | null } | null;
    };
  };
  viewerUserId?: string;
  onRetry?: (invoiceId: string) => void | Promise<void>;
  isRetrying?: boolean;
}

const STATUS_CONFIG = {
  GENERATED: {
    label: "Generated",
    icon: Clock,
    color: "text-gray-600 bg-gray-100",
  },
  SUBMITTED: {
    label: "Submitted",
    icon: Clock,
    color: "text-blue-600 bg-blue-100",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: Check,
    color: "text-emerald-600 bg-emerald-100",
  },
  FAILED: { label: "Failed", icon: X, color: "text-red-600 bg-red-100" },
  CANCELLED: {
    label: "Cancelled",
    icon: X,
    color: "text-gray-600 bg-gray-100",
  },
};

export function InvoiceCard({
  invoice,
  viewerUserId,
  onRetry,
  isRetrying,
}: InvoiceCardProps) {
  const [isRetryingLocal, setIsRetryingLocal] = useState(false);
  const status =
    STATUS_CONFIG[invoice.status as keyof typeof STATUS_CONFIG] ||
    STATUS_CONFIG.GENERATED;
  const StatusIcon = status.icon;
  const date = new Date(invoice.createdAt);
  const latestSubmission = invoice.submissions?.[0];
  const retryAttempts = invoice._count?.submissions ?? 0;
  const retryBusy = Boolean(isRetrying || isRetryingLocal);

  const roleIntent =
    invoice.booking && viewerUserId
      ? invoice.booking.providerId === viewerUserId
        ? "Issued"
        : invoice.booking.clientId === viewerUserId
          ? "Received"
          : null
      : null;

  const handleRetry = async () => {
    if (onRetry) {
      await onRetry(invoice.id);
      return;
    }

    setIsRetryingLocal(true);
    try {
      const result = await retryInvoiceSubmission(invoice.id);
      if (result.success) {
        toast.success("Invoice submission retried successfully");
      } else {
        toast.error(result.error || "Retry failed");
      }
    } catch {
      toast.error("Retry failed");
    } finally {
      setIsRetryingLocal(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{invoice.number}</h3>
            <p className="text-sm text-gray-500">
              {date.toLocaleDateString("en-KE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}
        >
          <StatusIcon className="h-4 w-4" />
          {status.label}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Service Info */}
        {invoice.booking?.service && (
          <div className="mb-4">
            <p className="text-sm text-gray-500">Service</p>
            <p className="font-medium text-gray-900">
              {invoice.booking.service.title}
            </p>
            {roleIntent && (
              <p className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {roleIntent}
              </p>
            )}
          </div>
        )}

        {/* Amount Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Subtotal
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {formatTaxAmount(Number(invoice.subtotal))}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Total
            </p>
            <p className="text-lg font-bold text-emerald-600">
              {formatTaxAmount(Number(invoice.totalAmount))}
            </p>
          </div>
        </div>

        {/* Tax Details */}
        <div className="text-sm text-gray-500 space-y-1 mb-4">
          {Number(invoice.vatAmount) > 0 && (
            <div className="flex justify-between">
              <span>VAT (16%)</span>
              <span>{formatTaxAmount(Number(invoice.vatAmount))}</span>
            </div>
          )}
          {Number(invoice.exciseDuty) > 0 && (
            <div className="flex justify-between">
              <span>Excise Duty</span>
              <span>{formatTaxAmount(Number(invoice.exciseDuty))}</span>
            </div>
          )}
        </div>

        {/* eTIMS Info */}
        {invoice.etimsCuNumber && (
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-600 font-medium">
              eTIMS Control Unit
            </p>
            <p className="text-sm text-blue-800 font-mono truncate">
              {invoice.etimsCuNumber}
            </p>
          </div>
        )}

        {/* QR Code Preview */}
        {invoice.etimsQrUrl && (
          <div className="flex justify-center mb-4">
            <img
              src={invoice.etimsQrUrl}
              alt="eTIMS QR Code"
              className="w-24 h-24 object-contain"
            />
          </div>
        )}

        {invoice.status === "FAILED" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">Submission failed</p>
            <p className="mt-1 text-xs text-red-600">
              {latestSubmission?.errorMessage ||
                "No error details were returned by eTIMS."}
            </p>
            {retryAttempts > 0 && (
              <p className="mt-2 text-xs text-red-600">
                Attempts: {retryAttempts} • Last attempt:{" "}
                {latestSubmission
                  ? new Date(latestSubmission.submittedAt).toLocaleString(
                      "en-KE",
                    )
                  : "N/A"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
        <a
          href={
            invoice.bookingId ? `/bookings/${invoice.bookingId}/invoice` : "#"
          }
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <ExternalLink className="h-4 w-4" />
          Open Invoice
        </a>

        {invoice.status === "FAILED" && onRetry && (
          <button
            onClick={handleRetry}
            disabled={retryBusy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${retryBusy ? "animate-spin" : ""}`}
            />
            Retry
          </button>
        )}

        {invoice.status === "FAILED" && !onRetry && (
          <button
            onClick={handleRetry}
            disabled={retryBusy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${retryBusy ? "animate-spin" : ""}`}
            />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
