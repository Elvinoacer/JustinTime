import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; proposalId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: jobId, proposalId } = await params;

    // Verify the job belongs to this client
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        clientId: true,
        deadline: true,
        location: true,
        status: true,
        maxAcceptedProviders: true,
      },
    });

    if (!job || job.clientId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (job.status !== "OPEN") {
      return new NextResponse("Job is not open for new acceptances", {
        status: 409,
      });
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        jobId: true,
        providerId: true,
        price: true,
        status: true,
      },
    });

    if (!proposal || proposal.jobId !== jobId) {
      return new NextResponse("Proposal not found for this job", {
        status: 404,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const latestProposal = await tx.proposal.findUnique({
        where: { id: proposalId },
        select: {
          id: true,
          jobId: true,
          providerId: true,
          price: true,
          status: true,
        },
      });

      if (!latestProposal || latestProposal.jobId !== jobId) {
        throw new Error("PROPOSAL_NOT_FOUND");
      }

      if (latestProposal.status === "ACCEPTED") {
        throw new Error("PROPOSAL_ALREADY_ACCEPTED");
      }

      if (latestProposal.status !== "PENDING") {
        throw new Error("PROPOSAL_NOT_PENDING");
      }

      const acceptedProvidersLimit =
        typeof job.maxAcceptedProviders === "number" &&
        job.maxAcceptedProviders > 0
          ? job.maxAcceptedProviders
          : 1;

      const acceptedProvidersCount = await tx.proposal.count({
        where: {
          jobId,
          status: "ACCEPTED",
        },
      });

      if (acceptedProvidersCount >= acceptedProvidersLimit) {
        throw new Error("MAX_ACCEPTED_PROVIDERS_REACHED");
      }

      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: { status: "ACCEPTED" },
      });

      const updatedAcceptedProvidersCount = acceptedProvidersCount + 1;
      const hasReachedAcceptedProvidersLimit =
        updatedAcceptedProvidersCount >= acceptedProvidersLimit;

      if (hasReachedAcceptedProvidersLimit) {
        // Close hiring once the target hires are accepted.
        await tx.proposal.updateMany({
          where: {
            jobId,
            id: { not: proposalId },
            status: "PENDING",
          },
          data: { status: "REJECTED" },
        });

        await tx.job.update({
          where: { id: jobId },
          data: { status: "IN_PROGRESS" },
        });
      }

      // Ensure accepted jobs have a booking so completion/cancellation/dispute flows can run.
      const existingBooking = await tx.booking.findFirst({
        where: {
          jobId,
          providerId: latestProposal.providerId,
        },
        select: { id: true },
      });

      if (!existingBooking) {
        const newBooking = await tx.booking.create({
          data: {
            clientId: job.clientId,
            providerId: latestProposal.providerId,
            jobId,
            status: "CONFIRMED",
            date:
              job.deadline ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
            totalAmount: latestProposal.price,
            location: job.location,
          },
        });

        // Escrow-lite: create pending payment hold tied to booking.
        await tx.payment.create({
          data: {
            bookingId: newBooking.id,
            amount: latestProposal.price,
            method: "WALLET",
            status: "PENDING",
            transactionId: `escrow_hold_${newBooking.id}`,
          },
        });
      }

      return {
        ...updatedProposal,
        acceptedProvidersCount: updatedAcceptedProvidersCount,
        acceptedProvidersLimit,
        hasReachedAcceptedProvidersLimit,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "MAX_ACCEPTED_PROVIDERS_REACHED") {
        return new NextResponse(
          "This job has reached its accepted providers limit",
          { status: 409 },
        );
      }
      if (error.message === "PROPOSAL_ALREADY_ACCEPTED") {
        return new NextResponse("This proposal is already accepted", {
          status: 409,
        });
      }
      if (error.message === "PROPOSAL_NOT_PENDING") {
        return new NextResponse("Only pending proposals can be accepted", {
          status: 409,
        });
      }
      if (error.message === "PROPOSAL_NOT_FOUND") {
        return new NextResponse("Proposal not found for this job", {
          status: 404,
        });
      }
    }

    console.error("[PROPOSAL_ACCEPT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
