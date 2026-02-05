import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;

   // Fetch all badges with user's progress
    const badges = await prisma.badge.findMany({
      where: { isActive: true },
      include: {
        userBadges: {
          where: { userId },
          select: {
            id: true,
            awardedAt: true,
            progress: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { points: 'asc' }
      ]
    });

    // Transform response
    const badgesWithStatus = badges.map(badge => ({
      id: badge.id,
      slug: badge.slug,
      name: badge.name,
      description: badge.description,
      category: badge.category,
      icon: badge.icon,
      color: badge.color,
      points: badge.points,
      requirement: badge.requirement,
      earned: badge.userBadges.length > 0,
      awardedAt: badge.userBadges[0]?.awardedAt || null,
      progress: badge.userBadges[0]?.progress || 0
    }));

    // Calculate user stats
    const earnedBadges = badgesWithStatus.filter(b => b.earned);
    const totalPoints = earnedBadges.reduce((sum, b) => sum + b.points, 0);

    return NextResponse.json({
      badges: badgesWithStatus,
      stats: {
        totalBadges: badges.length,
        earnedBadges: earnedBadges.length,
        totalPoints,
        completionPercentage: Math.round((earnedBadges.length / badges.length) * 100)
      }
    });
  } catch (error) {
    console.error("[BADGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
