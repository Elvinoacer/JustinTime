import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { role, onboardingCompleted, clientInterests, skills, location, bio, image } = body;

    // Update user with common fields
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role,
        onboardingCompleted,
        clientInterests: clientInterests || [],
        ...(image && { image }), // Update image if provided
      },
    });

    // If provider, create or update profile
    if (role === "PROVIDER") {
      const { verificationStatus, idDocument } = body;
      
      await prisma.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          skills: skills || [],
          location,
          bio,
          verificationStatus: verificationStatus || "PENDING",
          idDocument,
          isVerified: verificationStatus === "VERIFIED",
        },
        update: {
          skills: skills || [],
          location,
          bio,
          verificationStatus: verificationStatus,
          idDocument,
          isVerified: verificationStatus === "VERIFIED",
        },
      });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[ONBOARDING_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
