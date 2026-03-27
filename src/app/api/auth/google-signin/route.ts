import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  getAuthTemporaryUnavailableMessage,
  isPrismaMissingColumnError,
} from "@/lib/auth/errors";

export async function POST(req: Request) {
  try {
    const { email, name, image } = await req.json();
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();
    const normalizedName =
      typeof name === "string" ? name.trim().slice(0, 80) : undefined;

    if (!normalizedEmail) {
      return new NextResponse("Email is required", { status: 400 });
    }

    if (normalizedEmail.length > 254) {
      return new NextResponse("Invalid email address", { status: 400 });
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
          ...(!existingUser.image && { image }),
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
          image,
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
