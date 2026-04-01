import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { runJobSlaMonitor } from "@/lib/jobs/slaMonitor";

function hasSecretAccess(request: Request) {
  const expectedSecret = process.env.JOB_SLA_MONITOR_SECRET;
  if (!expectedSecret) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-job-sla-secret");

  if (headerSecret && headerSecret === expectedSecret) {
    return true;
  }

  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === expectedSecret;
  }

  return false;
}

async function executeMonitor(request: Request) {
  const secretAuthorized = hasSecretAccess(request);

  let actorUserId: string | undefined;
  let actorName: string | undefined;
  let actorRole: string | undefined;

  if (!secretAuthorized) {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    actorUserId = session.user.id;
    actorName = session.user.name || "Admin";
    actorRole = "ADMIN";
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "true";

  const result = await runJobSlaMonitor({
    dryRun,
    actorUserId,
    actorName,
    actorRole,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    return await executeMonitor(request);
  } catch (error) {
    console.error("[SLA_MONITOR_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    return await executeMonitor(request);
  } catch (error) {
    console.error("[SLA_MONITOR_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
