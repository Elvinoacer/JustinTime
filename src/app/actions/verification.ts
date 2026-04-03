"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import { updateTrustScore } from "@/lib/taas/trust-score-calculator";

const BACKGROUND_CHECK_VALIDITY_DAYS = 365;

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (!hasRole(user, "ADMIN")) {
    throw new Error("Unauthorized");
  }
  return user;
}

// --- Background Check Logic ---

export async function submitBackgroundCheck(data: {
  documentUrl?: string;
  dciCertificateUrl?: string;
  reportUrl?: string;
}) {
  const user = await requireUser();

  const documentUrl = data.documentUrl || data.dciCertificateUrl;
  if (!documentUrl) {
    return { success: false, error: "Document URL is required" };
  }

  try {
    const check = await prisma.backgroundCheck.create({
      data: {
        userId: user.id,
        documents: [documentUrl],
        reportUrl: data.reportUrl,
        status: "PENDING",
      },
    });

    await prisma.verificationAudit.create({
      data: {
        userId: user.id,
        action: "DOCUMENT_UPLOADED",
        badgeType: "GOOD_CONDUCT",
        newValue: "PENDING",
        performedBy: user.id,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/verification");
    return { success: true, check };
  } catch (error) {
    console.error("Failed to submit background check:", error);
    return { success: false, error: "Failed to submit check" };
  }
}

export async function getProviderBackgroundCheck(providerId?: string) {
  const session = await auth();
  const targetId = providerId || session?.user?.id;

  if (!targetId) {
    return null;
  }

  try {
    const check = await prisma.backgroundCheck.findFirst({
      where: { userId: targetId },
      orderBy: { createdAt: "desc" },
    });
    return check;
  } catch (error) {
    console.error("Failed to get provider background check:", error);
    return null;
  }
}

// --- Admin Actions ---

export async function approveBackgroundCheck(checkId: string) {
  const admin = await requireAdmin();

  try {
    const check = await prisma.backgroundCheck.findUnique({
      where: { id: checkId },
    });

    if (!check) {
      return { success: false, error: "Background check not found" };
    }

    const expiresAt = new Date(
      Date.now() + BACKGROUND_CHECK_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
    );

    const updated = await prisma.backgroundCheck.update({
      where: { id: checkId },
      data: {
        status: "APPROVED",
        expiresAt,
        renewalStatus: null,
      },
    });

    await prisma.verificationBadge.upsert({
      where: {
        userId_type: {
          userId: check.userId,
          type: "GOOD_CONDUCT",
        },
      },
      update: {
        status: "VERIFIED",
        documentUrl: check.documents[0] || null,
        verifiedAt: new Date(),
        verifiedBy: admin.id,
        expiresAt,
        notes: "Approved from background check review",
      },
      create: {
        userId: check.userId,
        type: "GOOD_CONDUCT",
        status: "VERIFIED",
        documentUrl: check.documents[0] || null,
        verifiedAt: new Date(),
        verifiedBy: admin.id,
        expiresAt,
        notes: "Approved from background check review",
      },
    });

    await prisma.verificationAudit.create({
      data: {
        userId: check.userId,
        action: "BADGE_GRANTED",
        badgeType: "GOOD_CONDUCT",
        previousValue: check.status,
        newValue: "APPROVED",
        performedBy: admin.id,
      },
    });

    await updateTrustScore(check.userId);

    revalidatePath("/admin/verifications");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/verification");
    return { success: true, check: updated };
  } catch (error) {
    console.error("Failed to approve check:", error);
    return { success: false, error: "Failed to approve" };
  }
}

export async function rejectBackgroundCheck(checkId: string, reason: string) {
  const admin = await requireAdmin();

  try {
    const check = await prisma.backgroundCheck.findUnique({
      where: { id: checkId },
    });

    if (!check) {
      return { success: false, error: "Background check not found" };
    }

    const updated = await prisma.backgroundCheck.update({
      where: { id: checkId },
      data: {
        status: "REJECTED",
        renewalStatus: "REJECTED",
      },
    });

    await prisma.verificationBadge.updateMany({
      where: {
        userId: check.userId,
        type: "GOOD_CONDUCT",
        status: {
          in: ["PENDING", "VERIFIED"],
        },
      },
      data: {
        status: "REVOKED",
        notes: reason || "Background check rejected",
        verifiedBy: admin.id,
      },
    });

    await prisma.verificationAudit.create({
      data: {
        userId: check.userId,
        action: "BADGE_REVOKED",
        badgeType: "GOOD_CONDUCT",
        previousValue: check.status,
        newValue: "REJECTED",
        performedBy: admin.id,
        reason,
      },
    });

    await updateTrustScore(check.userId);

    revalidatePath("/admin/verifications");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/verification");
    return { success: true, check: updated };
  } catch (error) {
    console.error("Failed to reject check:", error);
    return { success: false, error: "Failed to reject" };
  }
}

export async function getExpiringChecks() {
  await requireAdmin();

  try {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const checks = await prisma.backgroundCheck.findMany({
      where: {
        status: "APPROVED",
        expiresAt: {
          lte: thirtyDaysFromNow,
          not: null,
        },
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { expiresAt: "asc" },
    });
    return checks;
  } catch (error) {
    console.error("Error fetching expiring checks:", error);
    return [];
  }
}

export async function getMyVerificationAuditTrail(limit = 20) {
  const user = await requireUser();

  try {
    const events = await prisma.verificationAudit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
      select: {
        id: true,
        action: true,
        badgeType: true,
        previousValue: true,
        newValue: true,
        performedBy: true,
        reason: true,
        createdAt: true,
      },
    });

    return { success: true, events };
  } catch (error) {
    console.error("Failed to fetch verification audit trail:", error);
    return { success: false, error: "Failed to fetch audit trail", events: [] };
  }
}

export async function getVerificationAuditFeed(limit = 120) {
  await requireAdmin();

  try {
    const events = await prisma.verificationAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 500),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return { success: true, events };
  } catch (error) {
    console.error("Failed to fetch admin verification audit feed:", error);
    return { success: false, error: "Failed to fetch audit feed", events: [] };
  }
}

export async function getIdentityVerificationRequests(
  status?: "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED",
) {
  await requireAdmin();

  try {
    const requests = await prisma.identityVerificationRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: {
                verificationStatus: true,
                location: true,
              },
            },
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return { success: true, requests };
  } catch (error) {
    console.error("Failed to fetch identity verification requests:", error);
    return {
      success: false,
      error: "Failed to fetch identity verification requests",
      requests: [],
    };
  }
}

