import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { submitProposal } from "@/lib/proposals/submitProposal";
import { toSubmitProposalErrorResponse } from "@/lib/proposals/errorResponses";
import { z } from "zod";
import { hasRole } from "@/lib/auth/roles";

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
      select: { id: true, clientId: true, createdAt: true },
    });
    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    const isAdmin = hasRole(session.user, "ADMIN");
    const isJobOwner = job.clientId === session.user.id;
    const isProvider = hasRole(session.user, "PROVIDER");

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

    const acceptedHistory = isJobOwner
      ? await prisma.proposal.findMany({
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
                    isVerified: true,
                    verificationStatus: true,
                  },
                },
              },
            },
          },
          take: 80,
          orderBy: {
            createdAt: "desc",
          },
        })
      : [];

    const hasEnoughClientHistory = acceptedHistory.length >= 3;
    const avgAcceptedPrice =
      acceptedHistory.length > 0
        ? acceptedHistory.reduce(
            (sum, acceptedProposal) => sum + Number(acceptedProposal.price),
            0,
          ) / acceptedHistory.length
        : null;
    const acceptedEtaValues = acceptedHistory
      .map((acceptedProposal) => acceptedProposal.estimatedDays)
      .filter((eta): eta is number => typeof eta === "number" && eta > 0);
    const avgAcceptedEtaDays =
      acceptedEtaValues.length > 0
        ? acceptedEtaValues.reduce((sum, eta) => sum + eta, 0) /
          acceptedEtaValues.length
        : null;
    const verifiedPreferenceRate =
      acceptedHistory.length > 0
        ? acceptedHistory.filter(
            (acceptedProposal) =>
              Boolean(acceptedProposal.provider.profile?.isVerified) ||
              acceptedProposal.provider.profile?.verificationStatus ===
                "VERIFIED",
          ).length / acceptedHistory.length
        : 0;

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

    const providerIds = Array.from(new Set(proposals.map((p) => p.providerId)));

    const providerSkillIds = Array.from(
      new Set(
        proposals.flatMap(
          (proposal) => proposal.provider.profile?.skills ?? [],
        ),
      ),
    );

    const skillCategoryMap =
      providerSkillIds.length > 0
        ? new Map(
            (
              await prisma.category.findMany({
                where: { id: { in: providerSkillIds } },
                select: { id: true, name: true },
              })
            ).map((category) => [category.id, category.name]),
          )
        : new Map<string, string>();
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
              new Date(job.createdAt).getTime()) /
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
      const providerIsVerified =
        Boolean(proposal.provider.profile?.isVerified) ||
        proposal.provider.profile?.verificationStatus === "VERIFIED";

      if (hasEnoughClientHistory && avgAcceptedPrice !== null) {
        const priceDeltaRatio =
          Math.abs(Number(proposal.price) - avgAcceptedPrice) /
          Math.max(1, avgAcceptedPrice);
        if (priceDeltaRatio <= 0.2) {
          clientFitHints.push("Matches your typical hiring budget range");
        } else if (Number(proposal.price) > avgAcceptedPrice * 1.35) {
          clientFitHints.push("Priced above your usual accepted range");
        }
      }

      if (
        hasEnoughClientHistory &&
        avgAcceptedEtaDays !== null &&
        typeof proposal.estimatedDays === "number"
      ) {
        const etaDelta = proposal.estimatedDays - avgAcceptedEtaDays;
        if (Math.abs(etaDelta) <= 1.5) {
          clientFitHints.push("Delivery timeline aligns with your past hires");
        } else if (etaDelta <= -2) {
          clientFitHints.push(
            "Faster delivery than your usual accepted timeline",
          );
        }
      }

      if (hasEnoughClientHistory) {
        if (verifiedPreferenceRate >= 0.7 && providerIsVerified) {
          clientFitHints.push(
            "Aligns with your history of hiring verified providers",
          );
        }
        if (verifiedPreferenceRate <= 0.3 && !providerIsVerified) {
          clientFitHints.push("Similar to providers you most often hire");
        }
      }

      const providerProfile = proposal.provider.profile;

      return {
        ...proposal,
        clientFitHints,
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
          skills: (providerProfile?.skills ?? []).map(
            (skillId) => skillCategoryMap.get(skillId) || skillId,
          ),
          certifications: providerProfile?.certifications ?? [],
          metrics: {
            responseTimeHours,
            responseRatePct,
            completionRatePct,
            completedJobsCount: providerStats.completed,
            successfulJobsCount: providerStats.completed,
            repeatClientsCount,
            completionConfidenceBand,
          },
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

    if (!hasRole(session.user, "PROVIDER")) {
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

    const proposalErrorResponse = toSubmitProposalErrorResponse(error);
    if (proposalErrorResponse) {
      return proposalErrorResponse;
    }

    console.error("[PROPOSALS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
