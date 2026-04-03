"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  applyProposalDecision,
  PROPOSAL_DECISION_ERRORS,
} from "@/lib/proposals/decisionFlow";
import { isPubliclyVerified } from "@/lib/trust/publicTrust";

type ClientProposalsWhere = {
  job: { clientId: string };
  jobId?: string;
};

type ClientHiringProfile = {
  hasEnoughHistory: boolean;
  avgAcceptedPrice: number | null;
  avgAcceptedEtaDays: number | null;
  verifiedPreferenceRate: number;
};

export async function getClientProposals(jobId?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const where: ClientProposalsWhere = {
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
                verificationStatus: true,
                certifications: true,
                portfolio: true,
                socialLinks: true,
              },
            },
            trustScore: {
              select: {
                tier: true,
                overallScore: true,
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
            createdAt: true,
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

    const acceptedHistory = await prisma.proposal.findMany({
      where: {
        status: "ACCEPTED",
        job: {
          clientId: session.user.id,
        },
      },
      select: {
        price: true,
        estimatedDays: true,
        provider: {
          select: {
            profile: {
              select: {
                verificationStatus: true,
              },
            },
            trustScore: {
              select: {
                tier: true,
                overallScore: true,
              },
            },
          },
        },
      },
      take: 80,
      orderBy: {
        createdAt: "desc",
      },
    });

    const clientHiringProfile: ClientHiringProfile = {
      hasEnoughHistory: acceptedHistory.length >= 3,
      avgAcceptedPrice:
        acceptedHistory.length > 0
          ? acceptedHistory.reduce(
              (sum, acceptedProposal) => sum + Number(acceptedProposal.price),
              0,
            ) / acceptedHistory.length
          : null,
      avgAcceptedEtaDays: null,
      verifiedPreferenceRate: 0,
    };

    const acceptedEtaValues = acceptedHistory
      .map((acceptedProposal) => acceptedProposal.estimatedDays)
      .filter((eta): eta is number => typeof eta === "number" && eta > 0);

    if (acceptedEtaValues.length > 0) {
      clientHiringProfile.avgAcceptedEtaDays =
        acceptedEtaValues.reduce((sum, eta) => sum + eta, 0) /
        acceptedEtaValues.length;
    }

    if (acceptedHistory.length > 0) {
      const verifiedAcceptedCount = acceptedHistory.filter(
        (acceptedProposal) =>
          isPubliclyVerified({
            verificationStatus:
              acceptedProposal.provider.profile?.verificationStatus,
            trustTier: acceptedProposal.provider.trustScore?.tier,
            overallScore: acceptedProposal.provider.trustScore?.overallScore,
          }),
      ).length;

      clientHiringProfile.verifiedPreferenceRate =
        verifiedAcceptedCount / acceptedHistory.length;
    }

    const providerIds = Array.from(new Set(proposals.map((p) => p.providerId)));
    const providerBookings =
      providerIds.length > 0
        ? await prisma.booking.findMany({
            where: {
              providerId: { in: providerIds },
              status: { in: ["COMPLETED", "CANCELLED"] },
            },
            select: {
              providerId: true,
              clientId: true,
              status: true,
            },
          })
        : [];

    const providerProposalStatuses =
      providerIds.length > 0
        ? await prisma.proposal.findMany({
            where: {
              providerId: { in: providerIds },
            },
            select: {
              providerId: true,
              status: true,
            },
          })
        : [];

    const bookingStatsByProvider = providerBookings.reduce<
      Record<string, { completed: number; cancelled: number }>
    >((acc, booking) => {
      if (!acc[booking.providerId]) {
        acc[booking.providerId] = { completed: 0, cancelled: 0 };
      }

      if (booking.status === "COMPLETED") {
        acc[booking.providerId].completed += 1;
      }
      if (booking.status === "CANCELLED") {
        acc[booking.providerId].cancelled += 1;
      }

      return acc;
    }, {});

    const proposalStatsByProvider = providerProposalStatuses.reduce<
      Record<string, { total: number; decided: number }>
    >((acc, proposal) => {
      if (!acc[proposal.providerId]) {
        acc[proposal.providerId] = { total: 0, decided: 0 };
      }

      acc[proposal.providerId].total += 1;
      if (proposal.status === "ACCEPTED" || proposal.status === "REJECTED") {
        acc[proposal.providerId].decided += 1;
      }

      return acc;
    }, {});

    const repeatClientsByProvider = providerBookings.reduce<
      Record<string, Record<string, number>>
    >((acc, booking) => {
      if (booking.status !== "COMPLETED") {
        return acc;
      }

      if (!acc[booking.providerId]) {
        acc[booking.providerId] = {};
      }

      acc[booking.providerId][booking.clientId] =
        (acc[booking.providerId][booking.clientId] ?? 0) + 1;

      return acc;
    }, {});

    const repeatClientCountsByProvider = Object.entries(
      repeatClientsByProvider,
    ).reduce<Record<string, number>>((acc, [providerId, countsByClient]) => {
      acc[providerId] = Object.values(countsByClient).filter(
        (count) => count >= 2,
      ).length;
      return acc;
    }, {});

    // Calculate average rating for each provider
    const proposalsWithRatings = proposals.map((proposal) => {
      const reviews = proposal.provider.receivedReviews;
      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      const providerStats = bookingStatsByProvider[proposal.providerId] ?? {
        completed: 0,
        cancelled: 0,
      };
      const providerProposalStats = proposalStatsByProvider[
        proposal.providerId
      ] ?? {
        total: 0,
        decided: 0,
      };
      const resolvedCount = providerStats.completed + providerStats.cancelled;
      const completionRatePct =
        resolvedCount > 0
          ? Math.round((providerStats.completed / resolvedCount) * 100)
          : null;
      const responseRatePct =
        providerProposalStats.total > 0
          ? Math.round(
              (providerProposalStats.decided / providerProposalStats.total) *
                100,
            )
          : null;
      const repeatClientsCount =
        repeatClientCountsByProvider[proposal.providerId] ?? 0;

      const responseTimeHours = Math.max(
        0,
        Number(
          (
            (new Date(proposal.createdAt).getTime() -
              new Date(proposal.job.createdAt).getTime()) /
            (1000 * 60 * 60)
          ).toFixed(1),
        ),
      );

      const completionConfidenceBand =
        completionRatePct !== null && providerStats.completed >= 5
          ? completionRatePct >= 85
            ? "HIGH"
            : completionRatePct >= 65
              ? "MEDIUM"
              : "LOW"
          : "UNKNOWN";

      const clientFitHints: string[] = [];
      const providerIsVerified = isPubliclyVerified({
        verificationStatus: proposal.provider.profile?.verificationStatus,
        trustTier: proposal.provider.trustScore?.tier,
        overallScore: proposal.provider.trustScore?.overallScore,
      });
      if (
        clientHiringProfile.hasEnoughHistory &&
        clientHiringProfile.avgAcceptedPrice !== null
      ) {
        const priceDeltaRatio =
          Math.abs(
            Number(proposal.price) - clientHiringProfile.avgAcceptedPrice,
          ) / Math.max(1, clientHiringProfile.avgAcceptedPrice);

        if (priceDeltaRatio <= 0.2) {
          clientFitHints.push("Matches your typical hiring budget range");
        } else if (
          Number(proposal.price) >
          clientHiringProfile.avgAcceptedPrice * 1.35
        ) {
          clientFitHints.push("Priced above your usual accepted range");
        }
      }

      if (
        clientHiringProfile.hasEnoughHistory &&
        clientHiringProfile.avgAcceptedEtaDays !== null &&
        typeof proposal.estimatedDays === "number"
      ) {
        const etaDelta =
          proposal.estimatedDays - clientHiringProfile.avgAcceptedEtaDays;
        if (Math.abs(etaDelta) <= 1.5) {
          clientFitHints.push("Delivery timeline aligns with your past hires");
        } else if (etaDelta <= -2) {
          clientFitHints.push(
            "Faster delivery than your usual accepted timeline",
          );
        }
      }

      if (clientHiringProfile.hasEnoughHistory) {
        if (
          clientHiringProfile.verifiedPreferenceRate >= 0.7 &&
          providerIsVerified
        ) {
          clientFitHints.push(
            "Aligns with your history of hiring verified providers",
          );
        }
        if (
          clientHiringProfile.verifiedPreferenceRate <= 0.3 &&
          !providerIsVerified
        ) {
          clientFitHints.push("Similar to providers you most often hire");
        }
      }

      return {
        ...proposal,
        clientFitHints,
        provider: {
          ...proposal.provider,
          isVerified: providerIsVerified,
          avgRating: Number(avgRating.toFixed(1)),
          reviewCount: reviews.length,
          metrics: {
            responseTimeHours,
            responseRatePct,
            completionRatePct,
            completedJobsCount: providerStats.completed,
            successfulJobsCount: providerStats.completed,
            repeatClientsCount,
            completionConfidenceBand,
          },
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

function toClientDecisionErrorMessage(error: Error, fallback: string) {
  if (error.message === PROPOSAL_DECISION_ERRORS.NOT_FOUND) {
    return "Proposal not found";
  }

  if (error.message === PROPOSAL_DECISION_ERRORS.UNAUTHORIZED) {
    return "Unauthorized";
  }

  if (error.message === PROPOSAL_DECISION_ERRORS.JOB_NOT_OPEN) {
    return "Job is not open for new acceptances";
  }

  if (
    error.message === PROPOSAL_DECISION_ERRORS.MAX_ACCEPTED_PROVIDERS_REACHED
  ) {
    return "This job has reached its accepted providers limit";
  }

  if (error.message === PROPOSAL_DECISION_ERRORS.ALREADY_ACCEPTED) {
    return "This proposal is already accepted";
  }

  if (error.message === PROPOSAL_DECISION_ERRORS.ALREADY_REJECTED) {
    return "This proposal is already rejected";
  }

  if (error.message === PROPOSAL_DECISION_ERRORS.NOT_PENDING) {
    return "Only pending proposals can be updated";
  }

  return fallback;
}

export async function acceptProposal(proposalId: string, reason?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await applyProposalDecision({
      proposalId,
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorRole: "CLIENT",
      targetStatus: "ACCEPTED",
      reason,
    });

    revalidatePath("/client/proposals");
    revalidatePath("/client/jobs");

    return { success: true, ...result };
  } catch (error) {
    console.error("Error accepting proposal:", error);
    if (error instanceof Error) {
      throw new Error(
        toClientDecisionErrorMessage(error, "Failed to accept proposal"),
      );
    }
    throw new Error("Failed to accept proposal");
  }
}

export async function rejectProposal(proposalId: string, reason?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await applyProposalDecision({
      proposalId,
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorRole: "CLIENT",
      targetStatus: "REJECTED",
      reason,
    });

    revalidatePath("/client/proposals");
    revalidatePath("/client/jobs");

    return { success: true, ...result };
  } catch (error) {
    console.error("Error rejecting proposal:", error);
    if (error instanceof Error) {
      throw new Error(
        toClientDecisionErrorMessage(error, "Failed to reject proposal"),
      );
    }
    throw new Error("Failed to reject proposal");
  }
}

export async function markProposalInReview(
  proposalId: string,
  reason?: string,
) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await applyProposalDecision({
      proposalId,
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorRole: "CLIENT",
      targetStatus: "PENDING",
      reason,
    });

    revalidatePath("/client/proposals");
    revalidatePath("/client/jobs");

    return { success: true, ...result };
  } catch (error) {
    console.error("Error marking proposal in review:", error);
    if (error instanceof Error) {
      throw new Error(
        toClientDecisionErrorMessage(
          error,
          "Failed to mark proposal as in review",
        ),
      );
    }
    throw new Error("Failed to mark proposal as in review");
  }
}
