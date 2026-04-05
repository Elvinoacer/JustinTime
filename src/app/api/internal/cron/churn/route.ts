import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { analyzeUsersForChurn } from "@/lib/churn/churn-predictor";
import { autoTriggerReEngagement } from "@/lib/churn/re-engagement";

function hasSecretAccess(request: Request) {
  const expectedSecret = process.env.CHURN_CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  if (headerSecret && headerSecret === expectedSecret) {
    return true;
  }

  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === expectedSecret;
  }

  return false;
}

async function runChurnCronJob(request: Request) {
  const secretAuthorized = hasSecretAccess(request);

  if (!secretAuthorized) {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  try {
    const analysis = await analyzeUsersForChurn({
      scope: "ALL_USERS",
      batchSize: 25,
    });

    const engagements = await autoTriggerReEngagement({
      cooldownDays: 14,
      maxUsers: 300,
    });

    return NextResponse.json({
      success: true,
      analysis,
      engagements,
    });
  } catch (error) {
    console.error("[CHURN_CRON]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Churn cron failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return runChurnCronJob(request);
}

export async function POST(request: Request) {
  return runChurnCronJob(request);
}
