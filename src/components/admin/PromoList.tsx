"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Power, Trash2 } from "lucide-react";
import {
  deletePromoCodeAction,
  setPromoCodeActiveStateAction,
} from "@/app/actions/promo";
import { useRouter } from "next/navigation";
import { EditPromoModal } from "@/components/admin/EditPromoModal";

interface PromoItem {
  id: string;
  code: string;
  description?: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number | string;
  minOrderAmount?: number | string | null;
  maxDiscountAmount?: number | string | null;
  usageCount: number;
  usageLimit?: number | null;
  perUserLimit: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isActive: boolean;
  _count?: {
    bookings?: number;
  };
}

interface PromoListProps {
  promos: PromoItem[];
}

type PromoStatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "expired"
  | "exhausted";

function isExpired(promo: PromoItem): boolean {
  if (!promo.endDate) {
    return false;
  }

  return new Date() > new Date(promo.endDate);
}

function isExhausted(promo: PromoItem): boolean {
  return promo.usageLimit != null && promo.usageCount >= promo.usageLimit;
}

function formatDecimalValue(value: number | string): string {
  const [integerPartRaw, decimalPartRaw = ""] = String(value).split(".");
  const groupedInteger = Number(integerPartRaw || "0").toLocaleString();
  const trimmedDecimal = decimalPartRaw.replace(/0+$/, "");
  return trimmedDecimal
    ? `${groupedInteger}.${trimmedDecimal}`
    : groupedInteger;
}

export function PromoList({ promos }: PromoListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [promoItems, setPromoItems] = useState(promos);
  const [pendingPromoId, setPendingPromoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PromoStatusFilter>("all");

  useEffect(() => {
    setPromoItems(promos);
  }, [promos]);

  const filteredPromos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return promoItems.filter((promo) => {
      const matchesQuery =
        !query ||
        promo.code.toLowerCase().includes(query) ||
        (promo.description || "").toLowerCase().includes(query);

      if (!matchesQuery) {
        return false;
      }

      if (statusFilter === "all") {
        return true;
      }

      if (statusFilter === "active") {
        return promo.isActive && !isExpired(promo) && !isExhausted(promo);
      }

      if (statusFilter === "inactive") {
        return !promo.isActive;
      }

      if (statusFilter === "expired") {
        return isExpired(promo);
      }

      return isExhausted(promo);
    });
  }, [promoItems, searchTerm, statusFilter]);

  const copyCode = (code: string) => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        toast.success("Code copied!");
      })
      .catch(() => {
        toast.error("Could not copy code");
      });
  };

  const togglePromoStatus = (promo: PromoItem) => {
    const nextState = !promo.isActive;
    setPendingPromoId(promo.id);
    setPromoItems((current) =>
      current.map((item) =>
        item.id === promo.id ? { ...item, isActive: nextState } : item,
      ),
    );

    startTransition(async () => {
      const result = await setPromoCodeActiveStateAction(promo.id, nextState);

      if (!result.success) {
        setPromoItems((current) =>
          current.map((item) =>
            item.id === promo.id ? { ...item, isActive: promo.isActive } : item,
          ),
        );
        toast.error(result.error || "Failed to update promo status");
        setPendingPromoId(null);
        return;
      }

      toast.success(
        nextState ? "Promo code activated" : "Promo code deactivated",
      );
      setPendingPromoId(null);
      router.refresh();
    });
  };

  const deletePromo = (promo: PromoItem) => {
    const shouldDelete = window.confirm(
      `Delete promo ${promo.code}? If it has redemption history, it will be archived instead.`,
    );

    if (!shouldDelete) {
      return;
    }

    setPendingPromoId(promo.id);

    startTransition(async () => {
      const result = await deletePromoCodeAction(promo.id);

      if (!result.success) {
        toast.error(result.error || "Failed to remove promo");
        setPendingPromoId(null);
        return;
      }

      if (result.archived) {
        setPromoItems((current) =>
          current.map((item) =>
            item.id === promo.id ? { ...item, isActive: false } : item,
          ),
        );
        toast.success(result.message || "Promo archived");
      } else {
        setPromoItems((current) =>
          current.filter((item) => item.id !== promo.id),
        );
        toast.success("Promo deleted");
      }

      setPendingPromoId(null);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search promo code or description"
          className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 sm:max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as PromoStatusFilter)
          }
          className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
          <option value="exhausted">Exhausted</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-900">Code</th>
              <th className="px-6 py-4 font-semibold text-gray-900">
                Discount
              </th>
              <th className="px-6 py-4 font-semibold text-gray-900">Usage</th>
              <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-900 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPromos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No promo codes match the current filters.
                </td>
              </tr>
            ) : (
              filteredPromos.map((promo) => (
                <tr
                  key={promo.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
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
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {promo.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-emerald-700">
                      {promo.type === "PERCENTAGE"
                        ? `${formatDecimalValue(promo.value)}% OFF`
                        : `KES ${formatDecimalValue(promo.value)} OFF`}
                    </div>
                    {promo.minOrderAmount && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Min. spend: KES{" "}
                        {formatDecimalValue(promo.minOrderAmount)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">
                      {promo.usageCount}{" "}
                      <span className="text-gray-500">
                        / {promo.usageLimit || "∞"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {promo._count?.bookings || 0} bookings
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {/* Status Badge */}
                    {isExpired(promo) ? (
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
                    <div className="inline-flex items-center gap-1">
                      <EditPromoModal
                        promo={promo}
                        disabled={isPending || pendingPromoId === promo.id}
                      />
                      <button
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          promo.isActive ? "Deactivate promo" : "Activate promo"
                        }
                        onClick={() => togglePromoStatus(promo)}
                        disabled={isPending || pendingPromoId === promo.id}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete or archive promo"
                        onClick={() => deletePromo(promo)}
                        disabled={isPending || pendingPromoId === promo.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
