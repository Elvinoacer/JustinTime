import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendAccountDeletionScheduledEmail } from "@/lib/email";
import { getSettingsPathForRole } from "@/lib/auth/lifecycle";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reason } = body;

    if (session.user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admin accounts cannot use self-service deletion" },
        { status: 403 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        role: true,
        deletionScheduledAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.deletionScheduledAt) {
      return NextResponse.json(
        {
          error: "Account deletion is already scheduled",
          deletionScheduledAt: user.deletionScheduledAt,
        },
        { status: 409 },
      );
    }

    // Schedule deletion for 24 hours from now
    const deletionDate = new Date();
    deletionDate.setHours(deletionDate.getHours() + 24);

    // Update user with deletion schedule
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        deletionScheduledAt: deletionDate,
        deletionReason: reason || "User requested account deletion",
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Account Deletion Scheduled",
        message: `Your account is scheduled for deletion on ${deletionDate.toLocaleString()}. You can restore it anytime before then.`,
        type: "SYSTEM",
      },
    });

    // Send deletion scheduled email
    if (user.email && user.name) {
      await sendAccountDeletionScheduledEmail(
        user.email,
        user.name,
        user.role,
        deletionDate,
        reason,
      );
      console.log(`Deletion scheduled email sent to ${user.email}`);
    }

    return NextResponse.json({
      message: "Account deletion scheduled",
      deletionScheduledAt: deletionDate,
      hoursRemaining: 24,
      serverTime: new Date().toISOString(),
      restorePath: getSettingsPathForRole(user.role),
    });
  } catch (error) {
    console.error("Error scheduling account deletion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
