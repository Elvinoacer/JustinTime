import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hasClientAccess } from "@/lib/auth/clientAccess";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";
import { checkAndAwardBadges } from "@/lib/gamification/badge-checker";
import { applyLoyaltyRule } from "@/lib/loyalty/rule-engine";

const CLIENT_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  phone: true,
  role: true,
  roles: true,
  preferredWorkspace: true,
  clientInterests: true,
  createdAt: true,
} as const;

async function hasClientProfileAccess(
  userId: string,
  source?: {
    role?: unknown;
    roles?: unknown;
  },
): Promise<boolean> {
  if (hasClientAccess(source)) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, roles: true },
  });

  return hasClientAccess(user);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const canAccessClientProfile = await hasClientProfileAccess(
      session.user.id,
      {
        role: session.user.role,
        roles: session.user.roles,
      },
    );

    if (!canAccessClientProfile) {
      return NextResponse.json(
        { error: "Client profile required" },
        { status: 403 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: CLIENT_PROFILE_SELECT,
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[CLIENT_PROFILE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const canAccessClientProfile = await hasClientProfileAccess(
      session.user.id,
      {
        role: session.user.role,
        roles: session.user.roles,
      },
    );

    if (!canAccessClientProfile) {
      return NextResponse.json(
        { error: "Client profile required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { name, phone, image, clientInterests } = body;

    const normalizedPhone =
      phone === undefined
        ? undefined
        : phone === null
          ? null
          : (() => {
              const trimmed = String(phone).trim();
              if (!trimmed) {
                return null;
              }

              const normalized = normalizeKenyanPhone(trimmed);
              if (!isValidKenyanPhone(normalized)) {
                throw new Error("INVALID_PHONE");
              }

              return normalized;
            })();

    const updateData: {
      name?: string;
      phone?: string | null;
      image?: string;
      clientInterests?: string[];
    } = {};

    if (typeof name === "string") {
      updateData.name = name.trim();
    }
    if (normalizedPhone !== undefined) {
      updateData.phone = normalizedPhone;
    }
    if (typeof image === "string") {
      updateData.image = image.trim();
    }
    if (Array.isArray(clientInterests)) {
      updateData.clientInterests = clientInterests
        .map((interest) => String(interest).trim())
        .filter((interest) => Boolean(interest));
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: CLIENT_PROFILE_SELECT,
      });

      try {
        await Promise.all([
          checkAndAwardBadges(session.user.id, {
            trigger: "PROFILE_UPDATED",
            eventId: `client-profile:${session.user.id}:${Date.now()}`,
            actorUserId: session.user.id,
          }),
          applyLoyaltyRule({
            type: "PROFILE_UPDATED",
            userId: session.user.id,
            metadata: {
              source: "client-profile",
            },
          }),
        ]);
      } catch (badgeError) {
        console.error("[CLIENT_PROFILE_GAMIFICATION]", badgeError);
      }

      return NextResponse.json(updatedUser);
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json(
          { error: "This phone number is already in use by another account" },
          { status: 400 },
        );
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PHONE") {
      return NextResponse.json(
        {
          error:
            "Use a valid Kenyan phone number format, for example 254712345678.",
        },
        { status: 400 },
      );
    }

    console.error("[CLIENT_PROFILE_UPDATE]", error);
    return NextResponse.json(
      { error: "Failed to update profile. Please try again." },
      { status: 500 },
    );
  }
}
