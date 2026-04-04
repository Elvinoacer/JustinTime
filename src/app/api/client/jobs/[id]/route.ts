import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !hasAnyRole(session.user, ["CLIENT"])) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        category: true,
        _count: { select: { proposals: true } },
        proposals: {
          where: {
            status: { in: ["PENDING", "ACCEPTED", "REJECTED"] },
          },
          select: {
            id: true,
            status: true,
            price: true,
            coverLetter: true,
            estimatedDays: true,
            attachments: true,
            createdAt: true,
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    // Ensure the job belongs to the client
    if (job.clientId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Return client-safe job data
    return NextResponse.json({
      id: job.id,
      title: job.title,
      description: job.description,
      budget: job.budget,
      location: job.location,
      latitude: job.latitude,
      longitude: job.longitude,
      status: job.status,
      deadline: job.deadline,
      maxApplicants: job.maxApplicants,
      maxAcceptedProviders: job.maxAcceptedProviders,
      images: job.images,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      category: job.category,
      _count: job._count,
      proposals: job.proposals,
    });
  } catch (error) {
    console.error("Error fetching client job:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
