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
        userId: session.user.id,
        platform,
        lastSeenAt: new Date(),
        revokedAt: null,
      },
      create: {
        userId: session.user.id,
        token,
        platform,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error storing FCM token:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
    };

    const where = body.token
      ? {
          userId: session.user.id,
          token: body.token,
          revokedAt: null,
        }
      : {
          userId: session.user.id,
          platform: "web",
          revokedAt: null,
        };

    const revoked = await prisma.userToken.updateMany({
      where,
      data: {
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      revokedCount: revoked.count,
    });
  } catch (error) {
    console.error("Error revoking FCM token:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
