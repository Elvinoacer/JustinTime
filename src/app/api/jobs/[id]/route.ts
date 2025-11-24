import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateJobSchema } from "@/lib/validations/schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true, image: true, phone: true } },
        category: true,
        _count: { select: { proposals: true } },
      },
    });

    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("[JOB_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    if (existingJob.clientId !== session.user.id && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await request.json();
    
    // If category is provided as a slug, look it up and get the ID
    let categoryId = existingJob.categoryId; // Keep existing if not updating
    if (body.category) {
      const category = await prisma.category.findUnique({
        where: { slug: body.category },
      });
      if (!category) {
        return new NextResponse("Invalid category", { status: 400 });
      }
      categoryId = category.id;
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
  { params }: { params: Promise<{ id: string }> }
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

    if (existingJob.clientId !== session.user.id && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.job.delete({ where: { id } });

    return NextResponse.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("[JOB_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
