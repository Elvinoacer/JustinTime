import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { hasRole } from "@/lib/auth/roles";
import type { Prisma } from "@/generated/prisma/client";

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: jobId } = await params;
    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(
      toPositiveInt(searchParams.get("pageSize"), 50),
      200,
    );
    const skip = (page - 1) * pageSize;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, clientId: true },
    });

    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    const isAdmin = hasRole(session.user, "ADMIN");
    const isJobClient = job.clientId === session.user.id;

    let providerProposalIds: string[] = [];
    let providerBookingIds: string[] = [];
    let isJobProvider = false;

    if (!isAdmin && !isJobClient) {
      const [proposalParticipation, bookingParticipation] = await Promise.all([
        prisma.proposal.findMany({
          where: {
            jobId,
            providerId: session.user.id,
          },
          select: { id: true },
        }),
        prisma.booking.findMany({
          where: {
            jobId,
            providerId: session.user.id,
          },
          select: { id: true },
        }),
      ]);

      providerProposalIds = proposalParticipation.map((entry) => entry.id);
      providerBookingIds = bookingParticipation.map((entry) => entry.id);
      isJobProvider =
        providerProposalIds.length > 0 || providerBookingIds.length > 0;
    }

    if (!isAdmin && !isJobClient && !isJobProvider) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const where: Prisma.JobTimelineEventWhereInput = { jobId };

    if (!isAdmin && !isJobClient) {
      const providerScope: Prisma.JobTimelineEventWhereInput[] = [
        {
          proposalId: null,
          bookingId: null,
          paymentId: null,
        },
      ];

      if (providerProposalIds.length > 0) {
        providerScope.push({
          proposalId: {
            in: providerProposalIds,
          },
        });
      }

      if (providerBookingIds.length > 0) {
        providerScope.push({
          bookingId: {
            in: providerBookingIds,
          },
        });
      }

      where.OR = providerScope;
    }

    const [events, total] = await Promise.all([
      prisma.jobTimelineEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.jobTimelineEvent.count({ where }),
    ]);

    return NextResponse.json({
      items: events,
      page,
      pageSize,
      total,
      hasMore: skip + events.length < total,
    });
  } catch (error) {
    console.error("[JOB_TIMELINE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
