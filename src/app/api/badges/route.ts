import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/roles";
import { getBadgesForUser } from "@/lib/gamification/badge-service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");
    const targetUserId = requestedUserId || session.user.id;
    const canReadTargetUser =
      targetUserId === session.user.id || hasRole(session.user, "ADMIN");

    if (!canReadTargetUser) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const result = await getBadgesForUser(targetUserId);

    return NextResponse.json({
      badges: result.badges,
      stats: result.stats,
    });
  } catch (error) {
    console.error("[BADGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
