"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";
import { revalidatePath } from "next/cache";

const INSURANCE_RESERVE_USER_ID =
  process.env.INSURANCE_RESERVE_USER_ID?.trim() || null;

function parseEvidence(formData: FormData): string[] {
  const raw = formData.get("evidence");
  const directValues = formData
    .getAll("evidenceUrls")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  if (typeof raw !== "string" || !raw.trim()) {
    return [...new Set(directValues)];
  }

  const normalized = raw.trim();
  let parsed: string[] = [];

  try {
    const maybeJson = JSON.parse(normalized) as unknown;
    if (Array.isArray(maybeJson)) {
      parsed = maybeJson
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    parsed = normalized
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [...new Set([...parsed, ...directValues])];
}

export async function submitInsuranceClaim(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const bookingId = formData.get("bookingId") as string;
  const amount = Number(formData.get("amount"));
  const description = formData.get("description") as string;
  const evidence = parseEvidence(formData);

  if (!bookingId || !amount || !description?.trim()) {
    return { error: "Missing fields" };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Claim amount must be greater than zero" };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        clientId: true,
        providerId: true,
        status: true,
      },
    });

    if (!booking) {
      return { error: "Booking not found" };
    }

    const isParticipant =
      booking.clientId === session.user.id ||
      booking.providerId === session.user.id;

    if (!isParticipant) {
      return { error: "Unauthorized to claim for this booking" };
    }

    await prisma.insuranceClaim.create({
      data: {
        bookingId,
        claimantId: session.user.id,
        amount,
        description,
        evidence,
        status: "PENDING",
      },
    });

    revalidatePath(`/client/bookings`);
    revalidatePath(`/dashboard/bookings`);
    revalidatePath(`/client/bookings/${bookingId}`);
    revalidatePath(`/dashboard/bookings/${bookingId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to submit claim:", error);
    return { error: "Submission failed" };
  }
}

export async function getClaims() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const isAdmin = hasRole(session.user, "ADMIN");

  try {
    const claims = await prisma.insuranceClaim.findMany({
      where: isAdmin ? undefined : { claimantId: session.user.id },
      include: {
        claimant: { select: { name: true, email: true } },
        booking: {
          select: {
            id: true,
            date: true,
            totalAmount: true,
            clientId: true,
            providerId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, claims };
  } catch (error) {
    console.error("Failed to fetch claims:", error);
    return { error: "Failed to fetch claims" };
  }
}

export async function resolveInsuranceClaim(params: {
  claimId: string;
  status: "APPROVED" | "REJECTED" | "PAID";
  payoutAmount?: number;
  adminNotes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
    return { success: false, error: "Unauthorized" };
  }

  const payoutAmount = Number(params.payoutAmount || 0);
  const shouldPayout =
    params.status === "PAID" ||
    (params.status === "APPROVED" && payoutAmount > 0);

  if (shouldPayout && (!Number.isFinite(payoutAmount) || payoutAmount <= 0)) {
    return { success: false, error: "Payout amount must be greater than zero" };
  }

  if (shouldPayout && !INSURANCE_RESERVE_USER_ID) {
    return {
      success: false,
      error:
        "Insurance reserve wallet is not configured. Set INSURANCE_RESERVE_USER_ID.",
    };
  }

  try {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: params.claimId },
      include: {
        claimant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!claim) {
      return { success: false, error: "Claim not found" };
    }

    if (claim.status !== "PENDING") {
      return { success: false, error: "Claim has already been resolved" };
    }

    const resolved = await prisma.$transaction(async (tx) => {
      const updatedClaim = await tx.insuranceClaim.update({
        where: { id: params.claimId },
        data: {
          status: shouldPayout ? "PAID" : params.status,
          approvedAmount: shouldPayout
            ? payoutAmount
            : params.status === "APPROVED"
              ? payoutAmount || null
              : null,
          adminNotes: params.adminNotes,
          resolvedAt: new Date(),
        },
      });

      if (shouldPayout) {
        if (!INSURANCE_RESERVE_USER_ID) {
          throw new Error("INSURANCE_RESERVE_NOT_CONFIGURED");
        }

        if (INSURANCE_RESERVE_USER_ID === claim.claimantId) {
          throw new Error("INSURANCE_RESERVE_INVALID_CONFIGURATION");
        }

        const reserveWallet = await tx.wallet.findUnique({
          where: { userId: INSURANCE_RESERVE_USER_ID },
          select: {
            id: true,
            balance: true,
          },
        });

        if (!reserveWallet) {
          throw new Error("INSURANCE_RESERVE_WALLET_MISSING");
        }

        if (Number(reserveWallet.balance) < payoutAmount) {
          throw new Error("INSURANCE_RESERVE_INSUFFICIENT");
        }

        await tx.wallet.update({
          where: { id: reserveWallet.id },
          data: {
            balance: {
              decrement: payoutAmount,
            },
          },
        });

        await tx.transaction.create({
          data: {
            walletId: reserveWallet.id,
            amount: payoutAmount,
            type: "WITHDRAWAL",
            description: `Insurance reserve payout for claim ${claim.id}`,
          },
        });

        const wallet = await tx.wallet.upsert({
          where: { userId: claim.claimantId },
          update: {
            balance: {
              increment: payoutAmount,
            },
          },
          create: {
            userId: claim.claimantId,
            balance: payoutAmount,
          },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: payoutAmount,
            type: "REFUND",
            description: `Insurance payout for claim ${claim.id}`,
          },
        });
      }

      return updatedClaim;
    });

    await sendComprehensiveNotification({
      userId: claim.claimant.id,
      title: "Insurance claim updated",
      message: shouldPayout
        ? `Your insurance claim has been approved and paid out (KES ${payoutAmount.toLocaleString()}).`
        : params.status === "APPROVED"
          ? "Your insurance claim has been approved and is awaiting payout processing."
          : "Your insurance claim has been rejected. Please review the notes for details.",
      type: "INSURANCE_CLAIM",
      emailSubject: "Insurance claim update - JustInTime",
      emailHtml: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #111827;">Insurance claim update</h2>
                    <p>Hello ${claim.claimant.name || "there"},</p>
                    <p>Your insurance claim status is now <strong>${resolved.status}</strong>.</p>
                    ${shouldPayout ? `<p>Payout amount: <strong>KES ${payoutAmount.toLocaleString()}</strong>.</p>` : ""}
                    ${params.adminNotes ? `<p>Admin notes: ${params.adminNotes}</p>` : ""}
                </div>
            `,
    });

    revalidatePath("/admin/insurance");
    revalidatePath("/admin/dashboard");
    revalidatePath("/dashboard");
    revalidatePath("/client/dashboard");

    return { success: true, claim: resolved };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INSURANCE_RESERVE_INVALID_CONFIGURATION") {
        return {
          success: false,
          error:
            "Insurance reserve configuration is invalid. Reserve wallet cannot be the claimant wallet.",
        };
      }

      if (error.message === "INSURANCE_RESERVE_WALLET_MISSING") {
        return {
          success: false,
          error:
            "Insurance reserve wallet was not found. Create the reserve wallet before payouts.",
        };
      }

      if (error.message === "INSURANCE_RESERVE_INSUFFICIENT") {
        return {
          success: false,
          error:
            "Insurance reserve wallet has insufficient balance for this payout.",
        };
      }
    }

    console.error("Failed to resolve claim:", error);
    return { success: false, error: "Failed to resolve claim" };
  }
}
