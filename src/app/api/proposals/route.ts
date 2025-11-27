import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createProposalSchema = z.object({
  jobId: z.string(),
  coverLetter: z.string().min(50, "Cover letter must be at least 50 characters"),
  price: z.number().positive("Price must be greater than 0"),
  estimatedDays: z.number().optional(),
  attachments: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "PROVIDER") {
      return new NextResponse("Only providers can submit proposals", { status: 403 });
    }

    const body = await request.json();
    const validatedData = createProposalSchema.parse(body);

    // Check if job exists and is open
    const job = await prisma.job.findUnique({
      where: { id: validatedData.jobId },
      select: { id: true, status: true, clientId: true },
    });

    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    if (job.status !== "OPEN") {
      return new NextResponse("Job is not open for proposals", { status: 400 });
    }

    // Check if provider already submitted a proposal
    const existingProposal = await prisma.proposal.findFirst({
      where: {
        jobId: validatedData.jobId,
        providerId: session.user.id,
      },
    });

    if (existingProposal) {
      return new NextResponse("You have already submitted a proposal for this job", { status: 400 });
    }

    // Create proposal
    const proposal = await prisma.proposal.create({
      data: {
        jobId: validatedData.jobId,
        providerId: session.user.id,
        coverLetter: validatedData.coverLetter,
        price: validatedData.price,
        estimatedDays: validatedData.estimatedDays,
        attachments: validatedData.attachments,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // TODO: Create notification for client about new proposal
    // await createNotification(job.clientId, "NEW_PROPOSAL", proposalId)

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[PROPOSALS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "PROVIDER") {
      return new NextResponse("Only providers can view proposals", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const status = searchParams.get("status");
    const skip = (page - 1) * pageSize;

    const where: any = { providerId: session.user.id };
    if (status) where.status = status;

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          job: {
            include: {
              client: { select: { id: true, name: true, image: true } },
              category: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.proposal.count({ where }),
    ]);

    return NextResponse.json({
      items: proposals,
      total,
      page,
      pageSize,
      hasMore: skip + proposals.length < total,
    });
  } catch (error) {
    console.error("[PROPOSALS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
