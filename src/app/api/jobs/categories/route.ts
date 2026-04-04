import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            jobs: {
              where: {
                status: "OPEN",
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const totalJobs = categories.reduce((sum, category) => {
      return sum + category._count.jobs;
    }, 0);

    return successResponse([
      {
        id: "all",
        name: "All categories",
        slug: "all",
        count: totalJobs,
      },
      ...categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: category._count.jobs,
      })),
    ]);
  } catch (error) {
    return handleError(error);
  }
}
