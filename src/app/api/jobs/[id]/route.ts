import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateJobSchema } from "@/lib/validations/schemas";
import { hasRole } from "@/lib/auth/roles";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        category: true,
        _count: { select: { proposals: true } },
      },
    });

    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    const acceptedProposalsCount = await prisma.proposal.count({
      where: {
        jobId: id,
        status: "ACCEPTED",
      },
    });

    const effectiveMaxAcceptedProviders =
      typeof job.maxAcceptedProviders === "number" &&
      job.maxAcceptedProviders > 0
        ? job.maxAcceptedProviders
        : 1;
    const acceptanceSlotsRemaining = Math.max(
      effectiveMaxAcceptedProviders - acceptedProposalsCount,
      0,
    );
    const acceptingMoreProviders =
      job.status === "OPEN" && acceptanceSlotsRemaining > 0;

    return NextResponse.json({
      ...job,
      acceptedProposalsCount,
      effectiveMaxAcceptedProviders,
      acceptanceSlotsRemaining,
      acceptingMoreProviders,
    });
  } catch (error) {
    console.error("[JOB_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const existingJob = await prisma.job.findUnique({ where: { id } });
    if (!existingJob) {
      return new NextResponse("Job not found", { status: 404 });
    }

    if (
      existingJob.clientId !== session.user.id &&
      !hasRole(session.user, "ADMIN")
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = updateJobSchema.parse(await request.json());

    // Accept category ID (preferred) and keep a slug fallback for compatibility.
    let categoryId = existingJob.categoryId; // Keep existing if not updating
    if (body.category) {
      let category = await prisma.category.findUnique({
        where: { id: body.category },
      });
      if (!category) {
        category = await prisma.category.findUnique({
          where: { slug: body.category },
        });
      }
      if (!category) {
        return new NextResponse("Invalid category", { status: 400 });
      }
      categoryId = category.id;
    }

    const deadline = body.deadline ? new Date(body.deadline) : undefined;
    if (deadline && Number.isNaN(deadline.getTime())) {
      return new NextResponse("Invalid deadline", { status: 400 });
    }

    const nextMaxApplicants =
      body.maxApplicants !== undefined
        ? body.maxApplicants
        : existingJob.maxApplicants;
    const nextMaxAcceptedProviders =
      body.maxAcceptedProviders !== undefined
        ? body.maxAcceptedProviders
        : existingJob.maxAcceptedProviders;

    if (
      typeof nextMaxApplicants === "number" &&
      typeof nextMaxAcceptedProviders === "number" &&
      nextMaxAcceptedProviders > nextMaxApplicants
    ) {
      return new NextResponse(
        "Accepted providers limit cannot exceed max applicants",
        { status: 400 },
      );
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        budget: body.budget,
        location: body.location,
        categoryId,
        ...(body.images && { images: body.images }),
        ...(body.status && { status: body.status }),
        ...(body.deadline !== undefined && { deadline }),
        ...(body.maxApplicants !== undefined && {
          maxApplicants: body.maxApplicants,
        }),
        ...(body.maxAcceptedProviders !== undefined && {
          maxAcceptedProviders: body.maxAcceptedProviders,
        }),
      },
      include: {
        client: { select: { id: true, name: true, image: true } },
        category: true,
      },
    });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error("[JOB_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const existingJob = await prisma.job.findUnique({ where: { id } });
    if (!existingJob) {
      return new NextResponse("Job not found", { status: 404 });
    }

    if (
      existingJob.clientId !== session.user.id &&
      !hasRole(session.user, "ADMIN")
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.job.delete({ where: { id } });

    return NextResponse.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("[JOB_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
