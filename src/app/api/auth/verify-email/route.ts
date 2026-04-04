import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";
import {
  AUTH_RATE_LIMIT_ERROR,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  const clientIp = getClientIpFromHeaders(request.headers);

  if (!clientIp) {
    return NextResponse.json(
      { error: "Unable to validate request origin" },
      { status: 400 },
    );
  }

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  if (token.length > 128) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const limitResult = enforceRateLimits("auth.verify-email", [
    {
      suffix: `ip:${clientIp}`,
      limit: 60,
      windowMs: 15 * 60 * 1000,
    },
    {
      suffix: `ip:${clientIp}:token:${token}`,
      limit: 10,
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

  try {
    const verificationResult = await prisma.$transaction(async (tx) => {
      const verificationToken = await tx.verificationToken.findUnique({
        where: { token },
      });

      if (!verificationToken) {
        return { error: "Invalid token" } as const;
      }

      if (new Date() > verificationToken.expires) {
        return { error: "Token expired" } as const;
      }

      const existingUser = await tx.user.findUnique({
        where: { email: verificationToken.identifier },
        select: { id: true },
      });

      if (!existingUser) {
        return { error: "User not found" } as const;
      }

      await tx.user.update({
        where: { email: verificationToken.identifier },
        data: {
          emailVerified: new Date(),
        },
        select: { id: true },
      });

      await tx.verificationToken.delete({
        where: { token },
      });

      return { success: true } as const;
    });

    if ("error" in verificationResult) {
      return NextResponse.json(
        { error: verificationResult.error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Email verified successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error verifying email:", error);
    if (isPrismaMissingColumnError(error, "webAuthnCredentialId")) {
      return NextResponse.json(
        { error: getAuthTemporaryUnavailableMessage() },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
