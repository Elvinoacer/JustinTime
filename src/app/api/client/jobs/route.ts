import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { hasClientAccess } from "@/lib/auth/clientAccess";
import type { Prisma } from "@/generated/prisma/client";
import { JobStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasClientAccess(session.user)) {
      return NextResponse.json(
        { error: "Client profile required" },
        { status: 403 },
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
    );
    const requestedPageSize = Number.parseInt(
      searchParams.get("pageSize") || searchParams.get("limit") || "5",
      10,
    );
    const pageSize = Math.min(
      Math.max(Number.isFinite(requestedPageSize) ? requestedPageSize : 5, 1),
      100,
    );
    const status = searchParams.get("status")?.trim();
    const search = searchParams.get("search")?.trim();

    const where: Prisma.JobWhereInput = {
      clientId: userId,
    };

    if (
      status &&
      status !== "ALL" &&
      (Object.values(JobStatus) as string[]).includes(status)
    ) {
      where.status = status as JobStatus;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: { proposals: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.job.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
