import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { comparePassword, hashPassword } from "@/lib/auth/password";
import { getPasswordValidationError } from "@/lib/auth/lifecycle";

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: PasswordChangeRequest = await req.json();
    const { currentPassword, newPassword } = body;

    // Validation: Check if all fields are provided
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Fetch user with current password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "Password not set. Please use the password reset flow." },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Check if new password is different from current
    const isSameAsOld = await comparePassword(newPassword, user.password);
    if (isSameAsOld) {
      return NextResponse.json(
        { error: "New password must be different from your current password" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        authInvalidatedAt: new Date(),
      },
    });

    // Send email notification about password change
    if (user.email) {
      try {
        const { sendPasswordChangedEmail } = await import("@/lib/email");
        await sendPasswordChangedEmail(user.email, user.email, new Date());
      } catch (emailError) {
        console.error("Failed to send password change email:", emailError);
        // Continue even if email fails - password was already changed
      }
    }


    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "Password Changed",
        message: "Your password was successfully changed.",
      },
    });

    return NextResponse.json(

      { message: "Password changed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
