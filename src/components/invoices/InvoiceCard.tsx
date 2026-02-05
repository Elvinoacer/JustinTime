"use client";

import { formatTaxAmount } from "@/lib/etims/tax-calculator";
import { FileText, Download, RefreshCw, Check, X, Clock } from "lucide-react";

interface InvoiceCardProps {
  invoice: {
    id: string;
    number: string;
    status: string;
    subtotal: any;
    vatAmount: any;
    exciseDuty: any;
    totalAmount: any;
    etimsCuNumber?: string | null;
    etimsQrUrl?: string | null;
    createdAt: Date | string;
    booking?: {
      service?: { title: string } | null;
      client?: { name: string | null } | null;
      provider?: { name: string | null } | null;
    };
  };
  onRetry?: (invoiceId: string) => void;
  isRetrying?: boolean;
}

const STATUS_CONFIG = {
  GENERATED: { label: 'Generated', icon: Clock, color: 'text-gray-600 bg-gray-100' },
  SUBMITTED: { label: 'Submitted', icon: Clock, color: 'text-blue-600 bg-blue-100' },
  CONFIRMED: { label: 'Confirmed', icon: Check, color: 'text-emerald-600 bg-emerald-100' },
  FAILED: { label: 'Failed', icon: X, color: 'text-red-600 bg-red-100' },
  CANCELLED: { label: 'Cancelled', icon: X, color: 'text-gray-600 bg-gray-100' }
};

export function InvoiceCard({ invoice, onRetry, isRetrying }: InvoiceCardProps) {
  const status = STATUS_CONFIG[invoice.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.GENERATED;
  const StatusIcon = status.icon;
  const date = new Date(invoice.createdAt);

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
              {date.toLocaleDateString('en-KE', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
        
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
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
            <p className="font-medium text-gray-900">{invoice.booking.service.title}</p>
          </div>
        )}
        
        {/* Amount Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Subtotal</p>
            <p className="text-lg font-semibold text-gray-900">{formatTaxAmount(Number(invoice.subtotal))}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold text-emerald-600">{formatTaxAmount(Number(invoice.totalAmount))}</p>
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
            <p className="text-xs text-blue-600 font-medium">eTIMS Control Unit</p>
            <p className="text-sm text-blue-800 font-mono truncate">{invoice.etimsCuNumber}</p>
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
      </div>
      
      {/* Footer Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
        <a 
          href={`/bookings/${invoice.booking ? invoice.id : ''}/invoice`}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          View Invoice
        </a>
        
        {invoice.status === 'FAILED' && onRetry && (
          <button
            onClick={() => onRetry(invoice.id)}
            disabled={isRetrying}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
