import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const currentUserId = session.user.id;

    if (!search || search.length < 2) {
      return NextResponse.json({ contacts: [] });
    }

    // Search for users (providers or clients)
    // Exclude current user
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        phone: true,
      },
      take: 10,
    });

    return NextResponse.json({ contacts: users });
  } catch (error) {
    return handleError(error);
  }
}
