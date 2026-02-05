"use client";

import { toast } from "sonner";
import { Copy, Trash } from "lucide-react";

interface PromoListProps {
  promos: any[];
}

export function PromoList({ promos }: PromoListProps) {
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 font-semibold text-gray-900">Code</th>
            <th className="px-6 py-4 font-semibold text-gray-900">Discount</th>
            <th className="px-6 py-4 font-semibold text-gray-900">Usage</th>
            <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
            <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {promos.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                No promo codes found. Create one to get started.
              </td>
            </tr>
          ) : (
            promos.map((promo) => (
              <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                      {promo.code}
                    </span>
                    <button
                      onClick={() => copyCode(promo.code)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {promo.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{promo.description}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-emerald-700">
                    {promo.type === "PERCENTAGE" ? `${promo.value}% OFF` : `KES ${Number(promo.value).toLocaleString()} OFF`}
                  </div>
                  {promo.minOrderAmount && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      Min. spend: KES {Number(promo.minOrderAmount).toLocaleString()}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900">
                    {promo.usageCount} <span className="text-gray-500">/ {promo.usageLimit || "∞"}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {promo.bookings?.length || 0} bookings
                  </div>
                </td>
                <td className="px-6 py-4">
                  {/* Status Badge */}
                  {new Date() > new Date(promo.endDate || 9999999999999) ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      Expired
                    </span>
                  ) : !promo.isActive ? (
                     <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                      Inactive
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                    <button 
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-red-600"
                        title="Deactivate (Demo)"
                        onClick={() => toast.info("Deactivation not implemented yet")}
                    >
                        <Trash className="w-4 h-4" />
                    </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
