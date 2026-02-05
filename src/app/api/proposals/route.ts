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

    // Check subscription plan and weekly proposal limit for FREE users
    // Check subscription, wallet, and limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscription: {
          select: { plan: true, isActive: true },
        },
        wallet: {
          select: { id: true, creditBalance: true },
        },
      },
    });

    const userPlan = user?.subscription?.plan || "FREE";
    const isActiveSubscription = user?.subscription?.isActive === true;
    let creditCost = 0;

    // Logic for FREE plan limits vs Credits
    if (userPlan === "FREE" || !isActiveSubscription) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const weeklyProposalCount = await prisma.proposal.count({
        where: {
          providerId: session.user.id,
          createdAt: { gte: oneWeekAgo },
        },
      });

      const WEEKLY_LIMIT = 14;

      if (weeklyProposalCount >= WEEKLY_LIMIT) {
        // Limit reached, check if they can pay with credits
        const PROPOSAL_CREDIT_COST = 2; // Cost: 2 Credits per extra proposal
        
        if (!user?.wallet || user.wallet.creditBalance < PROPOSAL_CREDIT_COST) {
          return NextResponse.json(
            {
              error: "Weekly limit reached & Insufficient Credits",
              message: `You reached the weekly limit of ${WEEKLY_LIMIT} proposals. You can continue by purchasing Lead Credits (Cost: ${PROPOSAL_CREDIT_COST} credits/proposal).`,
              limit: WEEKLY_LIMIT,
              current: weeklyProposalCount,
              credits: user?.wallet?.creditBalance || 0,
            },
            { status: 429 }
          );
        }
        
        // User has enough credits, proceed with deduction
        creditCost = PROPOSAL_CREDIT_COST;
      }
    }

    // Create proposal
    // Create proposal (and deduct credits if applicable)
    const proposal = await prisma.$transaction(async (tx) => {
      // Deduct credits if cost > 0
      if (creditCost > 0 && user?.wallet) {
        await tx.wallet.update({
          where: { id: user.wallet.id },
          data: { creditBalance: { decrement: creditCost } },
        });

        // Record usage (using PAYMENT type for now or specific if available)
        await tx.transaction.create({
          data: {
            walletId: user.wallet.id,
            amount: 0, // It's credits, not cash value directly tracked here visually? Or track implicit value?
            // Actually schema amount is Decimal(10,2). Credits are Int. 
            // We shouldn't mix them in 'amount' unless we convert.
            // Let's store 0 for 'amount' and describe in text, or add 'creditAmount' field later. 
            // For now, keep amount 0.
            type: "PAYMENT", // Using PAYMENT as placeholder for Credit Spend
            description: `Used ${creditCost} Lead Credits for proposal on Job ${validatedData.jobId}`,
          },
        });
      }

      return await tx.proposal.create({
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
