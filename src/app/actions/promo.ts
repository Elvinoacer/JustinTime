"use server";

import { validatePromoCode } from "@/lib/promo";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { PromoType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { hasRole } from "@/lib/auth/roles";

function parseActionDate(input: FormDataEntryValue | null): {
  value?: Date;
  error?: string;
} {
  if (typeof input !== "string") {
    return {};
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return {};
  }

  // Require timezone-aware or ISO timestamps to avoid server-local misinterpretation.
  const hasTimezoneOffset = /[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed);
  if (!hasTimezoneOffset) {
    return {
      error:
        "Promo dates must include timezone information. Please reselect the date and time.",
    };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Invalid date provided" };
  }

  return { value: parsed };
}

type PromoActionInput = {
  code: string;
  type: PromoType;
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  limit?: number;
  perUserLimit: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  description: string;
  parseError?: string;
};

function getPromoActionInput(formData: FormData): PromoActionInput {
  const code = String(formData.get("code") ?? "").trim();
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
  const startDateResult = parseActionDate(formData.get("startDate"));
  const endDateResult = parseActionDate(formData.get("endDate"));
  const isActive = formData.get("isActive") === "on";
  const description = String(formData.get("description") ?? "").trim();

  return {
    code,
    type,
    value,
    minOrder,
    maxDiscount,
    limit,
    perUserLimit,
    startDate: startDateResult.value,
    endDate: endDateResult.value,
    isActive,
    description,
    parseError: startDateResult.error || endDateResult.error,
  };
}

function validatePromoActionInput(input: PromoActionInput): string | undefined {
  if (!input.code || !input.type || !Object.values(PromoType).includes(input.type)) {
    return "Missing required fields";
  }

  if (!Number.isFinite(input.value) || input.value <= 0) {
    return "Promo value must be a positive number";
  }

  if (input.type === "PERCENTAGE" && (input.value <= 0 || input.value > 100)) {
    return "Percentage promo value must be between 0 and 100";
  }

  if (
    input.minOrder !== undefined &&
    (!Number.isFinite(input.minOrder) || input.minOrder < 0)
  ) {
    return "Minimum order amount cannot be negative";
  }

  if (
    input.maxDiscount !== undefined &&
    (!Number.isFinite(input.maxDiscount) || input.maxDiscount <= 0)
  ) {
    return "Max discount must be a positive number";
  }

  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit <= 0)) {
    return "Usage limit must be a positive whole number";
  }

  if (!Number.isInteger(input.perUserLimit) || input.perUserLimit <= 0) {
    return "Per-user limit must be a positive whole number";
  }

  if (input.parseError) {
    return input.parseError;
  }

  if (input.startDate && Number.isNaN(input.startDate.getTime())) {
    return "Invalid promo start date";
  }

  if (input.endDate && Number.isNaN(input.endDate.getTime())) {
    return "Invalid promo end date";
  }

  if (input.startDate && input.endDate && input.endDate <= input.startDate) {
    return "Promo end date must be after the start date";
  }

  return undefined;
}

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

    const input = getPromoActionInput(formData);
    const validationError = validatePromoActionInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    await prisma.promoCode.create({
      data: {
        code: input.code.toUpperCase(),
        type: input.type,
        value: input.value,
        minOrderAmount: input.minOrder,
        maxDiscountAmount: input.maxDiscount,
        usageLimit: input.limit,
        perUserLimit: input.perUserLimit,
        startDate: input.startDate,
        endDate: input.endDate,
        description: input.description,
        isActive: input.isActive,
      },
    });

    revalidatePath("/admin/marketing/promos");
    return { success: true };
  } catch (error: unknown) {
    console.error("Create Promo Error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { success: false, error: "Promo code already exists" };
    }
    return { success: false, error: "Failed to create promo code" };
  }
}

export async function setPromoCodeActiveStateAction(
  promoId: string,
  isActive: boolean,
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    if (!promoId) {
      return { success: false, error: "Promo ID is required" };
    }

    await prisma.promoCode.update({
      where: { id: promoId },
      data: { isActive },
    });

    revalidatePath("/admin/marketing/promos");
    return { success: true };
  } catch (error) {
    console.error("Set Promo Active State Error:", error);
    return { success: false, error: "Failed to update promo status" };
  }
}

export async function deletePromoCodeAction(promoId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    if (!promoId) {
      return { success: false, error: "Promo ID is required" };
    }

    const linkedBookings = await prisma.booking.count({
      where: { promoCodeId: promoId },
    });

    if (linkedBookings > 0) {
      await prisma.promoCode.update({
        where: { id: promoId },
        data: { isActive: false },
      });

      revalidatePath("/admin/marketing/promos");
      return {
        success: true,
        archived: true,
        message:
          "Promo had existing redemptions and was archived (deactivated) instead of deleted.",
      };
    }

    await prisma.promoCode.delete({
      where: { id: promoId },
    });

    revalidatePath("/admin/marketing/promos");
    return { success: true, deleted: true };
  } catch (error) {
    console.error("Delete Promo Error:", error);
    return { success: false, error: "Failed to remove promo code" };
  }
}

export async function updatePromoCodeAction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const promoId = String(formData.get("promoId") ?? "").trim();
    if (!promoId) {
      return { success: false, error: "Promo ID is required" };
    }

    const existingPromo = await prisma.promoCode.findUnique({
      where: { id: promoId },
      select: { id: true, usageCount: true },
    });

    if (!existingPromo) {
      return { success: false, error: "Promo not found" };
    }

    const input = getPromoActionInput(formData);
    const validationError = validatePromoActionInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    if (input.limit !== undefined && input.limit < existingPromo.usageCount) {
      return {
        success: false,
        error: `Usage limit cannot be below current usage (${existingPromo.usageCount})`,
      };
    }

    await prisma.promoCode.update({
      where: { id: promoId },
      data: {
        code: input.code.toUpperCase(),
        type: input.type,
        value: input.value,
        minOrderAmount: input.minOrder,
        maxDiscountAmount: input.maxDiscount,
        usageLimit: input.limit,
        perUserLimit: input.perUserLimit,
        startDate: input.startDate,
        endDate: input.endDate,
        description: input.description,
        isActive: input.isActive,
      },
    });

    revalidatePath("/admin/marketing/promos");
    return { success: true };
  } catch (error: unknown) {
    console.error("Update Promo Error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { success: false, error: "Promo code already exists" };
    }

    return { success: false, error: "Failed to update promo code" };
  }
}
