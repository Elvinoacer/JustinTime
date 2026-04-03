import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasAnyRole(session.user, ["PROVIDER", "ADMIN"])) {
      return new NextResponse("Forbidden - Provider access required", {
        status: 403,
      });
    }

    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          {
            bookings: {
              some: {
                providerId: session.user.id,
              },
            },
          },
          {
            proposals: {
              some: {
                providerId: session.user.id,
                status: "ACCEPTED",
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        clientName: job.client?.name || null,
      })),
    });
  } catch (error) {
    console.error("[PROVIDER_EXPENSE_JOBS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
