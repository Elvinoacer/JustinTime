import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createJobSchema } from "@/lib/validations/schemas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (searchParams.get("status")) where.status = searchParams.get("status");
    if (searchParams.get("category")) where.categoryId = searchParams.get("category");

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          client: { select: { id: true, name: true, image: true } },
          category: true,
          _count: { select: { proposals: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.job.count({ where }),
    ]);

    return NextResponse.json({
      items: jobs,
      total,
      page,
      pageSize,
      hasMore: skip + jobs.length < total,
    });
  } catch (error) {
    console.error("[JOBS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "CLIENT") {
      return new NextResponse("Only clients can post jobs", { status: 403 });
    }


    const body = await request.json();
    const validatedData = createJobSchema.parse(body);

    // Look up the category by slug (the form sends slug like "gardening", "plumbing", etc.)
    const category = await prisma.category.findUnique({
      where: { slug: validatedData.category },
    });

    if (!category) {
      return new NextResponse("Invalid category", { status: 400 });
    }
    
    const job = await prisma.job.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        budget: validatedData.budget,
        location: validatedData.location,
        categoryId: category.id,
        clientId: session.user.id,
        images: validatedData.images || [], // Include images
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("[JOBS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
