import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { submitProposal } from "@/lib/proposals/submitProposal";
import { toSubmitProposalErrorResponse } from "@/lib/proposals/errorResponses";
import { z } from "zod";
import { hasRole } from "@/lib/auth/roles";

const createProposalSchema = z.object({
  jobId: z.string(),
  coverLetter: z
    .string()
    .min(50, "Cover letter must be at least 50 characters"),
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

    if (!hasRole(session.user, "PROVIDER")) {
      return new NextResponse("Only providers can submit proposals", {
        status: 403,
      });
    }

    const body = await request.json();
    const validatedData = createProposalSchema.parse(body);

    const proposal = await submitProposal({
      providerId: session.user.id,
      input: {
        jobId: validatedData.jobId,
        coverLetter: validatedData.coverLetter,
        price: validatedData.price,
        estimatedDays: validatedData.estimatedDays,
        attachments: validatedData.attachments,
      },
      enforceCreditLimit: true,
      notifyClient: true,
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    const proposalErrorResponse = toSubmitProposalErrorResponse(error);
    if (proposalErrorResponse) {
      return proposalErrorResponse;
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

    if (!hasRole(session.user, "PROVIDER")) {
      return new NextResponse("Only providers can view proposals", {
        status: 403,
      });
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
