import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { token, platform = "web" } = await req.json();

    if (!token) {
      return new NextResponse("Token is required", { status: 400 });
    }

    // Upsert token to avoid duplicates
    await prisma.userToken.upsert({
      where: { token },
      update: { 
        updatedAt: new Date(),
        userId: session.user.id // Ensure token belongs to current user
      },
      create: {
        userId: session.user.id,
        token,
        platform,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error storing FCM token:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
