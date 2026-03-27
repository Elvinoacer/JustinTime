"use server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth/password";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";
import { sendTwoFactorTokenEmail } from "@/lib/email";
import crypto from "crypto";

export async function loginWithCredentials(formData: FormData) {
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
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.length > 254) {
      return { error: "Invalid email address" };
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
