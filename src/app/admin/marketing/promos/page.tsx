import prisma from "@/lib/prisma";
import { CreatePromoModal } from "@/components/admin/CreatePromoModal";
import { PromoList } from "@/components/admin/PromoList";
import Link from "next/link";

export default async function AdminPromosPage() {
  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { bookings: true },
      },
    },
  });

  const normalizedPromos = promos.map((promo) => ({
    ...promo,
    value: promo.value.toString(),
    minOrderAmount:
      promo.minOrderAmount == null ? null : promo.minOrderAmount.toString(),
    maxDiscountAmount:
      promo.maxDiscountAmount == null
        ? null
        : promo.maxDiscountAmount.toString(),
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Marketing & Promotions
          </h1>
          <p className="text-gray-600">Manage discount codes and vouchers</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/marketing/events"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Event Logs
          </Link>
          <CreatePromoModal />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <PromoList promos={normalizedPromos} />
      </div>
    </div>
  );
}
