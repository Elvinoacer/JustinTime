import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { checkAndAwardBadges } from "@/lib/gamification/badge-checker";
import { hasRole } from "@/lib/auth/roles";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasRole(session.user, "ADMIN")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      userId?: string;
      trigger?:
        | "MANUAL"
        | "BOOKING_COMPLETED"
        | "REVIEW_CREATED"
        | "PROFILE_UPDATED"
        | "REVENUE_SETTLED"
        | "ACCOUNT_CREATED"
        | "ADMIN_MANUAL_AWARD";
      eventId?: string;
    };

    const targetUserId =
      typeof body.userId === "string" && body.userId.trim().length > 0
        ? body.userId.trim()
        : session.user.id;

    const results = await checkAndAwardBadges(targetUserId, {
      trigger: body.trigger ?? "MANUAL",
      eventId:
        typeof body.eventId === "string" && body.eventId.trim().length > 0
          ? body.eventId.trim()
          : null,
      actorUserId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("[BADGES_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
