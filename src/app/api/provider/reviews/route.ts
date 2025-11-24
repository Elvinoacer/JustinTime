import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const reviews = await prisma.review.findMany({
      where: { targetId: userId },
      include: {
        author: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      client: review.author.name,
      clientImage: review.author.image,
      rating: review.rating,
      comment: review.comment,
      date: review.createdAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    }));

    return successResponse(formattedReviews);
  } catch (error) {
    return handleError(error);
  }
}
