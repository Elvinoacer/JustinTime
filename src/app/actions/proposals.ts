"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getClientProposals(jobId?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const where: any = {
      job: {
        clientId: session.user.id,
      },
    };

    if (jobId) {
      where.jobId = jobId;
    }

    const proposals = await prisma.proposal.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profile: {
              select: {
                bio: true,
                location: true,
                hourlyRate: true,
                skills: true,
                isVerified: true,
                certifications: true,
                portfolio: true,
                socialLinks: true,
              },
            },
            receivedReviews: {
              select: {
                rating: true,
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            description: true,
            budget: true,
            status: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate average rating for each provider
    const proposalsWithRatings = proposals.map((proposal) => {
      const reviews = proposal.provider.receivedReviews;
      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      return {
        ...proposal,
        provider: {
          ...proposal.provider,
          avgRating: Number(avgRating.toFixed(1)),
          reviewCount: reviews.length,
          receivedReviews: undefined, // Remove the reviews array from response
        },
      };
    });

    return proposalsWithRatings;
  } catch (error) {
    console.error("Error fetching proposals:", error);
    throw new Error("Failed to fetch proposals");
  }
}

export async function acceptProposal(proposalId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Get the proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        job: true,
      },
    });

    if (!proposal) {
      throw new Error("Proposal not found");
    }

    // Verify the job belongs to the client
    if (proposal.job.clientId !== session.user.id) {
      throw new Error("Unauthorized");
    }

    // Update the proposal status
    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: "ACCEPTED",
      },
    });

    // Reject all other proposals for this job
    await prisma.proposal.updateMany({
      where: {
        jobId: proposal.jobId,
        id: {
          not: proposalId,
        },
      },
      data: {
        status: "REJECTED",
      },
    });

    // Update job status to IN_PROGRESS
    await prisma.job.update({
      where: { id: proposal.jobId },
      data: {
        status: "IN_PROGRESS",
      },
    });

    revalidatePath("/client/proposals");
    revalidatePath("/client/jobs");

    return { success: true, proposal: updatedProposal };
  } catch (error) {
    console.error("Error accepting proposal:", error);
    throw new Error("Failed to accept proposal");
  }
}

export async function rejectProposal(proposalId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        job: true,
      },
    });

    if (!proposal) {
      throw new Error("Proposal not found");
    }

    if (proposal.job.clientId !== session.user.id) {
      throw new Error("Unauthorized");
    }

    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: "REJECTED",
      },
    });

    revalidatePath("/client/proposals");

    return { success: true, proposal: updatedProposal };
  } catch (error) {
    console.error("Error rejecting proposal:", error);
    throw new Error("Failed to reject proposal");
  }
}
