import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Plus } from "lucide-react";
import { CreatePromoModal } from "@/components/admin/CreatePromoModal";
import { PromoList } from "@/components/admin/PromoList";

export default async function AdminPromosPage() {
  const session = await auth();
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
        _count: {
            select: { bookings: true }
        }
    }
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing & Promotions</h1>
          <p className="text-gray-600">Manage discount codes and vouchers</p>
        </div>
        <CreatePromoModal />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <PromoList promos={promos} />
      </div>
    </div>
  );
}
