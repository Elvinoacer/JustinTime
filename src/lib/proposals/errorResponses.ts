import { NextResponse } from "next/server";

export function toSubmitProposalErrorResponse(
  error: unknown,
): NextResponse | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message === "JOB_NOT_FOUND") {
    return new NextResponse("Job not found", { status: 404 });
  }
  if (error.message === "JOB_NOT_OPEN") {
    return new NextResponse("This job is no longer accepting proposals", {
      status: 409,
    });
  }
  if (error.message === "CANNOT_APPLY_TO_OWN_JOB") {
    return new NextResponse("You cannot apply to your own job", {
      status: 409,
    });
  }
  if (error.message === "MAX_APPLICANTS_REACHED") {
    return new NextResponse("This job has reached its applicant limit", {
      status: 409,
    });
  }
  if (error.message === "PROPOSAL_ALREADY_EXISTS") {
    return new NextResponse(
      "You have already submitted a proposal for this job",
      {
        status: 409,
      },
    );
  }
  if (error.message === "INSUFFICIENT_CREDITS") {
    return NextResponse.json(
      {
        error: "Weekly limit reached & Insufficient Credits",
        message:
          "You reached your weekly proposal limit. Purchase Lead Credits to continue.",
      },
      { status: 429 },
    );
  }

  return null;
}