export async function reviewIdentityVerificationRequest(params: {
  requestId: string;
  decision: "VERIFIED" | "REJECTED";
  reviewNotes?: string;
}) {
  const admin = await requireAdmin();

  try {
    const request = await prisma.identityVerificationRequest.findUnique({
      where: { id: params.requestId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!request) {
      return { success: false, error: "Verification request not found" };
    }

    if (request.status === "VERIFIED" || request.status === "REJECTED") {
      return { success: false, error: "Verification request already reviewed" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.identityVerificationRequest.update({
        where: { id: request.id },
        data: {
          status: params.decision,
          reviewedAt: new Date(),
          reviewedById: admin.id,
          reviewNotes: params.reviewNotes?.trim() || null,
        },
      });

      await tx.profile.updateMany({
        where: { userId: request.userId },
        data: {
          verificationStatus:
            params.decision === "VERIFIED" ? "VERIFIED" : "REJECTED",
          lastVerificationAt: new Date(),
        },
      });

      if (params.decision === "VERIFIED") {
        await tx.verificationBadge.upsert({
          where: {
            userId_type: {
              userId: request.userId,
              type: "IDENTITY_VERIFIED",
            },
          },
          update: {
            status: "VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: admin.id,
            notes: params.reviewNotes?.trim() || "Identity verified by admin",
          },
          create: {
            userId: request.userId,
            type: "IDENTITY_VERIFIED",
            status: "VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: admin.id,
            notes: params.reviewNotes?.trim() || "Identity verified by admin",
          },
        });
      } else {
        await tx.verificationBadge.updateMany({
          where: {
            userId: request.userId,
            type: "IDENTITY_VERIFIED",
            status: {
              in: ["PENDING", "VERIFIED"],
            },
          },
          data: {
            status: "REVOKED",
            notes: params.reviewNotes?.trim() || "Identity verification rejected",
            verifiedBy: admin.id,
          },
        });
      }

      await tx.verificationAudit.create({
        data: {
          userId: request.userId,
          action: "IDENTITY_REQUEST_REVIEWED",
          previousValue: request.status,
          newValue: params.decision,
          performedBy: admin.id,
          reason: params.reviewNotes?.trim() || null,
        },
      });
    });

    await updateTrustScore(request.userId);

    revalidatePath("/admin/trust");
    revalidatePath("/admin/verifications");
    revalidatePath("/dashboard/verification");

    return { success: true };
  } catch (error) {
    console.error("Failed to review identity verification request:", error);
    return { success: false, error: "Failed to review request" };
  }
}
