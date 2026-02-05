"use server";

import { validatePromoCode } from "@/lib/promo";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { PromoType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function validatePromoCodeAction(code: string, amount: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { isValid: false, discountAmount: 0, error: "Please log in to use promo codes" };
  }

  return await validatePromoCode(code, session.user.id, amount);
}

export async function createPromoCodeAction(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    const code = formData.get("code") as string;
    const type = formData.get("type") as PromoType;
    const value = Number(formData.get("value"));
    const minOrder = formData.get("minOrder") ? Number(formData.get("minOrder")) : undefined;
    const limit = formData.get("limit") ? Number(formData.get("limit")) : undefined;
    const description = formData.get("description") as string;

    if (!code || !type || isNaN(value)) {
        return { success: false, error: "Missing required fields" };
    }

    await prisma.promoCode.create({
        data: {
            code: code.toUpperCase(),
            type,
            value,
            minOrderAmount: minOrder,
            usageLimit: limit,
            description,
            isActive: true,
        }
    });

    revalidatePath("/admin/marketing/promos");
    return { success: true };

  } catch (error: any) {
    console.error("Create Promo Error:", error);
    if (error.code === 'P2002') {
        return { success: false, error: "Promo code already exists" };
    }
    return { success: false, error: "Failed to create promo code" };
  }
}
