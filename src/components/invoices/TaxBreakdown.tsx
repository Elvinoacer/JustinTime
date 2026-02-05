"use client";

import { formatTaxAmount } from "@/lib/etims/tax-calculator";

interface TaxBreakdownProps {
  subtotal: number;
  vatAmount: number;
  exciseDuty: number;
  withholdingTax?: number;
  totalAmount: number;
  className?: string;
}

export function TaxBreakdown({
  subtotal,
  vatAmount,
  exciseDuty,
  withholdingTax = 0,
  totalAmount,
  className = ""
}: TaxBreakdownProps) {
  const vatPercent = subtotal > 0 ? ((vatAmount / subtotal) * 100).toFixed(0) : 0;
  const excisePercent = subtotal > 0 ? ((exciseDuty / subtotal) * 100).toFixed(1) : 0;

  return (
    <div className={`bg-gray-50 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Breakdown</h3>
      
      <div className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium text-gray-900">{formatTaxAmount(subtotal)}</span>
        </div>
        
        {/* VAT */}
        {vatAmount > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">VAT</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {vatPercent}%
              </span>
            </div>
            <span className="text-gray-700">{formatTaxAmount(vatAmount)}</span>
          </div>
        )}
        
        {/* Excise Duty */}
        {exciseDuty > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Excise Duty</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {excisePercent}%
              </span>
            </div>
            <span className="text-gray-700">{formatTaxAmount(exciseDuty)}</span>
          </div>
        )}
        
        {/* Withholding Tax */}
        {withholdingTax > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Withholding Tax</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                5%
              </span>
            </div>
            <span className="text-gray-700">-{formatTaxAmount(withholdingTax)}</span>
          </div>
        )}
        
        {/* Divider */}
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-emerald-600">{formatTaxAmount(totalAmount)}</span>
          </div>
        </div>
      </div>
      
      {/* KRA Compliance Notice */}
      <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>KRA eTIMS Compliant Invoice</span>
        </div>
      </div>
    </div>
  );
}
