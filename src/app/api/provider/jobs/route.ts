import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasRole } from "@/lib/auth/roles";
import type { Prisma } from "@/generated/prisma/client";

type WinProbabilityBand = "HIGH" | "MEDIUM" | "LOW";

type ProposalStatusHistoryItem = {
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  reason: string | null;
  changedByName: string | null;
  changedByRole: string | null;
  createdAt: Date;
};

function getWinProbability(
  applicants: number,
  proposalWinRate: number,
  completionRate: number,
): {
  winProbabilityBand: WinProbabilityBand;
  winProbabilityReason: string;
} {
  if (applicants <= 2 && proposalWinRate >= 0.35) {
    return {
      winProbabilityBand: "HIGH",
      winProbabilityReason:
        "Low competition and your recent proposal win rate are favorable.",
    };
  }

  if (applicants <= 5 && (proposalWinRate >= 0.2 || completionRate >= 0.7)) {
    return {
      winProbabilityBand: "MEDIUM",
      winProbabilityReason:
        "Moderate competition with a reasonable chance based on your history.",
    };
  }

  return {
    winProbabilityBand: "LOW",
    winProbabilityReason:
      "Highly competitive job relative to your current historical win profile.",
  };
}

function buildStatusHistory(
  history: ProposalStatusHistoryItem[],
  submittedAt: Date,
) {
  if (history.length > 0) {
    return history.map((entry) => ({
      status: entry.status,
      reason: entry.reason,
      changedByName: entry.changedByName,
      changedByRole: entry.changedByRole,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  return [
    {
      status: "PENDING",
      reason: "Application submitted and awaiting client review.",
      changedByName: null,
      changedByRole: "SYSTEM",
      createdAt: submittedAt.toISOString(),
    },
  ];
}

function normalizeLocationText(value?: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasRole(session.user, "PROVIDER")) {
      return new NextResponse("Only providers can access this endpoint", {
        status: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "available";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const categoryId = searchParams.get("category");
    const skip = (page - 1) * pageSize;

    const [
      acceptedProposals,
      totalProposals,
      completedBookings,
      cancelledBookings,
    ] = await Promise.all([
      prisma.proposal.count({
        where: {
          providerId: session.user.id,
          status: "ACCEPTED",
        },
      }),
      prisma.proposal.count({
        where: { providerId: session.user.id },
      }),
      prisma.booking.count({
        where: {
          providerId: session.user.id,
          status: "COMPLETED",
        },
      }),
      prisma.booking.count({
        where: {
          providerId: session.user.id,
          status: "CANCELLED",
        },
      }),
    ]);

    const proposalWinRate =
      totalProposals > 0 ? acceptedProposals / totalProposals : 0;
    const completionRate =
      completedBookings + cancelledBookings > 0
        ? completedBookings / (completedBookings + cancelledBookings)
        : 0;

    let jobs;
    let total;

    switch (tab) {
      case "available": {
        // Jobs provider can apply to (OPEN status, no existing proposal from this provider)
        const where: Prisma.JobWhereInput = {
          status: "OPEN",
          proposals: {
            none: { providerId: session.user.id },
          },
        };
        if (categoryId) where.categoryId = categoryId;

        const [allJobs, count] = await Promise.all([
          prisma.job.findMany({
            where,
            skip,
            take: pageSize,
            include: {
              client: { select: { id: true, name: true, image: true } },
              category: { select: { id: true, name: true, slug: true } },
              _count: { select: { proposals: true } },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.job.count({ where }),
        ]);

        jobs = allJobs.map((job) => {
          const applicants = job._count?.proposals ?? 0;
          return {
            ...job,
            ...getWinProbability(applicants, proposalWinRate, completionRate),
          };
        });
        total = count;

        break;
      }

      case "recommended": {
        const provider = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            profile: {
              select: {
                location: true,
                latitude: true,
                longitude: true,
              },
            },
            services: { select: { categoryId: true } },
          },
        });

        const providerCategoryIds = Array.from(
          new Set(
            (provider?.services ?? []).map((service) => service.categoryId),
          ),
        );

        const where: Prisma.JobWhereInput = {
          status: "OPEN",
          proposals: {
            none: { providerId: session.user.id },
          },
          ...(providerCategoryIds.length > 0
            ? { categoryId: { in: providerCategoryIds } }
            : {}),
        };

        if (categoryId) where.categoryId = categoryId;

        const [candidateJobs, count] = await Promise.all([
          prisma.job.findMany({
            where,
            include: {
              client: { select: { id: true, name: true, image: true } },
              category: { select: { id: true, name: true, slug: true } },
              _count: { select: { proposals: true } },
            },
            orderBy: { createdAt: "desc" },
            take: pageSize * 4,
          }),
          prisma.job.count({ where }),
        ]);

        const providerLocation = normalizeLocationText(
          provider?.profile?.location,
        );
        const providerLatitude = provider?.profile?.latitude;
        const providerLongitude = provider?.profile?.longitude;
        const now = Date.now();

        const scored = candidateJobs
          .map((job) => {
            let score = 0;
            const reasons: string[] = [];

            if (providerCategoryIds.includes(job.categoryId)) {
              score += 3;
              reasons.push("category-match");
            }

            const jobLocation = normalizeLocationText(job.location);
            if (
              providerLatitude != null &&
              providerLongitude != null &&
              job.latitude != null &&
              job.longitude != null
            ) {
              const distanceKm = calculateDistanceKm(
                providerLatitude,
                providerLongitude,
                job.latitude,
                job.longitude,
              );

              if (distanceKm <= 10) {
                score += 2;
                reasons.push("nearby");
              } else if (distanceKm <= 25) {
                score += 1;
                reasons.push("nearby");
              }
            } else if (
              providerLocation &&
              jobLocation &&
              (providerLocation.includes(jobLocation) ||
                jobLocation.includes(providerLocation))
            ) {
              score += 1;
              reasons.push("location-match");
            }

            const applicants = job._count?.proposals ?? 0;
            if (applicants <= 2) {
              score += 2;
              reasons.push("low-competition");
            }

            if (job.budget && Number(job.budget) >= 5000) {
              score += 1;
              reasons.push("good-budget");
            }

            if (job.deadline) {
              const hoursToDeadline =
                (new Date(job.deadline).getTime() - now) / (1000 * 60 * 60);
              if (hoursToDeadline > 0 && hoursToDeadline <= 48) {
                score += 1;
                reasons.push("urgent");
              }

              if (hoursToDeadline > 48 && hoursToDeadline <= 168) {
                score += 1;
                reasons.push("this-week");
              }
            }

            if (proposalWinRate >= 0.35) {
              score += 1;
              reasons.push("high-win-rate");
            }

            if (completionRate >= 0.7 && completedBookings >= 5) {
              score += 1;
              reasons.push("reliable-history");
            }

            return {
              ...job,
              ...getWinProbability(applicants, proposalWinRate, completionRate),
              recommendation: {
                score,
                reasons,
              },
            };
          })
          .sort((a, b) => {
            const scoreDiff =
              (b.recommendation?.score ?? 0) - (a.recommendation?.score ?? 0);
            if (scoreDiff !== 0) return scoreDiff;
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });

        jobs = scored.slice(skip, skip + pageSize);
        total = count;

        break;
      }

      case "applied": {
        // Jobs where provider has submitted a proposal
        const [proposals, count] = await Promise.all([
          prisma.proposal.findMany({
            where: { providerId: session.user.id },
            skip,
            take: pageSize,
            include: {
              job: {
                include: {
                  client: { select: { id: true, name: true, image: true } },
                  category: { select: { id: true, name: true, slug: true } },
                  _count: { select: { proposals: true } },
                },
              },
              statusHistory: {
                orderBy: { createdAt: "desc" },
                take: 8,
                select: {
                  status: true,
                  reason: true,
                  changedByName: true,
                  changedByRole: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.proposal.count({ where: { providerId: session.user.id } }),
        ]);

        jobs = proposals.map((p) => ({
          ...p.job,
          proposal: {
            id: p.id,
            status: p.status,
            price: p.price,
            createdAt: p.createdAt,
            latestStatusReason:
              p.statusHistory[0]?.reason ||
              "Application submitted and awaiting client review.",
            statusHistory: buildStatusHistory(
              p.statusHistory as ProposalStatusHistoryItem[],
              p.createdAt,
            ),
          },
        }));
        total = count;

        break;
      }

      case "active": {
        // Jobs with accepted proposals (active work)
        const [proposals, count] = await Promise.all([
          prisma.proposal.findMany({
            where: {
              providerId: session.user.id,
              status: "ACCEPTED",
            },
            skip,
            take: pageSize,
            include: {
              job: {
                include: {
                  client: { select: { id: true, name: true, image: true } },
                  category: { select: { id: true, name: true, slug: true } },
                  bookings: {
                    where: { providerId: session.user.id },
                    select: { id: true, status: true, date: true },
                  },
                },
              },
              statusHistory: {
                orderBy: { createdAt: "desc" },
                take: 8,
                select: {
                  status: true,
                  reason: true,
                  changedByName: true,
                  changedByRole: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.proposal.count({
            where: {
              providerId: session.user.id,
              status: "ACCEPTED",
            },
          }),
        ]);

        jobs = proposals.map((p) => ({
          ...p.job,
          proposal: {
            id: p.id,
            status: p.status,
            price: p.price,
            createdAt: p.createdAt,
            latestStatusReason:
              p.statusHistory[0]?.reason ||
              "Application accepted and work is active.",
            statusHistory: buildStatusHistory(
              p.statusHistory as ProposalStatusHistoryItem[],
              p.createdAt,
            ),
          },
          bookings: p.job.bookings,
        }));
        total = count;

        break;
      }

      case "completed": {
        // Completed jobs (COMPLETED status with accepted proposals)
        const [proposals, count] = await Promise.all([
          prisma.proposal.findMany({
            where: {
              providerId: session.user.id,
              status: "ACCEPTED",
              job: {
                is: {
                  status: "COMPLETED",
                },
              },
            },
            skip,
            take: pageSize,
            include: {
              job: {
                include: {
                  client: { select: { id: true, name: true, image: true } },
                  category: { select: { id: true, name: true, slug: true } },
                },
              },
              statusHistory: {
                orderBy: { createdAt: "desc" },
                take: 8,
                select: {
                  status: true,
                  reason: true,
                  changedByName: true,
                  changedByRole: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { updatedAt: "desc" },
          }),
          prisma.proposal.count({
            where: {
              providerId: session.user.id,
              status: "ACCEPTED",
              job: {
                is: {
                  status: "COMPLETED",
                },
              },
            },
          }),
        ]);

        jobs = proposals.map((p) => ({
          ...p.job,
          proposal: {
            id: p.id,
            status: p.status,
            price: p.price,
            createdAt: p.createdAt,
            latestStatusReason:
              p.statusHistory[0]?.reason ||
              "Application accepted and job marked as completed.",
            statusHistory: buildStatusHistory(
              p.statusHistory as ProposalStatusHistoryItem[],
              p.createdAt,
            ),
          },
        }));
        total = count;

        break;
      }

      default:
        return new NextResponse("Invalid tab parameter", { status: 400 });
    }

    return NextResponse.json({
      items: jobs,
      total,
      page,
      pageSize,
      hasMore: skip + jobs.length < total,
    });
  } catch (error) {
    console.error("[PROVIDER_JOBS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
