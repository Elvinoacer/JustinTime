import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Cancel deletion by clearing the scheduled time
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        deletionScheduledAt: null,
        deletionReason: null,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Account Deletion Cancelled",
        message: "Your account deletion has been cancelled. Welcome back!",
        type: "SYSTEM",
      },
    });

    // TODO: Send restoration confirmation email
    console.log(`Account deletion cancelled for user ${session.user.id}`);

    return NextResponse.json({
      message: "Account deletion cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling account deletion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
