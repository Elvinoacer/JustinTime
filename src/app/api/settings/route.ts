import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// Default preferences for new users
const defaultNotifications = {
  emailJobAlerts: true,
  emailMessages: true,
  emailBookings: true,
  emailReviews: true,
  emailMarketing: false,
  pushNotifications: true,
};

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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user with profile and subscription
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse JSON preferences or use defaults
    const notificationPreferences = user.notificationPreferences 
      ? (typeof user.notificationPreferences === 'string' 
          ? JSON.parse(user.notificationPreferences) 
          : user.notificationPreferences)
      : defaultNotifications;

    const privacySettings = user.privacySettings
      ? (typeof user.privacySettings === 'string'
          ? JSON.parse(user.privacySettings)
          : user.privacySettings)
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
      subscription: user.subscription ? {
        plan: user.subscription.plan,
        isActive: user.subscription.isActive,
        endDate: user.subscription.endDate,
      } : null,
      notifications: notificationPreferences,
      privacy: privacySettings,
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { phone, notifications, privacy } = body;

    // Build update data object
    const updateData: any = {};

    if (phone !== undefined) {
      updateData.phone = phone;
    }

    if (notifications !== undefined) {
      updateData.notificationPreferences = notifications;
    }

    if (privacy !== undefined) {
      updateData.privacySettings = privacy;
    }

    // Update user with new settings
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json({
      message: "Settings updated successfully",
      settings: {
        phone: updatedUser.phone,
        notifications: typeof updatedUser.notificationPreferences === 'string' 
          ? JSON.parse(updatedUser.notificationPreferences as string)
          : updatedUser.notificationPreferences,
        privacy: typeof updatedUser.privacySettings === 'string'
          ? JSON.parse(updatedUser.privacySettings as string)
          : updatedUser.privacySettings,
      },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
