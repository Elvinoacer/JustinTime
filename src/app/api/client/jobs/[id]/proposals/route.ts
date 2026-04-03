import { auth } from "@/auth";
import { hasClientAccess } from "@/lib/auth/clientAccess";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

async function ensureClientOwnsJob(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, clientId: true },
  });

  if (!job) {
    return new NextResponse("Job not found", { status: 404 });
  }

  if (job.clientId !== userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!hasClientAccess(session.user)) {
    return NextResponse.json(
      { error: "Client profile required" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const ownershipError = await ensureClientOwnsJob(id, session.user.id);
  if (ownershipError) {
    return ownershipError;
  }

  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/jobs/${id}/proposals`, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
    cache: "no-store",
  });

  const payload = await response.text();
  return new NextResponse(payload, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") || "application/json",
    },
  });
}
