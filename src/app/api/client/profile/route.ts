import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        clientInterests: true,
        // Add other client-specific fields here if needed
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[CLIENT_PROFILE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, phone, image, clientInterests } = body;

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    });

    // If phone is being updated and it's different from current phone
    if (phone !== undefined && phone !== null && phone !== "" && phone !== currentUser?.phone) {
      // Check if phone already exists for another user
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: phone,
          id: { not: session.user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "This phone number is already in use by another account" },
          { status: 400 }
        );
      }
    }

    // Build update object with only defined fields
    const updateData: {
      name?: string;
      phone?: string | null;
      image?: string;
      clientInterests?: string[];
    } = {};

    if (name !== undefined) updateData.name = name;
    // Only include phone if it's different from current value
    if (phone !== undefined && phone !== currentUser?.phone) {
      updateData.phone = phone || null;
    }
    if (image !== undefined) updateData.image = image;
    if (clientInterests !== undefined) updateData.clientInterests = clientInterests;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[CLIENT_PROFILE_UPDATE]", error);
    return NextResponse.json(
      { error: "Failed to update profile. Please try again." },
      { status: 500 }
    );
  }
}
