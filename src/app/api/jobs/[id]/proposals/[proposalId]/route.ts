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
      select: { id: true, clientId: true, deadline: true, location: true },
    });

    if (!job || job.clientId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
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
      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: { status: "ACCEPTED" },
      });

      // Reject all other proposals for this job
      await tx.proposal.updateMany({
        where: {
          jobId,
          id: { not: proposalId },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      });

      // Update job status to IN_PROGRESS
      await tx.job.update({
        where: { id: jobId },
        data: { status: "IN_PROGRESS" },
      });

      // Ensure accepted jobs have a booking so completion/cancellation/dispute flows can run.
      const existingBooking = await tx.booking.findFirst({
        where: {
          jobId,
          providerId: proposal.providerId,
        },
        select: { id: true },
      });

      if (!existingBooking) {
        const newBooking = await tx.booking.create({
          data: {
            clientId: job.clientId,
            providerId: proposal.providerId,
            jobId,
            status: "CONFIRMED",
            date:
              job.deadline ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
            totalAmount: proposal.price,
            location: job.location,
          },
        });

        // Escrow-lite: create pending payment hold tied to booking.
        await tx.payment.create({
          data: {
            bookingId: newBooking.id,
            amount: proposal.price,
            method: "WALLET",
            status: "PENDING",
            transactionId: `escrow_hold_${newBooking.id}`,
          },
        });
      }

      return updatedProposal;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PROPOSAL_ACCEPT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
