import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

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
        { status: 400 }
      );
    }

    // Rate-limit: check if a token was created in the last 2 minutes
    // A 24h token created <2 min ago still has >23h58m remaining
    const twoMinutesAgo = new Date(Date.now() + 23 * 60 * 60 * 1000 + 58 * 60 * 1000);
    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        expires: { gt: twoMinutesAgo },
      },
    });

    if (recentToken) {
      return NextResponse.json(
        { error: "Please wait a few minutes before requesting another link." },
        { status: 429 }
      );
    }

    // Delete old tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const baseUrl =
      process.env.NEXTAUTH_URL || "https://justintime.gtss.software";
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    await sendVerificationEmail(email, user.name || "User", verificationUrl);

    return NextResponse.json({
      message: "Verification email sent successfully.",
    });
  } catch (error) {
    console.error("[RESEND_VERIFICATION_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to send verification email. Please try again." },
      { status: 500 }
    );
  }
}
