import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            client: { select: { id: true, name: true, image: true, email: true } },
            category: true,
          },
        },
        provider: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!proposal) {
      return new NextResponse("Proposal not found", { status: 404 });
    }

    // Check authorization
    if (proposal.providerId !== session.user.id && proposal.job.clientId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("[PROPOSAL_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      select: { providerId: true, status: true },
    });

    if (!proposal) {
      return new NextResponse("Proposal not found", { status: 404 });
    }

    // Only provider who created the proposal can withdraw it
    if (proposal.providerId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Can only withdraw pending proposals
    if (proposal.status !== "PENDING") {
      return new NextResponse("Can only withdraw pending proposals", { status: 400 });
    }

    await prisma.proposal.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PROPOSAL_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const { coverLetter, price } = body;

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      select: { providerId: true, status: true },
    });

    if (!proposal) {
      return new NextResponse("Proposal not found", { status: 404 });
    }

    if (proposal.providerId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (proposal.status !== "PENDING") {
      return new NextResponse("Can only update pending proposals", { status: 400 });
    }

    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: {
        ...(coverLetter && { coverLetter }),
        ...(price && { price }),
      },
      include: {
        job: {
          include: {
            client: { select: { id: true, name: true } },
            category: true,
          },
        },
      },
    });

    return NextResponse.json(updatedProposal);
  } catch (error) {
    console.error("[PROPOSAL_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
