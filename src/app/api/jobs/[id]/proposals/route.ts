import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createProposalSchema } from "@/lib/validations/schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    const proposals = await prisma.proposal.findMany({
      where: { jobId: id },
      include: {
        provider: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(proposals);
  } catch (error) {
    console.error("[PROPOSALS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "PROVIDER") {
      return new NextResponse("Only providers can submit proposals", { status: 403 });
    }

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    if (job.status !== "OPEN") {
      return new NextResponse("This job is no longer accepting proposals", { status: 409 });
    }

    const existingProposal = await prisma.proposal.findFirst({
      where: { jobId: id, providerId: session.user.id },
    });

    if (existingProposal) {
      return new NextResponse("You have already submitted a proposal for this job", { status: 409 });
    }

    const body = await request.json();
    const validatedData = createProposalSchema.parse(body);

    const proposal = await prisma.proposal.create({
      data: {
        jobId: id,
        providerId: session.user.id,
        price: validatedData.amount,
        coverLetter: validatedData.message,
      },
      include: {
        provider: { select: { id: true, name: true, image: true } },
        job: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error("[PROPOSALS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
