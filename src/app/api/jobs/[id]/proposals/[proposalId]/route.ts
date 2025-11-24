import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
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
      select: { clientId: true },
    });

    if (!job || job.clientId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Accept the proposal
    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "ACCEPTED" },
    });

    // Reject all other proposals for this job
    await prisma.proposal.updateMany({
      where: {
        jobId,
        id: { not: proposalId },
        status: "PENDING",
      },
      data: { status: "REJECTED" },
    });

    // Update job status to IN_PROGRESS
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "IN_PROGRESS" },
    });

    return NextResponse.json(updatedProposal);
  } catch (error) {
    console.error("[PROPOSAL_ACCEPT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
