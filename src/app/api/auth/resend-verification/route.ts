import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";
import crypto from "crypto";
import {
  AUTH_RATE_LIMIT_ERROR,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";
import { buildAppUrl } from "@/lib/app-url";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();
    const clientIp = getClientIpFromHeaders(request.headers);

    if (!clientIp) {
      return NextResponse.json(
        { error: "Unable to validate request origin" },
        { status: 400 },
      );
    }

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (normalizedEmail.length > 254) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const limitResult = enforceRateLimits("auth.resend-verification", [
      {
        suffix: `ip:${clientIp}`,
        limit: 20,
        windowMs: 15 * 60 * 1000,
      },
      {
        suffix: `ip:${clientIp}:email:${normalizedEmail}`,
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

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        emailVerified: true,
        name: true,
      },
    });

    if (!user) {
      // Return 200 even if user not found to prevent email enumeration
      return NextResponse.json({
        message: "If that email exists, a verification link was sent.",
      });
    }

    // Don't resend if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 },
      );
    }

    // Rate-limit: check if a token was created in the last 2 minutes
    // A 24h token created <2 min ago still has >23h58m remaining
    const twoMinutesAgo = new Date(
      Date.now() + 23 * 60 * 60 * 1000 + 58 * 60 * 1000,
    );
    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        expires: { gt: twoMinutesAgo },
      },
    });

    if (recentToken) {
      return NextResponse.json(
        { error: "Please wait a few minutes before requesting another link." },
        { status: 429 },
      );
    }

    // Delete old tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, expires },
    });

    const verificationUrl = buildAppUrl(`/auth/verify-email?token=${token}`);

    await sendVerificationEmail(
      normalizedEmail,
      user.name || "User",
      verificationUrl,
    );

    return NextResponse.json({
      message: "Verification email sent successfully.",
    });
  } catch (error) {
    console.error("[RESEND_VERIFICATION_ERROR]", error);
    if (isPrismaMissingColumnError(error, "webAuthnCredentialId")) {
      return NextResponse.json(
        { error: getAuthTemporaryUnavailableMessage() },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to send verification email. Please try again." },
      { status: 500 },
    );
  }
}
