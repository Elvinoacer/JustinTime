import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createJobProposalSchema = z
  .object({
    amount: z.number().positive().optional(),
    message: z.string().min(10).optional(),
    price: z.number().positive().optional(),
    coverLetter: z.string().min(10).optional(),
    estimatedDays: z.number().int().positive().optional(),
    attachments: z.array(z.string()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.amount == null && value.price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Proposal amount is required",
        path: ["price"],
      });
    }

    if (!value.message && !value.coverLetter) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Proposal message is required",
        path: ["coverLetter"],
      });
    }
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    });
    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isJobOwner = job.clientId === session.user.id;
    const isProvider = session.user.role === "PROVIDER";

    if (!isAdmin && !isJobOwner && !isProvider) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const proposals = await prisma.proposal.findMany({
      where: {
        jobId: id,
        ...(isAdmin || isJobOwner ? {} : { providerId: session.user.id }),
      },
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "PROVIDER") {
      return new NextResponse("Only providers can submit proposals", {
        status: 403,
      });
    }

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    if (job.status !== "OPEN") {
      return new NextResponse("This job is no longer accepting proposals", {
        status: 409,
      });
    }

    if (
      typeof job.maxApplicants === "number" &&
      job.maxApplicants > 0
    ) {
      const proposalCount = await prisma.proposal.count({
        where: { jobId: id },
      });

      if (proposalCount >= job.maxApplicants) {
        return new NextResponse("This job has reached its applicant limit", {
          status: 409,
        });
      }
    }

    const existingProposal = await prisma.proposal.findFirst({
      where: { jobId: id, providerId: session.user.id },
    });

    if (existingProposal) {
      return new NextResponse(
        "You have already submitted a proposal for this job",
        { status: 409 },
      );
    }

    const body = await request.json();
    const validatedData = createJobProposalSchema.parse(body);

    const proposal = await prisma.proposal.create({
      data: {
        jobId: id,
        providerId: session.user.id,
        price: validatedData.price ?? validatedData.amount ?? 0,
        coverLetter:
          validatedData.coverLetter ?? validatedData.message ?? "",
        estimatedDays: validatedData.estimatedDays,
        attachments: validatedData.attachments,
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
