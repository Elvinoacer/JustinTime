import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  applyProposalDecision,
  PROPOSAL_DECISION_ERRORS,
  type ProposalDecisionStatus,
} from "@/lib/proposals/decisionFlow";
import { z } from "zod";

const updateProposalStatusSchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).optional(),
  reason: z.string().trim().max(1000).optional(),
});

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

    const rawBody = await request.text();
    const parsedBody = rawBody
      ? updateProposalStatusSchema.parse(JSON.parse(rawBody))
      : undefined;
    const targetStatus: ProposalDecisionStatus =
      parsedBody?.status ?? "ACCEPTED";

    const result = await applyProposalDecision({
      proposalId,
      expectedJobId: jobId,
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorRole: "CLIENT",
      targetStatus,
      reason: parsedBody?.reason,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    if (error instanceof Error) {
      if (
        error.message ===
        PROPOSAL_DECISION_ERRORS.MAX_ACCEPTED_PROVIDERS_REACHED
      ) {
        return new NextResponse(
          "This job has reached its accepted providers limit",
          { status: 409 },
        );
      }
      if (error.message === PROPOSAL_DECISION_ERRORS.ALREADY_ACCEPTED) {
        return new NextResponse("This proposal is already accepted", {
          status: 409,
        });
      }
      if (error.message === PROPOSAL_DECISION_ERRORS.ALREADY_REJECTED) {
        return new NextResponse("This proposal is already rejected", {
          status: 409,
        });
      }
      if (error.message === PROPOSAL_DECISION_ERRORS.NOT_PENDING) {
        return new NextResponse(
          "Only pending proposals can be updated with this status",
          {
            status: 409,
          },
        );
      }
      if (error.message === PROPOSAL_DECISION_ERRORS.JOB_NOT_OPEN) {
        return new NextResponse("Job is not open for new acceptances", {
          status: 409,
        });
      }
      if (error.message === PROPOSAL_DECISION_ERRORS.NOT_FOUND) {
        return new NextResponse("Proposal not found for this job", {
          status: 404,
        });
      }
      if (error.message === PROPOSAL_DECISION_ERRORS.UNAUTHORIZED) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    console.error("[PROPOSAL_ACCEPT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
