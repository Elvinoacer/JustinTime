import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, name, image } = await req.json();

    if (!email) {
      return new NextResponse("Email is required", { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          emailVerified: new Date(), // Verify email
          name, // Update name if changed
          // Only update image if user doesn't have one (preserve custom uploads)
          ...(!existingUser.image && { image }),
        },
      });
      return NextResponse.json(updatedUser);
    } else {
      // Create new user for Google sign-in
      const newUser = await prisma.user.create({
        data: {
          email,
          name,
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
    return new NextResponse(error?.message || "Internal Error", { status: 500 });
  }
}
