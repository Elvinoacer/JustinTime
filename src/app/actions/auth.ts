"use server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth/password";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";
import { sendTwoFactorTokenEmail } from "@/lib/email";
import crypto from "crypto";
import { headers } from "next/headers";
import {
  AUTH_RATE_LIMIT_ERROR,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";

export async function loginWithCredentials(formData: FormData) {
  const requestHeaders = await headers();
  const clientIp = getClientIpFromHeaders(requestHeaders);

  if (!clientIp) {
    return { error: "Unable to validate request origin" };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (email.length > 254 || password.length > 128) {
    return { error: "Invalid email or password format" };
  }

  const limitResult = enforceRateLimits("auth.login-action", [
    {
      suffix: `ip:${clientIp}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    },
    {
      suffix: `ip:${clientIp}:email:${email || "missing"}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    },
  ]);

  if (!limitResult.ok) {
    return { error: AUTH_RATE_LIMIT_ERROR };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        emailVerified: true,
        isTwoFactorEnabled: true,
      },
    });

    if (!user || !user.password) {
      return { error: "Invalid credentials" };
    }

    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      return { error: "Invalid credentials" };
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return { error: "Please verify your email address" };
    }

    // Check if 2FA is enabled
    if (user.isTwoFactorEnabled) {
      // Generate 2FA token
      const token = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete existing token if any
      await prisma.twoFactorToken.deleteMany({
        where: { email: user.email! },
      });

      // Create new token
      await prisma.twoFactorToken.create({
        data: {
          email: user.email!,
          token,
          expires,
        },
      });

      // Send email
      await sendTwoFactorTokenEmail(user.email!, user.name || "User", token);

      return { twoFactor: true };
    }

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    if (isPrismaMissingColumnError(error, "webAuthnCredentialId")) {
      return { error: getAuthTemporaryUnavailableMessage() };
    }
    return { error: "Something went wrong" };
  }
}

export async function resendTwoFactorToken(email: string) {
  try {
    const requestHeaders = await headers();
    const clientIp = getClientIpFromHeaders(requestHeaders);

    if (!clientIp) {
      return { error: "Unable to validate request origin" };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.length > 254) {
      return { error: "Invalid email address" };
    }

    const limitResult = enforceRateLimits("auth.resend-2fa", [
      {
        suffix: `ip:${clientIp}`,
        limit: 15,
        windowMs: 15 * 60 * 1000,
      },
      {
        suffix: `ip:${clientIp}:email:${normalizedEmail}`,
        limit: 5,
        windowMs: 15 * 60 * 1000,
      },
    ]);

    if (!limitResult.ok) {
      return { error: AUTH_RATE_LIMIT_ERROR };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        email: true,
        name: true,
        isTwoFactorEnabled: true,
      },
    });

    if (!user || !user.isTwoFactorEnabled) {
      return { error: "User not found or 2FA not enabled" };
    }

    // Generate 2FA token
    const token = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete existing token if any
    await prisma.twoFactorToken.deleteMany({
      where: { email: user.email! },
    });

    // Create new token
    await prisma.twoFactorToken.create({
      data: {
        email: user.email!,
        token,
        expires,
      },
    });

    // Send email
    await sendTwoFactorTokenEmail(user.email!, user.name || "User", token);

    return { success: true };
  } catch (error) {
    console.error("Resend 2FA error:", error);
    if (isPrismaMissingColumnError(error, "webAuthnCredentialId")) {
      return { error: getAuthTemporaryUnavailableMessage() };
    }
    return { error: "Something went wrong" };
  }
}
