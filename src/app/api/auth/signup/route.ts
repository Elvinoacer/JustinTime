import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import {
  handleError,
  successResponse,
  ConflictError,
} from "@/lib/middleware/errorHandler";
import { signupSchema } from "@/lib/validations/schemas";
import { sendVerificationEmail } from "@/lib/email";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";
import crypto from "crypto";
import {
  AUTH_RATE_LIMIT_ERROR,
  clearRateLimitEntries,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";
import { getDefaultRolesForPrimaryRole } from "@/lib/auth/roles";
import { buildAppUrl } from "@/lib/app-url";
import { getPasswordValidationError } from "@/lib/auth/lifecycle";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientIp = getClientIpFromHeaders(request.headers);

    if (!clientIp) {
      return NextResponse.json(
        { error: "Unable to validate request origin" },
        { status: 400 },
      );
    }

    const rawEmail = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const rawName = String(body?.name ?? "").trim();
    const rawPassword = String(body?.password ?? "").trim();
    const rawReferralCode = body?.referralCode
      ? String(body.referralCode).trim().toUpperCase()
      : "";

    if (
      rawEmail.length > 254 ||
      rawName.length > 120 ||
      rawPassword.length > 128 ||
      rawReferralCode.length > 20
    ) {
      return NextResponse.json(
        { error: "Invalid signup payload" },
        { status: 400 },
      );
    }

    const limitResult = enforceRateLimits("auth.signup", [
      {
        suffix: `ip:${clientIp}`,
        limit: 12,
        windowMs: 60 * 60 * 1000,
      },
      {
        suffix: `ip:${clientIp}:email:${rawEmail || "missing"}`,
        limit: 4,
        windowMs: 60 * 60 * 1000,
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

    // Validate input
    const validatedData = signupSchema.parse(body);
    const passwordError = getPasswordValidationError(validatedData.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Resolve referrer before creating the new user
    let referrerId: string | null = null;
    if (validatedData.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: validatedData.referralCode },
        select: { id: true },
      });

      if (!referrer) {
        return NextResponse.json(
          { error: "Invalid referral code" },
          { status: 400 },
        );
      }

      referrerId = referrer.id;
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role || "CLIENT",
        roles: getDefaultRolesForPrimaryRole(validatedData.role || "CLIENT"),
        ...(referrerId ? { referredById: referrerId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (referrerId) {
      await prisma.referral.create({
        data: {
          referrerId,
          referredUserId: user.id,
          type: "SIGNUP",
          status: "PENDING",
          points: 100,
        },
      });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save verification token
    await prisma.verificationToken.create({
      data: {
        identifier: user.email!,
        token,
        expires,
      },
    });

    // Send verification email
    const verificationUrl = buildAppUrl(`/auth/verify-email?token=${token}`);
    await sendVerificationEmail(
      user.email!,
      user.name || "User",
      verificationUrl,
    );

    // Allow immediate first login attempt after successful signup.
    clearRateLimitEntries("auth.verify-credentials", [
      `ip:${clientIp}`,
      `ip:${clientIp}:email:${rawEmail || "missing"}`,
    ]);
    clearRateLimitEntries("auth.login-action", [
      `ip:${clientIp}`,
      `ip:${clientIp}:email:${rawEmail || "missing"}`,
    ]);
    clearRateLimitEntries("auth.nextauth", [
      `ip:${clientIp}`,
      `ip:${clientIp}:credentials-callback`,
      `ip:${clientIp}:signin`,
    ]);

    // Return success - client will then sign in with NextAuth
    return successResponse(
      {
        user: {
          ...user,
          roles: getDefaultRolesForPrimaryRole(user.role),
        },
        message:
          "Account created successfully. Please check your email to verify your account.",
      },
      201,
    );
  } catch (error) {
    if (isPrismaMissingColumnError(error, "webAuthnCredentialId")) {
      return NextResponse.json(
        { error: getAuthTemporaryUnavailableMessage() },
        { status: 503 },
      );
    }
    return handleError(error);
  }
}
