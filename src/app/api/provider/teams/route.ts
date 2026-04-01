import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasRole(session.user, "PROVIDER")) {
      return new NextResponse("Only providers can access teams", {
        status: 403,
      });
    }

    const [ownedTeams, memberTeams] = await Promise.all([
      prisma.team.findMany({
        where: {
          ownerId: session.user.id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.teamMember.findMany({
        where: {
          userId: session.user.id,
          team: {
            isActive: true,
          },
        },
        select: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const byId = new Map<string, { id: string; name: string }>();

    for (const team of ownedTeams) {
      byId.set(team.id, team);
    }

    for (const membership of memberTeams) {
      byId.set(membership.team.id, membership.team);
    }

    const items = Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[PROVIDER_TEAMS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
