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
    const { 
      role, 
      onboardingCompleted, 
      clientInterests, 
      skills, 
      location, 
      latitude,
      longitude,
      bio, 
      image,
      phone,
      hourlyRate,
      address
    } = body;

    // Update user with common fields
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role,
        onboardingCompleted,
        clientInterests: clientInterests || [],
        ...(image && { image }), // Update image if provided
        ...(phone && { phone }), // Update phone if provided
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
          latitude,
          longitude,
          bio,
          hourlyRate: hourlyRate ? Number(hourlyRate) : null,
          verificationStatus: "PENDING",
          idDocument,
          isVerified: false,
        },
        update: {
          skills: skills || [],
          location,
          latitude,
          longitude,
          bio,
          hourlyRate: hourlyRate ? Number(hourlyRate) : null,
          verificationStatus: "PENDING",
          idDocument,
          isVerified: false,
        },
      });
    }
    
    // If client, we might want to create a profile too or store address somewhere
    // For now, we can extend the User model or store in a separate ClientProfile
    // Since the schema doesn't have a specific client profile, we'll just ensure phone is saved above

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[ONBOARDING_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
