import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth/password";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";
import {
  AUTH_RATE_LIMIT_ERROR,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";

/**
 * Internal API endpoint for credential verification
 * This runs in Node.js context, not Edge
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, code } = await request.json();
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();
    const normalizedPassword = String(password ?? "").trim();
    const normalizedCode =
      typeof code === "string"
        ? code.replace(/\D/g, "").slice(0, 6)
        : undefined;

    const clientIp = getClientIpFromHeaders(request.headers);
    if (!clientIp) {
      return NextResponse.json(
        { error: "Unable to validate request origin" },
        { status: 400 },
      );
    }

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    if (normalizedEmail.length > 254 || normalizedPassword.length > 128) {
      return NextResponse.json(
        { error: "Invalid email or password format" },
        { status: 400 },
      );
    }

    const limitResult = enforceRateLimits("auth.verify-credentials", [
      {
        suffix: `ip:${clientIp}`,
        limit: 30,
        windowMs: 15 * 60 * 1000,
      },
      {
        suffix: `ip:${clientIp}:email:${normalizedEmail}`,
        limit: 8,
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        image: true,
        onboardingCompleted: true,
        clientInterests: true,
        emailVerified: true,
        isTwoFactorEnabled: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Verify password
    const isValid = await comparePassword(normalizedPassword, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email address" },
        { status: 401 },
      );
    }

    // 2FA Verification
    if (user.isTwoFactorEnabled) {
      if (normalizedCode) {
        const twoFactorToken = await prisma.twoFactorToken.findUnique({
          where: {
            email_token: {
              email: user.email!,
              token: normalizedCode,
            },
          },
        });

        if (!twoFactorToken) {
          return NextResponse.json(
            { error: "Invalid 2FA code" },
            { status: 401 },
          );
        }

        if (new Date() > twoFactorToken.expires) {
          return NextResponse.json(
            { error: "2FA code expired" },
            { status: 401 },
          );
        }

        await prisma.twoFactorToken.delete({
          where: { id: twoFactorToken.id },
        });

        // Create confirmation (optional, skipping for now)
      } else {
        // If 2FA enabled but no code provided, we return 401 with specific error
        // But wait, NextAuth authorize might treat any error as failure.
        // We need to distinguish "Password Wrong" vs "2FA Required".
        // But in our flow, we only call this when we HAVE the code (if 2FA required).
        // OR if we are just checking password (initial step).
        // Actually, the initial step is done by the Server Action.
        // So when `signIn` is called, it MUST succeed.
        // So if 2FA is enabled and code is missing, it's an error.
        return NextResponse.json(
          { error: "2FA code required" },
          { status: 401 },
        );
      }
    }

    // Return user without password
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
      onboardingCompleted: user.onboardingCompleted,
      clientInterests: user.clientInterests,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error("[Auth Verify Error]", error);
    if (isPrismaMissingColumnError(error, "webAuthnCredentialId")) {
      return NextResponse.json(
        { error: getAuthTemporaryUnavailableMessage() },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}
