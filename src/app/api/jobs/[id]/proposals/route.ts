import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { submitProposal } from "@/lib/proposals/submitProposal";
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
        provider: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: {
              select: {
                isVerified: true,
                verificationStatus: true,
                skills: true,
                certifications: true,
              },
            },
            receivedReviews: {
              select: { rating: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const jobBookings = await prisma.booking.findMany({
      where: {
        jobId: id,
        providerId: {
          in: proposals.map((proposal) => proposal.providerId),
        },
      },
      select: {
        id: true,
        providerId: true,
      },
    });

    const bookingByProviderId = new Map(
      jobBookings.map((booking) => [booking.providerId, booking.id]),
    );

    const proposalsWithTrust = proposals.map((proposal) => {
      const ratings = proposal.provider.receivedReviews.map((r) => r.rating);
      const reviewCount = ratings.length;
      const avgRating =
        reviewCount > 0
          ? Number(
              (
                ratings.reduce((sum, rating) => sum + rating, 0) / reviewCount
              ).toFixed(1),
            )
          : 0;

      const providerProfile = proposal.provider.profile;

      return {
        ...proposal,
        bookingId: bookingByProviderId.get(proposal.providerId) ?? null,
        provider: {
          id: proposal.provider.id,
          name: proposal.provider.name,
          image: proposal.provider.image,
          avgRating,
          reviewCount,
          isVerified:
            Boolean(providerProfile?.isVerified) ||
            providerProfile?.verificationStatus === "VERIFIED",
          skills: providerProfile?.skills ?? [],
          certifications: providerProfile?.certifications ?? [],
        },
      };
    });

    return NextResponse.json(proposalsWithTrust);
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

    const body = await request.json();
    const validatedData = createJobProposalSchema.parse(body);

    const proposal = await submitProposal({
      providerId: session.user.id,
      input: {
        jobId: id,
        amount: validatedData.amount,
        message: validatedData.message,
        price: validatedData.price,
        coverLetter: validatedData.coverLetter,
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

    if (error instanceof Error) {
      if (error.message === "JOB_NOT_FOUND") {
        return new NextResponse("Job not found", { status: 404 });
      }
      if (error.message === "JOB_NOT_OPEN") {
        return new NextResponse("This job is no longer accepting proposals", {
          status: 409,
        });
      }
      if (error.message === "MAX_APPLICANTS_REACHED") {
        return new NextResponse("This job has reached its applicant limit", {
          status: 409,
        });
      }
      if (error.message === "PROPOSAL_ALREADY_EXISTS") {
        return new NextResponse(
          "You have already submitted a proposal for this job",
          { status: 409 },
        );
      }
      if (error.message === "INSUFFICIENT_CREDITS") {
        return NextResponse.json(
          {
            error: "Weekly limit reached & Insufficient Credits",
            message:
              "You reached your weekly proposal limit. Purchase Lead Credits to continue.",
          },
          { status: 429 },
        );
      }
    }

    console.error("[PROPOSALS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
