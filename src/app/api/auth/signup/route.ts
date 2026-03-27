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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictError("User with this email already exists");
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
        phone: validatedData.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    });

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
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
    await sendVerificationEmail(
      user.email!,
      user.name || "User",
      verificationUrl,
    );

    // Return success - client will then sign in with NextAuth
    return successResponse(
      {
        user,
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
