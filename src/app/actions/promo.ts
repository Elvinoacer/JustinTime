"use server";

import { validatePromoCode } from "@/lib/promo";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { PromoType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { hasRole } from "@/lib/auth/roles";

export async function validatePromoCodeAction(code: string, amount: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      isValid: false,
      discountAmount: 0,
      error: "Please log in to use promo codes",
    };
  }

  return await validatePromoCode(code, session.user.id, amount);
}

export async function createPromoCodeAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const code = formData.get("code") as string;
    const type = formData.get("type") as PromoType;
    const value = Number(formData.get("value"));
    const minOrder = formData.get("minOrder")
      ? Number(formData.get("minOrder"))
      : undefined;
    const maxDiscount = formData.get("maxDiscount")
      ? Number(formData.get("maxDiscount"))
      : undefined;
    const limit = formData.get("limit")
      ? Number(formData.get("limit"))
      : undefined;
    const perUserLimit = formData.get("perUserLimit")
      ? Number(formData.get("perUserLimit"))
      : 1;
    const startDate = formData.get("startDate")
      ? new Date(formData.get("startDate") as string)
      : undefined;
    const endDate = formData.get("endDate")
      ? new Date(formData.get("endDate") as string)
      : undefined;
    const isActiveField = formData.get("isActive");
    const isActive = isActiveField === null ? true : isActiveField === "on";
    const description = formData.get("description") as string;

    if (!code || !type || isNaN(value)) {
      return { success: false, error: "Missing required fields" };
    }

    if (type === "PERCENTAGE" && (value <= 0 || value > 100)) {
      return {
        success: false,
        error: "Percentage promo value must be between 0 and 100",
      };
    }

    if (startDate && Number.isNaN(startDate.getTime())) {
      return { success: false, error: "Invalid promo start date" };
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
      return { success: false, error: "Invalid promo end date" };
    }

    if (startDate && endDate && endDate <= startDate) {
      return {
        success: false,
        error: "Promo end date must be after the start date",
      };
    }

    await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        minOrderAmount: minOrder,
        maxDiscountAmount: maxDiscount,
        usageLimit: limit,
        perUserLimit,
        startDate,
        endDate,
        description,
        isActive,
      },
    });

    revalidatePath("/admin/marketing/promos");
    return { success: true };
  } catch (error: any) {
    console.error("Create Promo Error:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Promo code already exists" };
    }
    return { success: false, error: "Failed to create promo code" };
  }
}
