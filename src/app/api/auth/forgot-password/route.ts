import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { buildAppUrl } from "@/lib/app-url";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";
import {
  AUTH_RATE_LIMIT_ERROR,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const clientIp = getClientIpFromHeaders(request.headers);

    if (!clientIp) {
      return NextResponse.json(
        { error: "Unable to validate request origin" },
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (email.length > 254) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const limitResult = enforceRateLimits("auth.forgot-password", [
      {
        suffix: `ip:${clientIp}`,
        limit: 20,
        windowMs: 15 * 60 * 1000,
      },
      {
        suffix: `ip:${clientIp}:email:${email}`,
        limit: 4,
        windowMs: 15 * 60 * 1000,
      },
    ]);

    if (!limitResult.ok) {
      return NextResponse.json(
        { error: AUTH_RATE_LIMIT_ERROR },
        {
          status: 429,
          headers: {
            "Retry-After": String(limitResult.retryAfterSeconds ?? 60),
          },
        },
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
        select: { id: true },
      });

      // Construct reset URL
      const resetUrl = buildAppUrl(`/auth/reset-password?token=${resetToken}`);

      // Send password reset email
      await sendPasswordResetEmail(user.email!, user.name || "User", resetUrl);
    }

    return NextResponse.json({
      success: true,
      message:
        "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    if (isPrismaMissingColumnError(error, "webAuthnCredentialId")) {
      return NextResponse.json(
        { error: getAuthTemporaryUnavailableMessage() },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
