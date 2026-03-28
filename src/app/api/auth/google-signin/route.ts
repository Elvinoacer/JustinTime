import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";
import {
  AUTH_RATE_LIMIT_ERROR,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";

export async function POST(req: Request) {
  try {
    const { email, name, image } = await req.json();
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();
    const normalizedName =
      typeof name === "string" ? name.trim().slice(0, 80) : undefined;
    const normalizedImage =
      typeof image === "string" ? image.trim() : undefined;
    const clientIp = getClientIpFromHeaders(req.headers);

    if (!clientIp) {
      return new NextResponse("Unable to validate request origin", {
        status: 400,
      });
    }

    if (!normalizedEmail) {
      return new NextResponse("Email is required", { status: 400 });
    }

    if (normalizedEmail.length > 254) {
      return new NextResponse("Invalid email address", { status: 400 });
    }

    if ((normalizedImage?.length ?? 0) > 2048) {
      return new NextResponse("Invalid profile image URL", { status: 400 });
    }

    const limitResult = enforceRateLimits("auth.google-signin", [
      {
        suffix: `ip:${clientIp}`,
        limit: 40,
        windowMs: 15 * 60 * 1000,
      },
      {
        suffix: `ip:${clientIp}:email:${normalizedEmail}`,
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

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        image: true,
      },
    });

    if (existingUser) {
      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { email: normalizedEmail },
        data: {
          emailVerified: new Date(), // Verify email
          name: normalizedName, // Update name if changed
          // Only update image if user doesn't have one (preserve custom uploads)
          ...(!existingUser.image &&
            normalizedImage && { image: normalizedImage }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          onboardingCompleted: true,
          emailVerified: true,
        },
      });
      return NextResponse.json(updatedUser);
    } else {
      // Create new user for Google sign-in
      const newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: normalizedName,
          image: normalizedImage,
          emailVerified: new Date(), // Mark as verified
          role: "CLIENT", // Default role
          onboardingCompleted: false,
        },
      });
      return NextResponse.json(newUser);
    }
  } catch (error: any) {
    console.error("[GOOGLE_SIGNIN_ERROR]", error);
    if (isPrismaMissingColumnError(error, "webAuthnCredentialId")) {
      return new NextResponse(getAuthTemporaryUnavailableMessage(), {
        status: 503,
      });
    }
    return new NextResponse(error?.message || "Internal Error", {
      status: 500,
    });
  }
}
