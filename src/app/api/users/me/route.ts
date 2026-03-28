import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Otherwise, use session-based authentication
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Return user data with profile fields flattened or as is
    // For compatibility with frontend that might expect location/bio on user object
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      image: user.image,
      onboardingCompleted: user.onboardingCompleted,
      clientInterests: user.clientInterests,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      location: user.profile?.location || null,
      bio: user.profile?.bio || null,
      profile: user.profile,
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error("[USER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { name, phone, location, bio } = body;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone,
      },
    });

    // Handle Profile update for location/bio
    if (location !== undefined || bio !== undefined) {
      await prisma.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          location,
          bio,
        },
        update: {
          location,
          bio,
        },
      });
    }

    // Fetch updated user with profile to return complete data
    const finalUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { profile: true },
    });

    const userData = {
      id: finalUser?.id,
      name: finalUser?.name,
      email: finalUser?.email,
      role: finalUser?.role,
      phone: finalUser?.phone,
      image: finalUser?.image,
      onboardingCompleted: finalUser?.onboardingCompleted,
      createdAt: finalUser?.createdAt,
      updatedAt: finalUser?.updatedAt,
      location: finalUser?.profile?.location || null,
      bio: finalUser?.profile?.bio || null,
      profile: finalUser?.profile,
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error("[USER_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
