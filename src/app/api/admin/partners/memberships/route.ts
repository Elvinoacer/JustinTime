import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasRole } from "@/lib/auth/roles";
import { PartnerUserRole } from "@/generated/prisma/client";

const PARTNER_USER_ROLES: PartnerUserRole[] = ["OWNER", "MANAGER", "STAFF"];

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRole(value: unknown): PartnerUserRole {
  if (typeof value !== "string") return "STAFF";
  const normalized = value.trim().toUpperCase();
  return PARTNER_USER_ROLES.includes(normalized as PartnerUserRole)
    ? (normalized as PartnerUserRole)
    : "STAFF";
}

async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: new NextResponse("Unauthorized", { status: 401 }),
    };
  }

  if (!hasRole(session.user, "ADMIN")) {
    return {
      ok: false as const,
      response: new NextResponse("Forbidden", { status: 403 }),
    };
  }

  return { ok: true as const, session };
}

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(request.url);
    const userId = normalizeId(searchParams.get("userId"));
    const partnerId = normalizeId(searchParams.get("partnerId"));

    if (!userId && !partnerId) {
      return NextResponse.json(
        { error: "At least one filter is required: userId or partnerId" },
        { status: 400 },
      );
    }

    const memberships = await prisma.partnerUser.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(partnerId ? { partnerId } : {}),
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            category: true,
            isActive: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            roles: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ memberships });
  } catch (error) {
    console.error("[ADMIN_PARTNER_MEMBERSHIPS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) return authResult.response;

    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown;
      partnerId?: unknown;
      role?: unknown;
      isActive?: unknown;
    };

    const userId = normalizeId(body.userId);
    const partnerId = normalizeId(body.partnerId);
    const role = normalizeRole(body.role);
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    if (!userId || !partnerId) {
      return NextResponse.json(
        { error: "userId and partnerId are required" },
        { status: 400 },
      );
    }

    const [user, partner] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.partner.findUnique({
        where: { id: partnerId },
        select: { id: true, isActive: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    if (!partner.isActive && isActive) {
      return NextResponse.json(
        { error: "Cannot assign active membership to an inactive partner" },
        { status: 400 },
      );
    }

    const membership = await prisma.partnerUser.upsert({
      where: {
        partnerId_userId: {
          partnerId,
          userId,
        },
      },
      create: {
        partnerId,
        userId,
        role,
        isActive,
      },
      update: {
        role,
        isActive,
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            category: true,
            isActive: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            roles: true,
          },
        },
      },
    });

    return NextResponse.json({ membership });
  } catch (error) {
    console.error("[ADMIN_PARTNER_MEMBERSHIPS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) return authResult.response;

    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown;
      partnerId?: unknown;
    };

    const userId = normalizeId(body.userId);
    const partnerId = normalizeId(body.partnerId);

    if (!userId || !partnerId) {
      return NextResponse.json(
        { error: "userId and partnerId are required" },
        { status: 400 },
      );
    }

    const updateResult = await prisma.partnerUser.updateMany({
      where: {
        userId,
        partnerId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: "Active membership not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, updated: updateResult.count });
  } catch (error) {
    console.error("[ADMIN_PARTNER_MEMBERSHIPS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
