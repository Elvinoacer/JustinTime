import { NextRequest, NextResponse } from "next/server";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";
import {
  AUTH_RATE_LIMIT_ERROR,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";
import {
  buildAuthSessionUser,
  verifyCredentialsLogin,
} from "@/lib/auth/lifecycle";

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

    const result = await verifyCredentialsLogin({
      email: normalizedEmail,
      password: normalizedPassword,
      code: typeof code === "string" ? code : undefined,
      requireTwoFactorCode: true,
    });

    if (result.status !== "success") {
      const statusCode =
        result.status === "banned"
          ? 403
          : result.status === "two-factor-expired" ||
              result.status === "two-factor-invalid" ||
              result.status === "email-unverified" ||
              result.status === "invalid"
            ? 401
            : 400;

      return NextResponse.json({ error: result.message }, { status: statusCode });
    }

    return NextResponse.json(buildAuthSessionUser(result.user));
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
