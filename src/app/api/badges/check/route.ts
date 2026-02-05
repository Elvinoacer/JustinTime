import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { checkAndAwardBadges } from "@/lib/gamification/badge-checker";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const results = await checkAndAwardBadges(session.user.id);

    return NextResponse.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error("[BADGES_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
