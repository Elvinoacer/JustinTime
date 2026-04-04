"use server";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";
import { headers } from "next/headers";
import {
  AUTH_RATE_LIMIT_ERROR,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";
import {
  resendTwoFactorChallenge,
  verifyCredentialsLogin,
} from "@/lib/auth/lifecycle";

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
    const result = await verifyCredentialsLogin({
      email,
      password,
      requireTwoFactorCode: false,
    });

    if (result.status === "success") {
      return { success: true };
    }

    if (result.status === "two-factor-required") {
      return { twoFactor: true };
    }

    return { error: result.message };
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

    const result = await resendTwoFactorChallenge(normalizedEmail);
    if (!result.success) {
      return { error: result.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Resend 2FA error:", error);
    if (isPrismaMissingColumnError(error, "webAuthnCredentialId")) {
      return { error: getAuthTemporaryUnavailableMessage() };
    }
    return { error: "Something went wrong" };
  }
}
