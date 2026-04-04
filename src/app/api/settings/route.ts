import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
} from "@/lib/notifications/preferences";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";

// Default preferences for new users
const defaultNotifications = DEFAULT_NOTIFICATION_PREFERENCES;

const defaultPrivacy = {
  profileVisible: true,
  searchable: true,
  showLocation: true,
  allowMessages: true,
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    void req;

    // Fetch user with profile and subscription
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse JSON preferences or use defaults
    const notificationPreferences = normalizeNotificationPreferences(
      user.notificationPreferences ?? defaultNotifications,
    );

    const privacySettings = user.privacySettings
      ? typeof user.privacySettings === "string"
        ? JSON.parse(user.privacySettings)
        : user.privacySettings
      : defaultPrivacy;

    // Return combined settings data
    const settings = {
      account: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        onboardingCompleted: user.onboardingCompleted,
        deletionScheduledAt: user.deletionScheduledAt,
        deletionReason: user.deletionReason,
      },
      subscription: user.subscription
        ? {
            plan: user.subscription.plan,
            isActive: user.subscription.isActive,
            endDate: user.subscription.endDate,
          }
        : null,
      notifications: notificationPreferences,
      privacy: privacySettings,
      activeSessions: [],
      twoFactorEnabled: user.isTwoFactorEnabled || false,
    };

    return NextResponse.json({
      settings,
      twoFactorEnabled: user.isTwoFactorEnabled || false,
      sessionManagementMode: "jwt",
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { phone, notifications, privacy } = body;

    // Build update data object
    const updateData: Prisma.UserUpdateInput = {};

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

    if (phone !== undefined) {
      updateData.phone = normalizedPhone;
    }

    if (notifications !== undefined) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          notificationPreferences: true,
        },
      });

      const mergedNotificationPreferences = {
        ...normalizeNotificationPreferences(
          currentUser?.notificationPreferences,
        ),
        ...(notifications as Record<string, unknown>),
      };

      updateData.notificationPreferences = normalizeNotificationPreferences(
        mergedNotificationPreferences,
      ) as Prisma.InputJsonValue;
    }

    if (privacy !== undefined) {
      if (privacy && typeof privacy === "object" && !Array.isArray(privacy)) {
        updateData.privacySettings = privacy as Prisma.InputJsonValue;
      }
    }

    // Update user with new settings
    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      });
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string }).code
          : undefined;
      if (code === "P2002") {
        return NextResponse.json(
          { error: "This phone number is already in use by another account" },
          { status: 400 },
        );
      }

      throw error;
    }

    return NextResponse.json({
      message: "Settings updated successfully",
      settings: {
        phone: updatedUser.phone,
        notifications:
          typeof updatedUser.notificationPreferences === "string"
            ? JSON.parse(updatedUser.notificationPreferences as string)
            : updatedUser.notificationPreferences,
        privacy:
          typeof updatedUser.privacySettings === "string"
            ? JSON.parse(updatedUser.privacySettings as string)
            : updatedUser.privacySettings,
      },
    });
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

    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
