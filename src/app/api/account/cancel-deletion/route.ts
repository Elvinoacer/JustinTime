import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cancel deletion by clearing the scheduled time
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, deletionScheduledAt: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!existingUser.deletionScheduledAt) {
      return NextResponse.json(
        { error: "Account deletion is not currently scheduled" },
        { status: 409 },
      );
    }

    await prisma.user.update({
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
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error cancelling account deletion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
