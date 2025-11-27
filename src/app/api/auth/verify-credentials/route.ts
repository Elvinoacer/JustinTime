import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth/password";

/**
 * Internal API endpoint for credential verification
 * This runs in Node.js context, not Edge
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, code } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json({ error: "Please verify your email address" }, { status: 401 });
    }

    // 2FA Verification
    if (user.isTwoFactorEnabled) {

      if (code) {
        const twoFactorToken = await prisma.twoFactorToken.findUnique({
          where: {
            email_token: {
              email: user.email!,
              token: code,
            },
          },
        });

        if (!twoFactorToken) {
          return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 });
        }

        if (new Date() > twoFactorToken.expires) {
          return NextResponse.json({ error: "2FA code expired" }, { status: 401 });
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
        return NextResponse.json({ error: "2FA code required" }, { status: 401 });
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
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
